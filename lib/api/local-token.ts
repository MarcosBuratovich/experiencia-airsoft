import { timingSafeEqual } from "node:crypto";

/**
 * Valida el header `X-Local-Token` contra `LOCAL_INGEST_TOKEN` del env.
 * Compara byte a byte con `timingSafeEqual` para evitar timing attacks
 * (aunque el endpoint vive en LAN, es buena higiene).
 *
 * Devuelve null si el token es válido, o un Response 401 listo para
 * devolver desde el route handler.
 */
export function assertLocalToken(req: Request): Response | null {
  const expected = process.env.LOCAL_INGEST_TOKEN;
  if (!expected) {
    return Response.json(
      { error: "LOCAL_INGEST_TOKEN no configurado en el server" },
      { status: 500 },
    );
  }

  const provided = req.headers.get("x-local-token") ?? "";
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");

  // timingSafeEqual exige longitudes iguales — si difieren, falla en O(1)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "Token inválido" }, { status: 401 });
  }

  return null;
}
