"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, type FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

type Props = {
  /** Nombre del input hidden que va al form (recibe la URL final). */
  name?: string;
  initialUrl?: string | null;
  /** Hint del path en el bucket. Por ej. el slug futuro del clan. */
  pathHint?: string;
  /** Callback opcional cuando cambia el URL (para que el form padre
   * sepa si ya hay logo cargado, ej. para checklist de requisitos). */
  onUrlChange?: (url: string) => void;
};

const OUTPUT_SIZE = 512;

/** Carga un Image desde una object URL y resuelve cuando termina. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = (e) => rej(e);
    img.src = src;
  });
}

/** Recorta `imageSrc` al area pixel `area` y devuelve un JPEG Blob cuadrado. */
async function cropToJpeg(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );
  return new Promise<Blob>((res, rej) => {
    canvas.toBlob(
      (blob) => (blob ? res(blob) : rej(new Error("toBlob falló"))),
      "image/jpeg",
      0.9,
    );
  });
}

export function LogoUploader({
  name = "logo_url",
  initialUrl,
  pathHint,
  onUrlChange,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [url, setUrlRaw] = useState<string>(initialUrl ?? "");
  // Wrap setter para notificar al parent (checklist de requisitos).
  const setUrl = useCallback(
    (next: string) => {
      setUrlRaw(next);
      onUrlChange?.(next);
    },
    [onUrlChange],
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setError({
        titulo: "La imagen es muy grande",
        detalle: "Máximo 4 MB. Recortala o comprimila y volvé a intentar.",
        mostrarSoporte: false,
      });
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(typeof reader.result === "string" ? reader.result : null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(f);
  }, []);

  const onCropComplete = useCallback(
    (_: Area, areaPixels: Area) => setCroppedArea(areaPixels),
    [],
  );

  const confirmar = async () => {
    if (!imageSrc || !croppedArea) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await cropToJpeg(imageSrc, croppedArea);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError({
          titulo: "Tu sesión expiró",
          detalle: "Recargá la página e iniciá sesión de nuevo.",
          mostrarSoporte: false,
        });
        return;
      }
      const slug = pathHint ?? "pending";
      const filename = `${user.id}-${Date.now()}.jpg`;
      const path = `${slug}/${filename}`;

      // Cleanup: si el user ya tiene uploads previos en pending/ (form
      // anterior abandonado), los borramos antes de subir el nuevo. Solo
      // borramos los del mismo user_id, así no tocamos uploads ajenos.
      if (slug === "pending") {
        const { data: existing } = await supabase.storage
          .from("clan-logos")
          .list("pending", { limit: 100 });
        const mios = (existing ?? [])
          .filter((f) => f.name.startsWith(`${user.id}-`))
          .map((f) => `pending/${f.name}`);
        if (mios.length) {
          await supabase.storage.from("clan-logos").remove(mios);
        }
      }

      const { error: upErr } = await supabase.storage
        .from("clan-logos")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        console.error("[LogoUploader] upload falló:", upErr);
        setError(friendlyError(upErr));
        return;
      }
      const { data: pub } = supabase.storage
        .from("clan-logos")
        .getPublicUrl(path);
      setUrl(pub.publicUrl);
      setImageSrc(null);
    } catch (e) {
      console.error("[LogoUploader] crop/upload threw:", e);
      setError(friendlyError(e));
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cambiar = () => {
    setUrl("");
    reset();
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Hidden field para el form */}
      <input type="hidden" name={name} value={url} />

      {!imageSrc && (
        <div className="flex flex-col items-center gap-4 py-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Logo del clan"
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover border-2 border-orange/60 cursor-pointer hover:opacity-90 transition"
              onClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Subir logo"
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-rail flex flex-col items-center justify-center gap-2 text-smoke hover:border-orange hover:text-orange transition cursor-pointer group"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-10 h-10 transition-transform group-hover:scale-110"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <span className="font-mono fluid-xs uppercase tracking-[.22em]">
                Subir logo
              </span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
            >
              {url ? "Cambiar logo" : "Elegir imagen"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange-300 cursor-pointer"
              >
                Quitar
              </button>
            )}
          </div>
          <p className="font-mono fluid-xs text-smoke text-center max-w-[40ch]">
            PNG o JPG cuadrado idealmente. Vas a poder reencuadrarlo al círculo
            después de subirlo.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />

      {imageSrc && (
        <div className="space-y-3 border border-rail/60 bg-carbon clip-notch p-4">
          <div className="relative w-full h-80 sm:h-96 bg-ink rounded-md overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <label className="block">
            <span className="sect-label mb-1 block">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-orange cursor-pointer"
            />
          </label>
          <p className="font-mono fluid-xs text-smoke">
            Arrastrá la imagen para reencuadrarla. El círculo es la forma
            final.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={confirmar}
              disabled={uploading || !croppedArea}
              className="btn-wa px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? "Subiendo..." : "Confirmar y subir"}
            </button>
            <button
              type="button"
              onClick={cambiar}
              disabled={uploading}
              className="font-mono fluid-xs uppercase tracking-[.2em] text-ash hover:text-bone cursor-pointer disabled:opacity-50"
            >
              Cambiar imagen
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={uploading}
              className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke hover:text-orange-300 cursor-pointer disabled:opacity-50 ml-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ErrorBanner error={error} variant="inline" />
    </div>
  );
}
