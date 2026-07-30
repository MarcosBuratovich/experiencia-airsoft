import { createClient } from "@/lib/supabase/server";
import { ConocimientoList, type FilaConocimiento } from "./conocimiento-list";

export const metadata = { title: "Base de conocimiento · Bot" };

export default async function ConocimientoPage() {
  const supabase = await createClient();

  // Se consulta la tabla directo (no getConocimiento de lib/bot/conocimiento):
  // esa función filtra por activo porque es lo que se inyecta en el prompt,
  // pero acá el admin tiene que poder ver y reactivar lo que desactivó.
  //
  // Si la migración db/schema-phase-19.sql todavía no corrió, la tabla no
  // existe y esta consulta falla entera: se detecta con `error` para mostrar
  // un aviso en vez de romper la pantalla.
  const { data, error } = await supabase
    .from("bot_conocimiento")
    .select("id, titulo, contenido, activo, orden")
    .order("orden", { ascending: true });

  const migracionPendiente = !!error;
  const entradas = (data ?? []) as FilaConocimiento[];

  return (
    <div>
      <p className="sect-label mb-2">Admin · Bot</p>
      <h1 className="sect-title fluid-3xl mb-2">Base de conocimiento</h1>
      <p className="font-sans fluid-sm text-ash max-w-[70ch] mb-6">
        Lo que el asistente sabe del lugar y no sale de ninguna tabla: si
        duele, qué llevar, desde qué edad. Los precios y las partidas no van
        acá — esos los consulta solo, en vivo.
      </p>

      {migracionPendiente ? (
        <div className="border border-orange-300/40 bg-orange-300/5 clip-notch p-4">
          <p className="sect-label mb-1 text-orange-300">// Migración pendiente</p>
          <p className="font-sans fluid-sm text-ash">
            Falta correr <span className="text-orange">db/schema-phase-19.sql</span>{" "}
            en el SQL Editor de Supabase.
          </p>
        </div>
      ) : (
        <ConocimientoList entradas={entradas} />
      )}
    </div>
  );
}
