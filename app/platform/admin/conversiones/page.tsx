import { createClient } from "@/lib/supabase/server";
import { getPreciosConfig } from "@/lib/precios";
import { ConversionesList, type FilaConversion } from "./conversiones-list";

export const metadata = { title: "Conversiones offline · Admin" };

/**
 * Conversiones offline para Google Ads.
 *
 * Una privada nace en la web pero se cierra por WhatsApp: Google solo ve la
 * consulta, no la venta. Acá se juntan las solicitudes que trajeron un clic
 * de anuncio (gclid) y ya se aprobaron, para exportarlas y que Ads aprenda
 * de las que realmente se contrataron.
 */
export default async function ConversionesPage() {
  const supabase = await createClient();

  // La columna gclid llega con la migración fase-18. Si todavía no corrió, el
  // query falla entero: lo detectamos para mostrar el aviso en vez de un error.
  const res = await supabase
    .from("solicitudes_privada")
    .select(
      "id, user_id, fecha_propuesta, hora_inicio, cupo_estimado, estado, created_at, resolved_at, gclid, gclid_at, valor_cerrado, conversion_exportada_at",
    )
    .eq("estado", "aprobada")
    .order("resolved_at", { ascending: false })
    .limit(200);

  const migracionPendiente = !!res.error;
  const solicitudes = res.data ?? [];

  const userIds = [...new Set(solicitudes.map((s) => s.user_id))];
  const nombrePorId = new Map<string, string>();
  if (userIds.length) {
    const { data: perfiles } = await supabase
      .from("profiles_publicos")
      .select("id, nombre, apellido, alias")
      .in("id", userIds);
    for (const p of (perfiles ?? []) as {
      id: string;
      nombre: string | null;
      apellido: string | null;
      alias: string | null;
    }[]) {
      nombrePorId.set(
        p.id,
        `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || p.alias?.trim() || "—",
      );
    }
  }

  // Estimado por defecto: cupo × entrada de lista. El admin puede corregirlo
  // con el monto real antes de exportar.
  const precios = await getPreciosConfig(supabase);
  const entrada = precios.entrada_byop.transferencia;

  const filas: FilaConversion[] = solicitudes
    .filter((s) => !!s.gclid)
    .map((s) => ({
      id: s.id,
      solicitante: nombrePorId.get(s.user_id) ?? "—",
      fechaPartida: s.fecha_propuesta,
      horaPartida: s.hora_inicio,
      cupo: s.cupo_estimado,
      gclid: s.gclid as string,
      // Momento de la conversión = cuándo se confirmó la reserva.
      conversionAt: s.resolved_at ?? s.created_at,
      valorEstimado: s.cupo_estimado * entrada,
      valorCerrado: s.valor_cerrado ?? null,
      exportadaAt: s.conversion_exportada_at ?? null,
    }));

  // Aprobadas sin gclid: no se pueden subir (esa persona no vino de un
  // anuncio, o solicitó antes de que existiera la captura). Se cuentan para
  // que el número no parezca un error.
  const sinGclid = solicitudes.length - filas.length;

  return (
    <div>
      <p className="sect-label mb-2">Admin · Google Ads</p>
      <h1 className="sect-title fluid-3xl mb-2">Conversiones offline</h1>
      <p className="font-sans fluid-sm text-ash max-w-[70ch] mb-6">
        Las privadas se piden en la web pero se cierran por WhatsApp: Google
        solo ve la consulta y termina optimizando hacia gente que pregunta.
        Subiendo acá las que se contrataron de verdad, Ads aprende a buscar
        clientes que reservan.
      </p>

      {migracionPendiente ? (
        <div className="border border-orange-300/40 bg-orange-300/5 clip-notch p-4">
          <p className="sect-label mb-1 text-orange-300">// Migración pendiente</p>
          <p className="font-sans fluid-sm text-ash">
            Falta correr <span className="text-orange">db/schema-phase-18.sql</span>{" "}
            en el SQL Editor de Supabase. Hasta entonces no se guarda el
            identificador del clic y esta pantalla queda vacía.
          </p>
        </div>
      ) : (
        <ConversionesList filas={filas} sinGclid={sinGclid} />
      )}
    </div>
  );
}
