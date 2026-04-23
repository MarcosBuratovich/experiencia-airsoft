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

export const metadata: Metadata = {
  title: "Experiencia Airsoft — Proyecto CQB · CABA",
  description:
    "Centro de airsoft CQB indoor en CABA. Máximo 330 FPS. Reservas por WhatsApp.",
  openGraph: {
    title: "Experiencia Airsoft — Proyecto CQB · CABA",
    description:
      "Centro de airsoft CQB indoor en CABA. Máximo 330 FPS. Reservas por WhatsApp.",
    locale: "es_AR",
    type: "website",
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
