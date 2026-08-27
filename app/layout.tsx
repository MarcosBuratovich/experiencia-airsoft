import type { Metadata, Viewport } from "next";
import { Anton, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteJsonLd } from "./_components/site-jsonld";
import { MetaPixel } from "./_components/meta-pixel";
import { GoogleAnalytics } from "./_components/google-analytics";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Pesos: solo los que se usan (300/light no aparece en ningún lado).
const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://www.experienciaairsoft.com";
const TITLE = "Experiencia Airsoft — Airsoft CQB indoor en Buenos Aires";
// ~153 caracteres: bajo el límite de ~160 que Google trunca en el SERP.
const DESCRIPTION =
  "Airsoft CQB indoor en Buenos Aires: partidas abiertas, grupos privados y eventos corporativos. Equipo incluido, máximo 330 FPS, +18. Reservá por WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Experiencia Airsoft",
  },
  description: DESCRIPTION,
  // Señales adicionales de "site name" que Google considera para mostrar
  // "Experiencia Airsoft" en vez del dominio en los resultados de búsqueda.
  applicationName: "Experiencia Airsoft",
  appleWebApp: {
    title: "Experiencia Airsoft",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  keywords: [
    "airsoft",
    "airsoft Buenos Aires",
    "airsoft Argentina",
    "CQB",
    "CQB Buenos Aires",
    "airsoft indoor",
    "airsoft CABA",
    "TacSim",
    "speedsoft",
    "partidas airsoft",
    "alquiler airsoft",
    "Experiencia Airsoft",
  ],
  authors: [{ name: "Experiencia Airsoft" }],
  creator: "Experiencia Airsoft",
  publisher: "Experiencia Airsoft",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Experiencia Airsoft",
    title: TITLE,
    description: DESCRIPTION,
    // images las define el file convention app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    // images las define el file convention app/twitter-image.tsx
  },
  // Next 16 detecta automáticamente app/icon.png y app/apple-icon.png
  // y genera los <link rel="icon"> con sizes correctos.
  category: "sports",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    other: {
      // Verificación del dominio en Meta Business (Configuración del negocio
      // → Dominios). Habilita la medición agregada de eventos en iOS y el
      // control de qué cuentas pueden usar el dominio en sus anuncios.
      "facebook-domain-verification": "ysrwo2z6tpr7h0rjtwgxn3k8orlzrs",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Tema acorde a la app: usado por Chrome mobile en la barra de URL y por
  // PWA en split screen / app icon background.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${anton.variable} ${oswald.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="relative">
        <GoogleAnalytics />
        <MetaPixel />
        <SiteJsonLd />
        {children}
      </body>
    </html>
  );
}
