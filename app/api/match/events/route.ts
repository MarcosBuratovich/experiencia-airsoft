import { z } from "zod";
import { assertLocalToken } from "@/lib/api/local-token";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { procesarEvento, TIPOS_EVENTO } from "@/lib/match-events";

export const dynamic = "force-dynamic";

const eventoSchema = z.object({
  local_event_id: z.string().min(1).max(100),
  player_number: z.string().regex(/^\d{6}$/, "player_number debe ser 6 dígitos"),
  tipo: z.enum(TIPOS_EVENTO),
  occurred_at: z.string().datetime({ offset: true }),
});

const bodySchema = z.union([
  // batch
  z.object({ events: z.array(eventoSchema).min(1).max(100) }),
  // un evento solo
  eventoSchema,
]);

export async function POST(req: Request) {
  // 1) Auth
  const tokenError = assertLocalToken(req);
  if (tokenError) return tokenError;

  // 2) Body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Body no es JSON válido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Body inválido",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const eventos =
    "events" in parsed.data ? parsed.data.events : [parsed.data];

  // 3) Procesar uno por uno
  const supabase = createServiceRoleClient();
  const detalles = [] as Awaited<ReturnType<typeof procesarEvento>>[];
  let accepted = 0;
  let orphaned = 0;
  let duplicated = 0;
  let errors = 0;

  for (const ev of eventos) {
    const res = await procesarEvento(supabase, ev);
    detalles.push(res);
    if (res.status === "aceptado") accepted++;
    else if (res.status === "huerfano") orphaned++;
    else if (res.status === "duplicado") duplicated++;
    else if (res.status === "error") errors++;
  }

  return Response.json(
    {
      ok: errors === 0,
      total: eventos.length,
      accepted,
      orphaned,
      duplicated,
      errors,
      details: detalles,
    },
    { status: 200 },
  );
}

// GET para health-check del sistema local — sin auth, no expone datos
export async function GET() {
  return Response.json({
    ok: true,
    endpoint: "POST /api/match/events",
    accepted_event_types: TIPOS_EVENTO,
    auth: "X-Local-Token header",
  });
}
