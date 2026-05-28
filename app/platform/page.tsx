import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContactosWhatsapp } from "@/app/_components/contactos-whatsapp";
import { formatFechaLarga, formatHora, modalidadLabel } from "@/lib/format";
import { estadoEfectivo } from "@/lib/partidas";

const APP_URL = "https://app.experienciaairsoft.com";
const TITLE = "Plataforma de reservas · Experiencia Airsoft";
const DESCRIPTION =
  "Plataforma online para reservar partidas de airsoft en Buenos Aires. Inscripción a partidas públicas y privadas, gestión de clanes, perfil de jugador, alquileres.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: APP_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: APP_URL,
    siteName: "Experiencia Airsoft",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const featuresJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Experiencia Airsoft — Plataforma",
  url: APP_URL,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  inLanguage: "es-AR",
  description: DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "Experiencia Airsoft",
    url: "https://www.experienciaairsoft.com",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "ARS",
    description: "Crear cuenta y reservar es gratis. Pagás en el local.",
  },
  featureList: [
    "Reservar partidas públicas",
    "Pedir partidas privadas",
    "Agregar alquileres",
    "Crear y unirte a clanes",
    "Perfil con alias",
    "Notificaciones por email",
  ],
};

export default async function PlatformHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Anónimo: landing pública (indexable por Google).
  if (!user) return <LandingAnonima />;

  // Logueado: dashboard con CTAs grandes hacia las 4 zonas.
  const hoyISO = new Date().toISOString().slice(0, 10);

  const [
    { data: profile },
    { count: countAbiertas },
    { count: countClanes },
    { data: proximasInscripciones },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, apellido, role, socio")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("partidas")
      .select("*", { count: "exact", head: true })
      .eq("visibilidad", "publica")
      .eq("estado", "abierta")
      .gte("fecha", hoyISO),
    supabase
      .from("profile_clanes")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id),
    supabase
      .from("inscripciones")
      .select(
        "estado, partidas!inscripciones_partida_id_fkey(id, fecha, hora_inicio, duracion_min, modalidad, estado)",
      )
      .eq("user_id", user.id)
      .eq("estado", "confirmado"),
  ]);

  const isAdmin =
    profile?.role === "admin" || profile?.role === "super_admin";
  const nombre = (profile?.nombre ?? "").trim() || "Operador";

  type Insc = {
    estado: string;
    partidas:
      | {
          id: string;
          fecha: string;
          hora_inicio: string;
          duracion_min: number;
          modalidad: string;
          estado: string;
        }
      | null
      | Array<{
          id: string;
          fecha: string;
          hora_inicio: string;
          duracion_min: number;
          modalidad: string;
          estado: string;
        }>;
  };

  // Próxima partida confirmada: primer partida futura ordenada por fecha+hora.
  const proxima = (() => {
    const candidatas = ((proximasInscripciones ?? []) as Insc[])
      .map((r) => (Array.isArray(r.partidas) ? r.partidas[0] : r.partidas))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter((p) => {
        const fx = estadoEfectivo({
          fecha: p.fecha,
          hora_inicio: p.hora_inicio,
          duracion_min: p.duracion_min,
          estado: p.estado,
        });
        return fx === "futura" || fx === "en_curso";
      })
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
        return a.hora_inicio < b.hora_inicio ? -1 : 1;
      });
    return candidatas[0] ?? null;
  })();

  // Texto de cada card: cambia según el estado del usuario para que se
  // sienta más útil/contextual que un "feature list" genérico.
  const cards: HomeCard[] = [
    {
      titulo: "Partidas públicas",
      descripcion:
        "Las partidas semanales abiertas a cualquiera. Mirá la agenda, anotate y pagás cuando llegás.",
      href: "/partidas",
      cta: "Ver partidas",
      tag:
        (countAbiertas ?? 0) > 0
          ? `${countAbiertas} abiertas próximas`
          : "Ninguna abierta",
      destacar: (countAbiertas ?? 0) > 0,
    },
    {
      titulo: "Reservar privada",
      descripcion:
        "Tu grupo, tu día, cancha exclusiva 4 hs. Cumple, despedida, evento corporativo o junta de clan. Coordinamos por WhatsApp.",
      href: "/privada/solicitar",
      cta: "Pedir slot",
      tag: "Mínimo 10 personas",
    },
    {
      titulo: (countClanes ?? 0) > 0 ? "Tus clanes" : "Buscá tu clan",
      descripcion:
        (countClanes ?? 0) > 0
          ? "Gestioná tus clanes, aprobá solicitudes o sumate a otro. Podés estar en hasta 3."
          : "Sumate a un clan que ya existe o creá el tuyo. Cada clan tiene logo, color y ranking.",
      href: (countClanes ?? 0) > 0 ? "/mi-clan" : "/clanes",
      cta: (countClanes ?? 0) > 0 ? "Ir a mis clanes" : "Ver clanes",
      tag:
        (countClanes ?? 0) > 0
          ? `Estás en ${countClanes}${(countClanes ?? 0) === 1 ? " clan" : " clanes"}`
          : "Hasta 3 por usuario",
    },
    {
      titulo: "Tu perfil",
      descripcion:
        "Editá tu alias, número de jugador, celular o contraseña. Tu alias es lo que ven los demás en cada partida.",
      href: "/perfil",
      cta: "Abrir perfil",
      tag: profile?.socio ? "Socio activo" : undefined,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresJsonLd) }}
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <p className="sect-label mb-2">// Operador</p>
          <h1 className="font-display fluid-3xl sm:fluid-4xl uppercase leading-[.95] text-bone tracking-wider">
            Hola, <span className="text-orange">{nombre}</span>
          </h1>
          <p className="mt-3 text-ash fluid-sm sm:fluid-md leading-relaxed max-w-[55ch]">
            ¿Qué venís a hacer hoy? Elegí una de las opciones de abajo.
          </p>
        </div>

        {proxima && (
          <Link
            href={`/partidas/${proxima.id}`}
            className="block mb-6 border border-orange/50 bg-orange/5 clip-notch p-4 sm:p-5 hover:bg-orange/10 transition"
          >
            <p className="sect-label mb-1 text-orange">// Tu próxima partida</p>
            <p className="font-display fluid-lg sm:fluid-xl uppercase tracking-wider text-bone">
              {modalidadLabel(proxima.modalidad)} ·{" "}
              {formatFechaLarga(proxima.fecha)}
            </p>
            <p className="mt-1 font-mono fluid-xs uppercase tracking-[.22em] text-ash">
              {formatHora(proxima.hora_inicio)} hs ·{" "}
              {proxima.duracion_min / 60} hs en cancha
              <span className="text-smoke"> · ver detalle →</span>
            </p>
          </Link>
        )}

        <ul className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
          {cards.map((c) => (
            <HomeCard key={c.titulo} {...c} />
          ))}
        </ul>

        {isAdmin && (
          <Link
            href="/admin/partidas"
            className="block mb-8 border border-rail/60 bg-carbon clip-notch p-4 hover:border-orange transition"
          >
            <p className="sect-label mb-1 text-orange">// Admin</p>
            <p className="font-display fluid-base uppercase tracking-wider text-bone">
              Panel de administración →
            </p>
            <p className="mt-1 font-mono fluid-xs text-smoke">
              Partidas, socios, eventos, precios, templates, usuarios.
            </p>
          </Link>
        )}

        <ContactosWhatsapp />
      </div>
    </>
  );
}

