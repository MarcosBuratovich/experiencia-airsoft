"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Nombre del input hidden que va al form (recibe la URL final). */
  name?: string;
  initialUrl?: string | null;
  /** Hint del path en el bucket. Por ej. el slug futuro del clan. */
  pathHint?: string;
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

export function LogoUploader({ name = "logo_url", initialUrl, pathHint }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [url, setUrl] = useState<string>(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setError("Imagen muy grande (máx 4 MB).");
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
        setError("Sesión perdida — recargá la página");
        return;
      }
      const slug = pathHint ?? "pending";
      const filename = `${user.id}-${Date.now()}.jpg`;
      const path = `${slug}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from("clan-logos")
        .upload(path, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage
        .from("clan-logos")
        .getPublicUrl(path);
      setUrl(pub.publicUrl);
      setImageSrc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error subiendo el logo");
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
        <div className="flex items-center gap-4">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Logo del clan"
              className="w-20 h-20 rounded-full object-cover border border-rail/60"
            />
          ) : (
            <div className="w-20 h-20 rounded-full border border-dashed border-rail/60 flex items-center justify-center text-smoke font-mono fluid-xs uppercase tracking-[.2em]">
              Sin
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost px-4 py-2 clip-tag uppercase tracking-wider fluid-xs font-semibold cursor-pointer"
          >
            {url ? "Cambiar logo" : "Subir logo"}
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
          <div className="relative w-full h-64 bg-ink rounded-md overflow-hidden">
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

      {error && (
        <p className="font-mono fluid-xs text-orange-300">{error}</p>
      )}
    </div>
  );
}
