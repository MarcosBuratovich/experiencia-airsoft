import type { MetadataRoute } from "next";

// Mismo Next app sirve dos hosts:
//   - www.experienciaairsoft.com  → marketing (todas las rutas indexables)
//   - app.experienciaairsoft.com  → plataforma (solo /, /login, /signup
//     son públicos; el resto requiere login)
//
// Como robots.txt es per-host pero Next genera UNO solo, las reglas
// abajo son la unión: permitimos lo público en ambos hosts y
// bloqueamos los paths privados (que en marketing ni existen, así que
// la disallow es no-op ahí).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Rutas internas que NO deben aparecer (el proxy ya las 404ea
          // en marketing, pero algunas tools podrían intentarlas).
          "/platform/",
          // Áreas autenticadas en app.* (en marketing no existen).
          "/admin/",
          "/auth/",
          "/api/",
          "/partidas",
          "/perfil",
          "/mi-clan",
          "/mis-solicitudes",
          "/clanes/",
          "/privada/",
          "/eventos",
        ],
      },
    ],
    sitemap: "https://www.experienciaairsoft.com/sitemap.xml",
  };
}
