import type { Metadata } from "next";
import { Anton, Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://experienciaairsoft.com";
const TITLE = "Experiencia Airsoft — Airsoft CQB indoor en Buenos Aires";
const DESCRIPTION =
  "Centro de airsoft CQB indoor en Buenos Aires. Partidas abiertas, grupos privados y eventos corporativos. Máximo 330 FPS, equipo incluido, +18. Reservas por WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Experiencia Airsoft",
  },
  description: DESCRIPTION,
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
    images: [
      {
        url: "/img/07_zona_fria_hero.jpg",
        width: 1200,
        height: 630,
        alt: "Experiencia Airsoft — centro de airsoft CQB indoor en Buenos Aires",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/img/07_zona_fria_hero.jpg"],
  },
  icons: {
    icon: "/img/00_logo_cropped.png",
    shortcut: "/img/00_logo_cropped.png",
    apple: "/img/00_logo_cropped.png",
  },
  category: "sports",
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
      <body className="relative">{children}</body>
    </html>
  );
}
