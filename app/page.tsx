import Link from "next/link";
import { ReelCard } from "./reel-card";
import { ScrollFx } from "./scroll-fx";

const WHATSAPP_URL = "https://wa.me/5491138689783";
const INSTAGRAM_URL = "https://www.instagram.com/experienciaairsoft/";
const YOUTUBE_URL = "https://www.youtube.com/@experienciaairsoft8250";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.1 4.9A10 10 0 0 0 4.1 18.3L3 22l3.8-1a10 10 0 0 0 14.8-8.6 9.9 9.9 0 0 0-2.5-7.5Zm-7 15.3a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.3.6.6-2.2-.2-.3A8.3 8.3 0 1 1 12.1 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.2a.4.4 0 0 0 0-.4c0-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4H9c-.2 0-.5.1-.7.3a2.5 2.5 0 0 0-.8 1.9 4.3 4.3 0 0 0 .9 2.3 9.9 9.9 0 0 0 4 3.6c2.3 1 2.3.6 2.7.6a2.2 2.2 0 0 0 1.5-1 1.8 1.8 0 0 0 .1-1c0-.2-.2-.3-.4-.4Z" />
    </svg>
  );
}

type Partida = {
  id: string;
  day: string;
  op: string;
  time: string;
  tag: string;
  image: string;
  alt: string;
  waText: string;
  delayClass: string;
};

const partidas: Partida[] = [
  {
    id: "martes",
    day: "Martes",
    op: "01",
    time: "19:00 — 23:00 HS",
    tag: "PÚBLICA",
    image: "/img/01_partida_martes.jpg",
    alt: "Partida de airsoft CQB indoor del martes 19hs en Buenos Aires",
    waText: "Hola! Quiero reservar para la partida del martes",
    delayClass: "",
  },
  {
    id: "miercoles",
    day: "Miércoles",
    op: "02",
    time: "19:00 — 23:00 HS",
    tag: "PÚBLICA",
    image: "/img/02_partida_miercoles.jpg",
    alt: "Partida de airsoft CQB indoor del miércoles 19hs en Buenos Aires",
    waText: "Hola! Quiero reservar para la partida del miércoles",
    delayClass: "reveal-delay-1",
  },
  {
    id: "jueves",
    day: "Jueves",
    op: "03",
    time: "19:00 — 23:00 HS",
    tag: "PÚBLICA",
    image: "/img/03_partida_jueves.jpg",
    alt: "Partida de airsoft CQB indoor del jueves 19hs en Buenos Aires",
    waText: "Hola! Quiero reservar para la partida del jueves",
    delayClass: "reveal-delay-2",
  },
  {
    id: "viernes",
    day: "Viernes",
    op: "04",
    time: "19:00 — 23:00 HS",
    tag: "PÚBLICA",
    image: "/img/04_partida_viernes.jpg",
    alt: "Partida de airsoft CQB indoor del viernes 19hs en Buenos Aires",
    waText: "Hola! Quiero reservar para la partida del viernes",
    delayClass: "",
  },
  {
    id: "sabado",
    day: "Sábado",
    op: "05",
    time: "09:00 — 13:00 HS",
    tag: "PÚBLICA · AM",
    image: "/img/05_partida_sabado.jpg",
    alt: "Partida de airsoft CQB indoor del sábado por la mañana en Buenos Aires",
    waText: "Hola! Quiero reservar para la partida del sábado",
    delayClass: "reveal-delay-1",
  },
  {
    id: "domingo",
    day: "Domingo",
    op: "06",
    time: "09:00 — 13:00 HS",
    tag: "PÚBLICA · AM",
    image: "/img/06_partida_domingo.jpg",
    alt: "Partida de airsoft CQB indoor del domingo por la mañana en Buenos Aires",
    waText: "Hola! Quiero reservar para la partida del domingo",
    delayClass: "reveal-delay-2",
  },
];

type Reel = {
  title: string;
  index: string;
  image: string;
  alt: string;
  video: string;
  delayClass: string;
};

const reels: Reel[] = [
  {
    title: "Normas de seguridad",
    index: "01",
    image: "/img/10_como_me_uno.jpg",
    alt: "Video: normas de seguridad en partidas de airsoft CQB indoor de Experiencia Airsoft",
    video: "/videos/normas-de-seguridad.mp4",
    delayClass: "",
  },
  {
    title: "¿No tengo nada para jugar?",
    index: "02",
    image: "/img/11_no_tengo_nada_para_jugar.jpg",
    alt: "Video: alquiler de equipo de airsoft incluido en Experiencia Airsoft",
    video: "/videos/no-tengo-nada-para-jugar.mp4",
    delayClass: "reveal-delay-1",
  },
  {
    title: "¿No tengo con quién ir?",
    index: "03",
    image: "/img/12_no_tengo_con_quien_ir.jpg",
    alt: "Video: partidas públicas abiertas para anotarse solo en Experiencia Airsoft",
    video: "/videos/no-tengo-con-quien-ir.mp4",
    delayClass: "reveal-delay-2",
  },
  {
    title: "Cómo reservar",
    index: "04",
    image: "/img/13_como_reservar.jpg",
    alt: "Video: cómo reservar tu lugar en una partida de airsoft CQB por WhatsApp",
    video: "/videos/como-reservar.mp4",
    delayClass: "reveal-delay-3",
  },
  {
    title: "Mitos del airsoft",
    index: "05",
    image: "/img/14_mitos_del_airsoft.jpg",
    alt: "Video: mitos del airsoft desarmados — máximo 330 FPS, táctica antes que potencia",
    video: "/videos/mitos-del-airsoft.mp4",
    delayClass: "",
  },
  {
    title: "¿Qué llevar a una partida?",
    index: "06",
    image: "/img/15_que_traer_primer_juego.jpg",
    alt: "Video: qué traer a tu primera partida de airsoft en Buenos Aires",
    video: "/videos/que-llevar-a-una-partida.mp4",
    delayClass: "reveal-delay-1",
  },
  {
    title: "Tips para tu primera partida",
    index: "07",
    image: "/img/17_tips_primer_partida.jpg",
    alt: "Video: tips para tu primera partida de airsoft CQB indoor",
    video: "/videos/tips-primera-partida.mp4",
    delayClass: "reveal-delay-2",
  },
  {
    title: "Testimonios",
    index: "08",
    image: "/img/18_testimonios.jpg",
    alt: "Video: testimonios de jugadores de Experiencia Airsoft",
    video: "/videos/testimonios.mp4",
    delayClass: "reveal-delay-3",
  },
];

