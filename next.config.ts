import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 301s permanentes de URLs heredadas del sitio anterior en Wix.
  // Google las sigue teniendo en su indice (13 como 404, 13 como crawled).
  // Con permanent: true Google reemplaza la URL vieja por la nueva y nos
  // pasa el link juice acumulado.
  async redirects() {
    return [
      // Templates Wix abandonadas (sin contenido real).
      {
        source: "/blank-:rest*",
        destination: "/",
        permanent: true,
      },
      // Booking events Wix — eran paginas de inscripcion por partida.
      // Mandamos a /precios que es la pagina transaccional equivalente.
      {
        source: "/detalles-y-registro/:slug*",
        destination: "/precios",
        permanent: true,
      },
      // Pagina de servicio generica de Wix.
      {
        source: "/service-page/:slug*",
        destination: "/precios",
        permanent: true,
      },
      // Productos placeholder del template Wix ("soy-un-producto-N").
      {
        source: "/product-page/:slug*",
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
