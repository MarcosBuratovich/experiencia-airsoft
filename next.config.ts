import type { NextConfig } from "next";

// Headers de seguridad (defense-in-depth contra XSS, clickjacking, MIME
// sniffing, etc.). React ya escapa todo, pero estos headers bloquean
// vectores adicionales en caso de que algún día se cuele un bug.
const SECURITY_HEADERS = [
  // Bloquea el sitio dentro de iframes ajenos (evita clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Bloquea que el browser interprete contenido con un MIME distinto al
  // declarado (evita ataques de polyglot files).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No mandar URL completa como Referer a sites externos (privacy).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restringe APIs sensibles (cámara, mic, geo) que no usamos.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Forzar HTTPS por 1 año (Vercel ya lo manda, pero es explícito).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // 301s permanentes de URLs heredadas del sitio anterior en Wix.
  // Google las sigue teniendo en su indice (13 como 404, 13 como crawled).
  // Con permanent: true Google reemplaza la URL vieja por la nueva y nos
  // pasa el link juice acumulado.
  async redirects() {
    return [
      // Templates Wix abandonadas (sin contenido real). Listadas explicito
      // porque path-to-regexp no acepta `:n*` con prefix sin suffix.
      { source: "/blank-1", destination: "/", permanent: true },
      { source: "/blank-2", destination: "/", permanent: true },
      { source: "/blank-3", destination: "/", permanent: true },
      { source: "/blank-6", destination: "/", permanent: true },
      // Booking events Wix — paginas de inscripcion por partida.
      // Mandamos a /precios (pagina transaccional equivalente).
      {
        source: "/detalles-y-registro/:slug",
        destination: "/precios",
        permanent: true,
      },
      // Pagina de servicio generica de Wix.
      {
        source: "/service-page/:slug",
        destination: "/precios",
        permanent: true,
      },
      // Productos placeholder del template Wix ("soy-un-producto-N").
      // El slug base sin sufijo lo cubrimos aparte porque `:slug` requiere
      // segmento presente.
      { source: "/product-page", destination: "/", permanent: true },
      {
        source: "/product-page/:slug",
        destination: "/",
        permanent: true,
      },
      // Widget de booking online de Wix — no hay equivalente; la home
      // tiene el CTA de WhatsApp que es como reservamos hoy.
      {
        source: "/book-online",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