type HomeCard = {
  titulo: string;
  descripcion: string;
  href: string;
  cta: string;
  tag?: string;
  destacar?: boolean;
};

function HomeCard({ titulo, descripcion, href, cta, tag, destacar }: HomeCard) {
  return (
    <li>
      <Link
        href={href}
        className={`group block h-full border clip-notch p-5 sm:p-6 transition ${
          destacar
            ? "border-orange/60 bg-orange/5 hover:bg-orange/10"
            : "border-rail/60 bg-carbon hover:border-orange"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-display fluid-xl uppercase tracking-wider text-bone leading-tight">
            {titulo}
          </h2>
          {tag && (
            <span
              className={`shrink-0 px-2 py-0.5 font-mono fluid-xs uppercase tracking-[.15em] border ${
                destacar
                  ? "border-orange/60 text-orange"
                  : "border-rail/60 text-smoke"
              }`}
            >
              {tag}
            </span>
          )}
        </div>
        <p className="text-ash fluid-sm leading-relaxed mb-4">{descripcion}</p>
        <p className="font-mono fluid-xs uppercase tracking-[.22em] text-orange group-hover:translate-x-1 transition">
          {cta} →
        </p>
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Landing anónima (anterior). Se queda igual: SEO público para
// app.experienciaairsoft.com sin sesión.
// ---------------------------------------------------------------------------

function LandingAnonima() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center sm:text-left">
        <p className="sect-label mb-2 text-orange">// Plataforma</p>
        <h1 className="font-display fluid-4xl uppercase leading-[.95] text-bone tracking-wider">
          Reservá tu lugar
          <br />
          <span className="text-orange">en segundos</span>
        </h1>
        <p className="mt-5 text-ash fluid-md leading-relaxed max-w-[55ch]">
          Esta es la plataforma online de Experiencia Airsoft. Creás tu
          cuenta una vez, ves las partidas de la semana y te anotás. Pagás
          cuando llegás al local.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-12">
        <Link
          href="/signup"
          className="btn-wa clip-tag inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold uppercase tracking-wider fluid-xs"
        >
          Crear cuenta
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/login"
          className="btn-ghost clip-tag inline-flex items-center justify-center gap-2 px-6 py-3 uppercase tracking-wider fluid-xs"
        >
          Ya tengo cuenta · Ingresar
        </Link>
      </div>

      <section className="mb-12">
        <h2 className="sect-label mb-4">// Qué podés hacer</h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          <Feature
            title="Reservar partidas públicas"
            desc="Mirá las partidas semanales, anotate y pagás en el local."
          />
          <Feature
            title="Pedir partidas privadas"
            desc="Slot exclusivo de 4 hs para cumpleaños o grupo cerrado."
          />
          <Feature
            title="Agregar alquileres"
            desc="Sumá amigos que vienen sin cuenta a la lista bajo tu nombre."
          />
          <Feature
            title="Crear y unirte a clanes"
            desc="Hasta 3 clanes por usuario, con logo y color propio."
          />
          <Feature
            title="Perfil con alias"
            desc="Tu apodo (emojis incluidos) aparece en cada partida."
          />
          <Feature
            title="Notificaciones por email"
            desc="Confirmaciones, recordatorios de cuota, respuestas a solicitudes."
          />
        </ul>
      </section>

      <section className="mb-10 border border-orange/30 bg-orange/5 clip-notch p-5">
        <p className="sect-label text-orange mb-1">// ¿Sos nuevo?</p>
        <p className="text-ash fluid-sm leading-relaxed">
          Si nunca viniste a Experiencia Airsoft, podés leer{" "}
          <a
            href="https://www.experienciaairsoft.com/primera-vez"
            className="text-orange hover:underline"
          >
            cómo es la primera vez
          </a>
          ,{" "}
          <a
            href="https://www.experienciaairsoft.com/precios"
            className="text-orange hover:underline"
          >
            cuánto sale
          </a>{" "}
          o{" "}
          <a
            href="https://www.experienciaairsoft.com/buenos-aires"
            className="text-orange hover:underline"
          >
            cómo llegar al local
          </a>
          . Después volvés y creás tu cuenta para reservar.
        </p>
      </section>

      <ContactosWhatsapp />
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="border border-rail/60 bg-carbon clip-notch p-4">
      <p className="font-display fluid-base uppercase tracking-wider text-bone">
        {title}
      </p>
      <p className="mt-1 font-sans fluid-sm text-ash leading-relaxed">
        {desc}
      </p>
    </li>
  );
}