type Pillar = {
  num: string;
  title: [string, string];
  icon: React.ReactNode;
  delayClass: string;
};

const pillars: Pillar[] = [
  {
    num: "01",
    title: ["Seguridad", "ante todo"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-orange"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z" />
      </svg>
    ),
    delayClass: "",
  },
  {
    num: "02",
    title: ["Juego", "limpio"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-orange"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
    delayClass: "reveal-delay-1",
  },
  {
    num: "03",
    title: ["Comunidad", "activa"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-orange"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="10" r="2.5" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M14.5 20c0-2 1.5-3.5 4-3.5S22 18 22 20" />
      </svg>
    ),
    delayClass: "reveal-delay-2",
  },
  {
    num: "04",
    title: ["Innovación", "táctica"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-orange"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 2v4M12 18v4M4 12h4M16 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
      </svg>
    ),
    delayClass: "",
  },
  {
    num: "05",
    title: ["Profesio-", "nalismo"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-orange"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="4" y="5" width="16" height="14" />
        <path d="M9 5V3h6v2M4 12h16" />
      </svg>
    ),
    delayClass: "reveal-delay-1",
  },
  {
    num: "06",
    title: ["Diversión", "siempre"],
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 text-orange"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </svg>
    ),
    delayClass: "reveal-delay-2",
  },
];

const marqueeItems = [
  "// Experiencia Airsoft",
  "Máximo 330 FPS",
  "Reservas por WhatsApp",
  "Gral. Conesa 1858 · Buenos Aires",
  "Mayores de 18",
];

const SITE_URL = "https://experienciaairsoft.com";

const businessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["SportsActivityLocation", "LocalBusiness"],
  "@id": `${SITE_URL}/#business`,
  name: "Experiencia Airsoft",
  alternateName: "Experiencia Airsoft CQB",
  description:
    "Centro de airsoft CQB indoor en Buenos Aires. Partidas públicas abiertas, grupos privados y eventos corporativos con equipo incluido. Máximo 330 FPS, +18. Reservas por WhatsApp.",
  slogan: "No es potencia. Es táctica.",
  url: SITE_URL,
  telephone: "+541138689783",
  email: "hola@experienciaairsoft.com",
  image: [
    `${SITE_URL}/img/07_zona_fria_hero.jpg`,
    `${SITE_URL}/img/16_partida_nocturna.jpg`,
    `${SITE_URL}/img/01_partida_martes.jpg`,
    `${SITE_URL}/img/05_partida_sabado.jpg`,
  ],
  logo: `${SITE_URL}/img/00_logo_principal.png`,
  priceRange: "$$",
  sport: "Airsoft",
  knowsLanguage: ["es", "es-AR"],
  paymentAccepted: ["Cash", "Bank Transfer"],
  currenciesAccepted: "ARS",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Gral. Conesa 1858",
    addressLocality: "Ciudad Autónoma de Buenos Aires",
    postalCode: "C1870",
    addressRegion: "CABA",
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -34.5594,
    longitude: -58.4634,
  },
  hasMap: "https://maps.app.goo.gl/?q=Gral.+Conesa+1858,+CABA",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "19:00",
      closes: "23:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday", "Sunday"],
      opens: "09:00",
      closes: "13:00",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Reservas",
    telephone: "+541138689783",
    availableLanguage: ["Spanish"],
    contactOption: "WhatsApp",
  },
  sameAs: [
    "https://www.instagram.com/experienciaairsoft/",
    "https://www.youtube.com/@experienciaairsoft8250",
  ],
  areaServed: [
    { "@type": "City", name: "Buenos Aires" },
    { "@type": "City", name: "Ciudad Autónoma de Buenos Aires" },
    { "@type": "AdministrativeArea", name: "AMBA" },
  ],
  isAccessibleForFree: false,
  audience: { "@type": "Audience", suggestedMinAge: 18 },
  amenityFeature: [
    {
      "@type": "LocationFeatureSpecification",
      name: "Equipo de airsoft incluido",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Múltiples niveles y zonas CQB",
      value: true,
    },
    {
      "@type": "LocationFeatureSpecification",
      name: "Máximo 330 FPS",
      value: true,
    },
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Experiencia Airsoft",
  inLanguage: "es-AR",
  publisher: { "@id": `${SITE_URL}/#business` },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Inicio",
      item: SITE_URL,
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Quiénes pueden jugar al airsoft en Experiencia Airsoft?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mayores de 18 años con documento al momento del ingreso. Aceptamos jugadores nuevos y con experiencia — no hace falta tener equipo propio.",
      },
    },
    {
      "@type": "Question",
      name: "¿Necesito traer equipo propio?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Alquilás el equipo completo en el lugar: marcadora, protección facial, chaleco y BBs. Solo venís a jugar.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cómo reservo una partida?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Todas las reservas son por WhatsApp al +54 9 11 3868-9783. Trabajamos 100% bajo reserva previa.",
      },
    },
    {
      "@type": "Question",
      name: "¿Dónde queda Experiencia Airsoft?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Gral. Conesa 1858, C1870, Ciudad Autónoma de Buenos Aires, Argentina. Somos un centro de airsoft CQB indoor.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es la potencia máxima permitida?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Máximo 330 FPS. Es la categoría más baja permitida para CQB y la usamos porque jugamos en espacios cerrados y combate cercano — la experiencia táctica no se mide en potencia, sino en estrategia y trabajo en equipo.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué modalidades de partida ofrecen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Partidas públicas abiertas (cualquiera se anota), privadas de grupo (10 a 20 personas) y eventos corporativos para empresas y team building.",
      },
    },
  ],
};

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <>
      <ScrollFx />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* NAV */}
      <header
        id="nav"
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-300"
      >
        <div
          className="max-w-[1400px] mx-auto flex items-center justify-between fluid-gutter-x gap-3"
          style={{ height: "var(--nav-h)" }}
        >
          <a
            href="#top"
            className="flex items-center gap-3 shrink-0"
            aria-label="Experiencia Airsoft — inicio"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/00_logo_cropped.png"
              alt="Logo Experiencia Airsoft — airsoft CQB indoor en Buenos Aires"
              width={840}
              height={240}
              className="h-[clamp(2rem,2vw+1.5rem,3rem)] w-auto"
            />
          </a>

          <nav className="hidden lg:flex items-center gap-[clamp(1.25rem,2vw,2rem)] fluid-sm tracking-[.22em] font-mono uppercase text-ash">
            <a href="#partidas" className="hover:text-bone transition-colors">
              Partidas
            </a>
            <a href="#participar" className="hover:text-bone transition-colors">
              Cómo participar
            </a>
            <a href="#filosofia" className="hover:text-bone transition-colors">
              Filosofía
            </a>
            <a href="#aprende" className="hover:text-bone transition-colors">
              Aprendé
            </a>
            <a href="#reservar" className="hover:text-bone transition-colors">
              Reservar
            </a>
          </nav>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="inline-flex mil-tag bone">
              <span className="w-1.5 h-1.5 rounded-full bg-orange pulse-dot"></span>
              <span className="hidden sm:inline">BAJO </span>RESERVA
            </span>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-wa clip-notch inline-flex items-center gap-2 px-[clamp(0.75rem,1.5vw,1.25rem)] py-[clamp(0.55rem,1vw,0.75rem)] fluid-xs tracking-[.2em] uppercase"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Reservar</span>
            </a>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-bone/10 to-transparent"></div>
      </header>

      <main>

      {/* HERO */}
      <section
        id="top"
        className="relative min-h-[100svh] flex flex-col overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/07_zona_fria_hero.jpg"
          alt="Jugadores en plena partida de airsoft CQB indoor en Experiencia Airsoft, Buenos Aires"
          fetchPriority="high"
          width={2400}
          height={1600}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(10,10,10,.35) 0%, rgba(10,10,10,.85) 70%, rgba(10,10,10,.95) 100%)",
          }}
        ></div>
        <div className="absolute inset-0 diag-lines-faint pointer-events-none"></div>

        {/* Address bar — in flow, sits below fixed nav */}
        <div
          className="relative z-10 hidden md:flex items-center justify-between fluid-gutter-x font-mono fluid-xs tracking-[.28em] uppercase text-bone/80"
          style={{ paddingTop: "calc(var(--nav-h) + 0.75rem)" }}
        >
          <span className="mil-tag bone">
            GRAL. CONESA 1858 · BUENOS AIRES · +18
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange pulse-dot"></span>
            RESERVA ABIERTA
          </span>
        </div>

        <div
          className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto fluid-gutter-x text-center py-[clamp(2rem,4vw,4rem)]"
          style={{
            paddingTop:
              "clamp(calc(var(--nav-h) + 1rem), 6vh, calc(var(--nav-h) + 3rem))",
          }}
        >
          <div className="relative inline-block">
            <h1
              className="uppercase text-bone fluid-display"
              style={{
                fontFamily: "var(--font-anton), system-ui, sans-serif",
                letterSpacing: "-.01em",
              }}
            >
              <span className="sr-only">
                Airsoft CQB indoor en Buenos Aires —{" "}
              </span>
              Experiencia
              <br />
              <span className="text-orange">Airsoft</span>
            </h1>
            <span className="absolute -top-5 -left-5 w-5 h-5 border-l border-t border-orange/80"></span>
            <span className="absolute -top-5 -right-5 w-5 h-5 border-r border-t border-orange/80"></span>
            <span className="absolute -bottom-5 -left-5 w-5 h-5 border-l border-b border-orange/80"></span>
            <span className="absolute -bottom-5 -right-5 w-5 h-5 border-r border-b border-orange/80"></span>
          </div>
          <p className="mt-[clamp(1.5rem,3vw,2.5rem)] font-display uppercase text-bone fluid-2xl tracking-[.08em] leading-tight max-w-[28ch]">
            La experiencia táctica
            <br />
            más inmersiva de Argentina
          </p>
          <p className="mt-[clamp(0.75rem,1.5vw,1.25rem)] text-ash fluid-base leading-relaxed max-w-[56ch]">
            CQB indoor · Estrategia, adrenalina y trabajo en equipo.
          </p>

          <div className="mt-[clamp(1.5rem,3vw,2.5rem)] flex flex-wrap justify-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener"
              className="btn-wa clip-notch inline-flex items-center gap-3 px-7 py-4 fluid-xs tracking-[.22em] uppercase"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Reservar por WhatsApp
            </a>
            <a
              href="#partidas"
              className="btn-ghost clip-notch inline-flex items-center gap-3 px-7 py-4 fluid-xs tracking-[.22em] uppercase"
            >
              Ver partidas
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>

          <p className="mt-[clamp(1rem,2vw,1.5rem)] font-mono fluid-xs tracking-[.28em] uppercase text-smoke">
            <span className="text-orange">//</span> Trabajamos 100% bajo reserva
            previa
          </p>
        </div>

        {/* Bottom bar — in flow so it's always visible */}
        <div className="relative z-10 border-t border-bone/10 bg-ink/60 backdrop-blur-sm fluid-gutter-x py-3.5 flex items-center justify-between font-mono fluid-xs tracking-[.28em] uppercase text-ash/80">
          <div className="flex items-center gap-4 md:gap-6">
            <span className="text-orange">// 330 FPS MAX</span>
            <span className="hidden md:inline">INDOOR · CQB</span>
            <span className="hidden md:inline">+18</span>
          </div>
          <span className="flex items-center gap-2">
            SCROLL <span>↓</span>
          </span>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="relative z-10 border-y border-bone/10 bg-carbon overflow-hidden">
        <div className="marquee-track flex whitespace-nowrap py-3.5 font-mono fluid-xs tracking-[.3em] uppercase text-ash">
          <div className="flex items-center gap-10 px-5 shrink-0">
            {marqueeItems.map((item, i) => (
              <span key={`a-${i}`} className="flex items-center gap-10 shrink-0">
                <span>{item}</span>
                <span className="text-orange">◆</span>
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="flex items-center gap-10 px-5 shrink-0"
          >
            {marqueeItems.map((item, i) => (
              <span key={`b-${i}`} className="flex items-center gap-10 shrink-0">
                <span>{item}</span>
                <span className="text-orange">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PARTIDAS */}
      <section id="partidas" className="relative fluid-section-y bg-ink">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x">
          <div className="grid md:grid-cols-12 gap-8 items-end mb-[clamp(2.5rem,1.8rem+3vw,5rem)]">
            <div className="md:col-span-7 reveal">
              <div className="flex items-center gap-4 mb-5">
                <span className="sect-label">[ 01 · Sección ]</span>
                <span className="h-px w-16 bg-orange"></span>
              </div>
              <h2 className="sect-title fluid-6xl text-bone">
                Partidas
                <br />
                <span className="text-orange">Públicas</span>
              </h2>
            </div>
            <div className="md:col-span-5 reveal reveal-delay-1">
              <p className="text-ash fluid-md leading-relaxed max-w-[48ch]">
                Elegí tu día. Te sumás a un grupo, el staff arma los equipos y
                dirige misiones. No necesitás experiencia previa — solo llegar
                puntual para la charla de seguridad.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm">
                <div className="spec-row">
                  <span className="k">Duración</span>
                  <span className="v">2–3 h</span>
                </div>
                <div className="spec-row">
                  <span className="k">Edad</span>
                  <span className="v">+18</span>
                </div>
                <div className="spec-row">
                  <span className="k">FPS máx</span>
                  <span className="v">330</span>
                </div>
                <div className="spec-row">
                  <span className="k">Reserva</span>
                  <span className="v text-orange">WhatsApp</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {partidas.map((p) => (
              <article
                key={p.id}
                className={`group relative bg-carbon clip-notch-lg glow-on-hover transition-shadow duration-300 reveal ${p.delayClass}`}
              >
                <div className="relative imgcard aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.alt}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"></div>
                  <span className="absolute top-4 left-4 mil-tag">{p.tag}</span>
                  <span className="absolute top-4 right-4 font-mono fluid-xs tracking-[.28em] text-bone/80">
                    OP–{p.op}
                  </span>
                </div>
                <div className="p-6 md:p-7">
                  <div className="flex items-end justify-between mb-1">
                    <h3 className="font-display font-semibold text-[clamp(2.5rem,1.6rem+3vw,3.5rem)] leading-none tracking-wide uppercase text-bone">
                      {p.day}
                    </h3>
                    <span className="op-num hidden md:inline">{p.op}</span>
                  </div>
                  <p className="font-mono fluid-xs tracking-[.28em] uppercase text-orange mb-5">
                    {p.time}
                  </p>
                  <a
                    href={`${WHATSAPP_URL}?text=${encodeURIComponent(p.waText)}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 fluid-xs font-mono tracking-[.25em] uppercase text-bone hover:text-orange transition-colors group/btn"
                  >
                    <span className="w-8 h-px bg-bone group-hover/btn:bg-orange group-hover/btn:w-12 transition-all"></span>
                    Reservar por WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PARTICIPAR */}
      <section
        id="participar"
        className="relative fluid-section-y bg-carbon border-y border-bone/5"
      >
        <div className="absolute inset-0 diag-lines-faint pointer-events-none"></div>
        <div className="relative max-w-[1400px] mx-auto fluid-gutter-x">
          <div className="grid md:grid-cols-12 gap-8 mb-[clamp(2.5rem,1.8rem+3vw,5rem)]">
            <div className="md:col-span-7 reveal">
              <div className="flex items-center gap-4 mb-5">
                <span className="sect-label">[ 02 · Modos de operación ]</span>
                <span className="h-px w-16 bg-orange"></span>
              </div>
              <h2 className="sect-title fluid-6xl text-bone">
                Formas de
                <br />
                participar
              </h2>
            </div>
            <div className="md:col-span-5 flex md:items-end reveal reveal-delay-1">
              <p className="text-ash fluid-md leading-relaxed max-w-[46ch]">
                Tres formatos para armar tu experiencia. Alquilás el equipo
                completo en el lugar — no hace falta traer absolutamente nada.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            <div className="relative p-8 md:p-10 bg-ink clip-notch-lg border border-bone/5 reveal">
              <div className="flex items-center justify-between mb-8">
                <span className="mil-tag">MODO · A</span>
                <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none text-orange/30 font-semibold">
                  01
                </span>
              </div>
              <h3 className="sect-title fluid-3xl text-bone mb-4">
                Abiertas
                <br />
                públicas
              </h3>
              <p className="text-ash fluid-base leading-relaxed mb-8">
                Ideal si venís solo o con amigos. Te sumás a un grupo, el staff
                arma los equipos y dirige misiones. No necesitás experiencia
                previa.
              </p>
              <ul className="space-y-2 font-mono fluid-xs tracking-[.18em] uppercase text-smoke">
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Sin mínimo de personas
                </li>
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Staff arma equipos
                </li>
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Misiones dirigidas
                </li>
              </ul>
            </div>

            <div className="relative p-8 md:p-10 bg-ink clip-notch-lg border border-bone/5 reveal reveal-delay-1">
              <div className="flex items-center justify-between mb-8">
                <span className="mil-tag">MODO · B</span>
                <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none text-orange/30 font-semibold">
                  02
                </span>
              </div>
              <h3 className="sect-title fluid-3xl text-bone mb-4">
                Privadas
                <br />
                de grupo
              </h3>
              <p className="text-ash fluid-base leading-relaxed mb-8">
                Para grupos de 10 a 20 personas que quieren jugar entre ustedes.
                Aunque sea la primera vez, les explicamos todo y los acompañamos
                para jugar seguro.
              </p>
              <ul className="space-y-2 font-mono fluid-xs tracking-[.18em] uppercase text-smoke">
                <li className="flex gap-3">
                  <span className="text-orange">→</span>10 a 20 personas
                </li>
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Horario a coordinar
                </li>
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Apto principiantes
                </li>
              </ul>
            </div>

            <div className="relative p-8 md:p-10 bg-ink clip-notch-lg border border-bone/5 reveal reveal-delay-2">
              <div className="flex items-center justify-between mb-8">
                <span className="mil-tag">MODO · C</span>
                <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none text-orange/30 font-semibold">
                  03
                </span>
              </div>
              <h3 className="sect-title fluid-3xl text-bone mb-4">
                Corporativas
                <br />
                &amp; equipos
              </h3>
              <p className="text-ash fluid-base leading-relaxed mb-8">
                Perfectas para empresas que buscan una actividad distinta,
                divertida y de trabajo en equipo. Consultanos para coordinar
                fecha y detalles.
              </p>
              <ul className="space-y-2 font-mono fluid-xs tracking-[.18em] uppercase text-smoke">
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Team building real
                </li>
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Agenda a medida
                </li>
                <li className="flex gap-3">
                  <span className="text-orange">→</span>Facturación A/B
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 md:mt-14 grid md:grid-cols-3 gap-0 border border-bone/10 clip-notch-lg overflow-hidden reveal">
            <div className="flex items-center gap-4 p-6 md:p-7 border-b md:border-b-0 md:border-r border-bone/10">
              <div className="w-10 h-10 flex items-center justify-center border border-orange/60 text-orange">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-5 h-5"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
              <div>
                <p className="font-mono fluid-xs tracking-[.28em] uppercase text-smoke mb-1">
                  Incluido
                </p>
                <p className="text-bone font-medium fluid-base">
                  Alquilás el equipo completo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 md:p-7 border-b md:border-b-0 md:border-r border-bone/10">
              <div className="w-10 h-10 flex items-center justify-center border border-orange/60 text-orange">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-5 h-5"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <div>
                <p className="font-mono fluid-xs tracking-[.28em] uppercase text-smoke mb-1">
                  Duración
                </p>
                <p className="text-bone font-medium fluid-base">
                  2 a 3 horas de partida
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 md:p-7">
              <div className="w-10 h-10 flex items-center justify-center border border-orange/60 text-orange">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-5 h-5"
                >
                  <path d="M12 2v4M12 18v4M4 12h4M16 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
                </svg>
              </div>
              <div>
                <p className="font-mono fluid-xs tracking-[.28em] uppercase text-smoke mb-1">
                  Briefing
                </p>
                <p className="text-bone font-medium fluid-base">
                  Puntualidad obligatoria
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILOSOFÍA */}
      <section
        id="filosofia"
        className="relative fluid-section-y bg-ink overflow-hidden"
      >
        <div className="max-w-[1400px] mx-auto fluid-gutter-x">
          <div className="flex items-center gap-4 mb-[clamp(2rem,1.5rem+2vw,3.5rem)] reveal">
            <span className="sect-label">[ 03 · Doctrina ]</span>
            <span className="h-px w-16 bg-orange"></span>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 md:gap-6 items-stretch">
            <div className="reveal relative clip-notch-lg overflow-hidden aspect-[3/4] lg:aspect-auto lg:min-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/16_partida_nocturna.jpg"
                alt="Partida nocturna de airsoft CQB con iluminación tenue y jugadores tácticos"
                loading="lazy"
                width={1600}
                height={2133}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30"></div>
              <div className="absolute top-5 left-5 right-5 flex justify-between font-mono fluid-xs tracking-[.28em] uppercase text-bone/80">
                <span>REC · 04:12</span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange pulse-dot"></span>
                  LIVE
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <span className="mil-tag">NIGHT OPS · CQB</span>
              </div>
            </div>

            <div className="flex flex-col gap-5 md:gap-6">
              <article className="relative p-8 md:p-10 bg-carbon clip-notch-lg border border-bone/10 reveal reveal-delay-1">
                <div className="flex items-center justify-between mb-8">
                  <span className="mil-tag">MISIÓN · 01</span>
                  <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none text-orange/30 font-semibold">
                    01
                  </span>
                </div>
                <h3 className="sect-title fluid-3xl text-bone mb-4">
                  La experiencia táctica
                  <br />
                  <span className="text-orange">más segura</span> del país.
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Ofrecer la experiencia táctica más segura, inmersiva y
                  profesional de Argentina. Creamos espacios para entrenar
                  estrategia, trabajo en equipo y toma de decisiones bajo
                  presión — con reglas claras, seguridad estricta (R.U.N +
                  normas internas) y equipamiento de calidad.
                </p>
              </article>

              <article
                className="relative p-8 md:p-10 bg-carbon clip-notch-lg border border-orange/30 reveal reveal-delay-2"
                style={{
                  backgroundImage:
                    "radial-gradient(500px 180px at 100% 0%, rgba(255,107,26,.08), transparent 60%), linear-gradient(180deg,#141414 0%, #0A0A0A 100%)",
                }}
              >
                <div className="flex items-center justify-between mb-8">
                  <span className="mil-tag">VISIÓN · 02</span>
                  <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none text-orange/30 font-semibold">
                    02
                  </span>
                </div>
                <h3 className="sect-title fluid-3xl text-bone mb-4">
                  El <span className="text-orange">referente Nº1</span>
                  <br />
                  de CQB en la región.
                </h3>
                <p className="text-ash fluid-base leading-relaxed">
                  Convertirnos en el referente N°1 de airsoft, CQB y TAC-SIM
                  en Argentina y Sudamérica. Expandir la comunidad, innovar
                  escenarios y elevar el estándar nacional — un espacio donde
                  los jugadores no solo vienen a jugar, sino a formar parte de
                  algo más grande.
                </p>
              </article>
            </div>
          </div>

          <div className="mt-16 md:mt-24">
            <h2 className="sect-title fluid-6xl text-bone reveal">
              No es potencia.
              <br />
              <span className="text-orange">Es táctica.</span>
            </h2>

            <p className="mt-8 text-ash fluid-md leading-relaxed max-w-[60ch] reveal reveal-delay-1">
              En Experiencia Airsoft trabajamos únicamente con la{" "}
              <span className="text-bone">
                categoría más baja permitida para CQB: máximo 330 FPS
              </span>
              . Lo hacemos porque nuestro espacio es un entorno cerrado,
              con superficies reducidas, múltiples niveles y combate cercano
              — y porque queremos cambiar la falsa creencia de que
              &ldquo;más potencia es mejor&rdquo;.
            </p>

            <figure className="relative mt-12 md:mt-14 p-8 md:p-10 bg-carbon clip-notch-lg border-l-2 border-orange reveal reveal-delay-2">
              <svg
                viewBox="0 0 24 18"
                className="absolute top-6 right-6 w-8 h-6 text-orange/40"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0 18V8.4C0 3.76 3.36 0 8 0v4.8c-2 0-3.6 1.6-3.6 3.6H8V18H0Zm16 0V8.4c0-4.64 3.36-8.4 8-8.4v4.8c-2 0-3.6 1.6-3.6 3.6H24V18h-8Z" />
              </svg>
              <blockquote className="font-display font-medium text-[clamp(1.5rem,1rem+2.2vw,2.375rem)] leading-[1.1] text-bone uppercase tracking-tight">
                La verdadera experiencia táctica no se mide en FPS.
                <br />
                <span className="text-orange">Se mide</span> en cómo jugás,
                cómo te movés, cómo colaborás y cómo disfrutás.
              </blockquote>
            </figure>

            <div className="mt-14 md:mt-16">
              <p className="sect-label mb-6">[ Pilares operativos — 06 ]</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-bone/10 border border-bone/10">
                {pillars.map((p) => (
                  <div
                    key={p.num}
                    className={`p-6 bg-ink flex flex-col gap-3 reveal ${p.delayClass}`}
                  >
                    {p.icon}
                    <p className="font-mono fluid-xs tracking-[.28em] uppercase text-smoke">
                      {p.num}
                    </p>
                    <h4 className="font-display fluid-xl uppercase text-bone tracking-wide">
                      {p.title[0]}
                      <br />
                      {p.title[1]}
                    </h4>
                  </div>
                ))}
              </div>

              <div className="mt-8 relative border border-bone/10 bg-carbon clip-notch-lg overflow-hidden reveal">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 diag-lines opacity-50 pointer-events-none"
                ></div>
                <div className="relative grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 p-6 md:p-8 items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-mono fluid-xs tracking-[.3em] uppercase text-orange">
                      // Propósito
                    </span>
                    <span className="h-px w-8 bg-orange"></span>
                  </div>
                  <p
                    className="uppercase text-bone leading-[1]"
                    style={{
                      fontFamily: "var(--font-anton), sans-serif",
                      fontSize: "clamp(18px, 1.9vw, 28px)",
                      letterSpacing: ".005em",
                    }}
                  >
                    La adrenalina se combina con la{" "}
                    <span className="text-orange">disciplina</span>, la{" "}
                    <span className="text-orange">responsabilidad</span> y el{" "}
                    <span className="text-orange">juego limpio</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUIÉNES PUEDEN JUGAR */}
      <section className="relative fluid-section-y bg-carbon border-y border-bone/5">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-5 reveal">
              <div className="flex items-center gap-4 mb-5">
                <span className="sect-label">[ 04 · Elegibilidad ]</span>
                <span className="h-px w-16 bg-orange"></span>
              </div>
              <h2 className="sect-title fluid-5xl text-bone">
                ¿Quiénes
                <br />
                pueden jugar?
              </h2>
            </div>
            <div className="md:col-span-7">
              <div className="divide-y divide-bone/10 border-y border-bone/10">
                <div className="flex items-baseline gap-8 py-6 md:py-8 reveal">
                  <span className="font-mono fluid-xs tracking-[.3em] text-orange shrink-0">
                    REQ · 01
                  </span>
                  <div>
                    <h3 className="font-display fluid-3xl uppercase text-bone leading-tight">
                      Mayores de 18 años
                    </h3>
                    <p className="text-ash fluid-sm mt-1">
                      Documento obligatorio en el ingreso.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-8 py-6 md:py-8 reveal reveal-delay-1">
                  <span className="font-mono fluid-xs tracking-[.3em] text-orange shrink-0">
                    REQ · 02
                  </span>
                  <div>
                    <h3 className="font-display fluid-3xl uppercase text-bone leading-tight">
                      Jugadores nuevos y experimentados
                    </h3>
                    <p className="text-ash fluid-sm mt-1">
                      Desde tu primera partida hasta equipos con años de
                      experiencia.
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-8 py-6 md:py-8 reveal reveal-delay-2">
                  <span className="font-mono fluid-xs tracking-[.3em] text-orange shrink-0">
                    REQ · 03
                  </span>
                  <div>
                    <h3 className="font-display fluid-3xl uppercase text-bone leading-tight">
                      Prioridad absoluta: seguridad y respeto
                    </h3>
                    <p className="text-ash fluid-sm mt-1">
                      Cero tolerancia a conductas que comprometan a otros
                      jugadores.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APRENDÉ */}
      <section id="aprende" className="relative fluid-section-y bg-ink">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x">
          <div className="grid md:grid-cols-12 gap-8 items-end mb-[clamp(2.5rem,1.8rem+3vw,5rem)]">
            <div className="md:col-span-7 reveal">
              <div className="flex items-center gap-4 mb-5">
                <span className="sect-label">[ 05 · Intel briefing ]</span>
                <span className="h-px w-16 bg-orange"></span>
              </div>
              <h2 className="sect-title fluid-6xl text-bone">
                Aprendé
                <br />
                <span className="text-orange">antes de venir</span>
              </h2>
            </div>
            <div className="md:col-span-5 reveal reveal-delay-1">
              <p className="text-ash fluid-md leading-relaxed max-w-[46ch]">
                Todo lo que necesitás saber antes de tu primera partida. Tocá
                play en cualquier reel para verlo acá.
              </p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener"
                className="mt-6 inline-flex items-center gap-3 fluid-xs font-mono tracking-[.25em] uppercase text-bone hover:text-orange transition-colors group"
              >
                <span className="w-8 h-px bg-bone group-hover:bg-orange group-hover:w-12 transition-all"></span>
                Ver feed completo @experienciaairsoft
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {reels.map((r) => (
              <ReelCard
                key={r.index}
                title={r.title}
                index={r.index}
                image={r.image}
                alt={r.alt}
                video={r.video}
                delayClass={r.delayClass}
              />
            ))}
          </div>
        </div>
      </section>

      {/* COMUNIDAD */}
      <section
        id="comunidad"
        className="relative fluid-section-y bg-carbon border-t border-bone/5"
      >
        <div className="max-w-[1400px] mx-auto fluid-gutter-x">
          <div className="flex items-center gap-4 mb-10 reveal">
            <span className="sect-label">[ 06 · Comunidad ]</span>
            <span className="h-px w-16 bg-orange"></span>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener"
              className="group relative block clip-notch-lg overflow-hidden aspect-[16/10] imgcard bg-carbon reveal"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/08_manija_del_mes.jpg"
                alt="Comunidad de jugadores de Experiencia Airsoft — Manija del mes en Instagram"
                loading="lazy"
                width={1600}
                height={1000}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ink/80 via-ink/40 to-ink/80"></div>
              <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="mil-tag">
                    INSTAGRAM · @EXPERIENCIAAIRSOFT
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 text-bone group-hover:text-orange transition-colors"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h3 className="sect-title fluid-4xl text-bone leading-[.9]">
                    Sumate a
                    <br />
                    la comunidad
                  </h3>
                  <p className="mt-4 text-ash fluid-base max-w-[44ch]">
                    Fotos, resultados, &ldquo;Manija del mes&rdquo; y todo lo
                    que pasa dentro de Experiencia Airsoft.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-3 font-mono fluid-xs tracking-[.28em] uppercase text-bone group-hover:text-orange transition-colors">
                    <span className="w-8 h-px bg-bone group-hover:bg-orange group-hover:w-12 transition-all"></span>
                    Seguir en Instagram
                  </span>
                </div>
              </div>
            </a>

            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener"
              className="group relative block clip-notch-lg overflow-hidden aspect-[16/10] imgcard bg-carbon reveal reveal-delay-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/09_banner_streams.jpg"
                alt="Streams en vivo de partidas de airsoft CQB en YouTube de Experiencia Airsoft"
                loading="lazy"
                width={1600}
                height={1000}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/50 to-ink/85"></div>
              <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="mil-tag">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange pulse-dot"></span>
                    YOUTUBE · STREAMS EN VIVO
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 text-bone group-hover:text-orange transition-colors"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M23 7.3a3 3 0 0 0-2.1-2.1C19 4.7 12 4.7 12 4.7s-7 0-8.9.5A3 3 0 0 0 1 7.3 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.7a3 3 0 0 0 2.1 2.1C5 19.3 12 19.3 12 19.3s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.3ZM9.8 15.5v-7l6 3.5-6 3.5Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="sect-title fluid-4xl text-bone leading-[.9]">
                    Miranos
                    <br />
                    en vivo
                  </h3>
                  <p className="mt-4 text-ash fluid-base max-w-[44ch]">
                    Streams con cámaras en cada edificio. POV, estrategia y
                    momentos clave de cada partida.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-3 font-mono fluid-xs tracking-[.28em] uppercase text-bone group-hover:text-orange transition-colors">
                    <span className="w-8 h-px bg-bone group-hover:bg-orange group-hover:w-12 transition-all"></span>
                    Abrir canal de YouTube
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* RESERVAR */}
      <section id="reservar" className="relative overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/07_zona_fria_hero.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover scale-110 blur-md opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/90 to-ink"></div>
          <div className="absolute inset-0 diag-lines-faint"></div>
        </div>

        <div className="relative max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
          <div className="max-w-[1100px] mx-auto text-center">
            <div className="flex items-center justify-center gap-4 mb-6 reveal">
              <span className="h-px w-10 bg-orange"></span>
              <span className="sect-label">[ Inicio de operación ]</span>
              <span className="h-px w-10 bg-orange"></span>
            </div>
            <h2 className="sect-title fluid-display leading-[.88] text-bone reveal">
              ¿Listo para
              <br />
              <span className="text-orange">jugar?</span>
            </h2>
            <p className="mt-8 text-ash fluid-lg reveal reveal-delay-1">
              Las reservas son{" "}
              <span className="text-bone">100% por WhatsApp</span>. Escribinos
              y coordinamos tu partida.
            </p>

            <div className="mt-12 flex flex-col items-center gap-6 reveal reveal-delay-2">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                className="btn-wa clip-notch-lg inline-flex items-center gap-4 px-[clamp(2rem,4vw,3rem)] py-[clamp(1.25rem,2vw,1.75rem)] fluid-md tracking-[.2em] uppercase"
              >
                <WhatsAppIcon className="w-7 h-7 md:w-8 md:h-8" />
                +54 9 11 3868-9783
              </a>
              <p className="font-mono fluid-xs tracking-[.3em] uppercase text-ash">
                Gral. Conesa 1858 · C1870 · Buenos Aires
              </p>
            </div>
          </div>

          <div className="mt-20 grid lg:grid-cols-12 gap-5 md:gap-6 reveal">
            <div className="lg:col-span-5 bg-carbon clip-notch-lg p-8 md:p-10 border border-bone/10">
              <p className="sect-label mb-6">[ Coordenadas ]</p>
              <h3 className="sect-title text-[clamp(2rem,1.4rem+2.5vw,2.75rem)] text-bone leading-none mb-6">
                Punto de
                <br />
                encuentro
              </h3>
              <div className="space-y-0">
                <div className="spec-row">
                  <span className="k">Dirección</span>
                  <span className="v">Gral. Conesa 1858</span>
                </div>
                <div className="spec-row">
                  <span className="k">Ciudad</span>
                  <span className="v">Buenos Aires · C1870</span>
                </div>
                <div className="spec-row">
                  <span className="k">País</span>
                  <span className="v">Argentina</span>
                </div>
                <div className="spec-row">
                  <span className="k">WhatsApp</span>
                  <span className="v text-orange">+54 9 11 3868-9783</span>
                </div>
                <div className="spec-row">
                  <span className="k">Modo</span>
                  <span className="v">Reserva previa</span>
                </div>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Gral.+Conesa+1858+C1870+Buenos+Aires"
                target="_blank"
                rel="noopener"
                className="btn-ghost clip-notch mt-8 inline-flex items-center gap-3 px-5 py-3 fluid-xs tracking-[.22em] uppercase"
              >
                Ver en Google Maps
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <div className="lg:col-span-7 bg-carbon clip-notch-lg overflow-hidden border border-bone/10 aspect-[16/11] lg:aspect-auto lg:min-h-[420px] map-wrap">
              <iframe
                title="Mapa — Gral. Conesa 1858, Buenos Aires"
                src="https://www.google.com/maps?q=Gral.+Conesa+1858+C1870+Buenos+Aires&output=embed"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* FOOTER */}
      <footer className="relative bg-ink border-t border-bone/10">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x py-[clamp(3rem,2rem+4vw,5rem)]">
          <div className="grid md:grid-cols-12 gap-10 md:gap-8">
            <div className="md:col-span-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/00_logo_cropped.png"
                alt="Logo Experiencia Airsoft"
                width={840}
                height={240}
                className="h-[clamp(2.75rem,3vw+2rem,3.75rem)] w-auto mb-5"
              />
              <p className="text-ash fluid-sm leading-relaxed max-w-[36ch]">
                Centro de airsoft CQB indoor. Una misión: la experiencia
                táctica más inmersiva de Argentina.
              </p>
              <div className="mt-5 flex gap-3">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener"
                  aria-label="Instagram"
                  className="w-10 h-10 inline-flex items-center justify-center border border-bone/15 hover:border-orange hover:text-orange text-bone transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
                  </svg>
                </a>
                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noopener"
                  aria-label="YouTube"
                  className="w-10 h-10 inline-flex items-center justify-center border border-bone/15 hover:border-orange hover:text-orange text-bone transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="currentColor"
                  >
                    <path d="M23 7.3a3 3 0 0 0-2.1-2.1C19 4.7 12 4.7 12 4.7s-7 0-8.9.5A3 3 0 0 0 1 7.3 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.7a3 3 0 0 0 2.1 2.1C5 19.3 12 19.3 12 19.3s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.3ZM9.8 15.5v-7l6 3.5-6 3.5Z" />
                  </svg>
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener"
                  aria-label="WhatsApp"
                  className="w-10 h-10 inline-flex items-center justify-center border border-bone/15 hover:border-orange hover:text-orange text-bone transition-colors"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="sect-label mb-5">Navegación</p>
              <ul className="space-y-3 fluid-base">
                <li>
                  <a
                    href="#partidas"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Partidas
                  </a>
                </li>
                <li>
                  <a
                    href="#participar"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Formas de participar
                  </a>
                </li>
                <li>
                  <a
                    href="#filosofia"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Filosofía
                  </a>
                </li>
                <li>
                  <a
                    href="#aprende"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Aprendé
                  </a>
                </li>
                <li>
                  <a
                    href="#reservar"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Reservar
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <p className="sect-label mb-5">Información</p>
              <ul className="space-y-3 fluid-base">
                <li>
                  <Link
                    href="/precios"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Precios y costos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/buenos-aires"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Airsoft en Buenos Aires
                  </Link>
                </li>
                <li>
                  <Link
                    href="/primera-vez"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Primera vez jugando
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <p className="sect-label mb-5">Contacto</p>
              <ul className="space-y-3 fluid-base">
                <li className="text-ash">
                  Gral. Conesa 1858
                  <br />
                  C1870 Buenos Aires
                </li>
                <li>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    +54 9 11 3868-9783
                  </a>
                </li>
                <li>
                  <span className="font-mono fluid-xs tracking-[.2em] uppercase text-smoke">
                    Reserva previa obligatoria
                  </span>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <p className="sect-label mb-5">Redes</p>
              <ul className="space-y-3 fluid-base">
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href={YOUTUBE_URL}
                    target="_blank"
                    rel="noopener"
                    className="text-bone hover:text-orange transition-colors"
                  >
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 md:mt-16 pt-6 border-t border-bone/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <p className="font-mono fluid-xs tracking-[.28em] uppercase text-smoke">
              Actividad para mayores de 18 · Trabajamos bajo reserva
            </p>
            <p className="font-mono fluid-xs tracking-[.28em] uppercase text-smoke">
              © {year} Experiencia Airsoft — Todos los derechos reservados
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
