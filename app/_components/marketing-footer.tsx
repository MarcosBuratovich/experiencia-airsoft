import Link from "next/link";
import Image from "next/image";
import {
  ADDRESS_STREET,
  ADDRESS_CITY,
  INSTAGRAM_URL,
  TIENDA_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
  YOUTUBE_URL,
} from "./site-constants";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-ink border-t border-bone/10">
      <div className="max-w-[1400px] mx-auto fluid-gutter-x py-12">
        <div className="grid md:grid-cols-3 gap-8 md:gap-10">
          <div>
            <Image
              src="/img/00_logo_cropped.png"
              alt="Logo Experiencia Airsoft"
              width={840}
              height={240}
              loading="lazy"
              className="h-10 w-auto mb-4"
            />
            <p className="text-ash fluid-sm leading-relaxed max-w-[36ch]">
              Centro de airsoft CQB indoor en Buenos Aires. La experiencia
              táctica más inmersiva de Argentina.
            </p>
          </div>

          <div>
            <p className="sect-label mb-3">Operación</p>
            <ul className="space-y-2 font-mono fluid-xs tracking-[.22em] uppercase text-ash">
              <li>
                <Link href="/" className="hover:text-bone transition">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/precios" className="hover:text-bone transition">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/buenos-aires" className="hover:text-bone transition">
                  Buenos Aires
                </Link>
              </li>
              <li>
                <Link href="/primera-vez" className="hover:text-bone transition">
                  Primera vez
                </Link>
              </li>
              <li>
                <Link
                  href="/eventos-corporativos"
                  className="hover:text-bone transition"
                >
                  Eventos corporativos
                </Link>
              </li>
              <li>
                <Link href="/cumpleanos" className="hover:text-bone transition">
                  Cumpleaños
                </Link>
              </li>
              <li>
                <Link
                  href="/airsoft-vs-paintball"
                  className="hover:text-bone transition"
                >
                  Airsoft vs paintball
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-bone transition">
                  Blog
                </Link>
              </li>
              <li>
                <a
                  href={TIENDA_URL}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-bone transition"
                >
                  Tienda
                  <span aria-hidden className="ml-1 text-smoke">↗</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="sect-label mb-3">Contacto</p>
            <ul className="space-y-2 font-mono fluid-xs uppercase tracking-[.18em] text-ash">
              <li className="text-bone">{ADDRESS_STREET}</li>
              <li>{ADDRESS_CITY}</li>
              <li>+18 · DNI obligatorio</li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener"
                  className="text-bone hover:text-orange transition"
                >
                  WhatsApp {WHATSAPP_NUMBER}
                </a>
              </li>
              <li className="flex gap-4 pt-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-orange transition"
                >
                  Instagram
                </a>
                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-orange transition"
                >
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-bone/10 flex flex-wrap items-center justify-between gap-3 font-mono fluid-xs uppercase tracking-[.25em] text-smoke">
          <span>© {year} · Experiencia Airsoft</span>
          {/* Meta exige que estas dos sean públicas y encontrables para
              aprobar el App Review de mensajería. */}
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacidad" className="hover:text-bone transition">
              Privacidad
            </Link>
            <Link href="/borrar-datos" className="hover:text-bone transition">
              Borrar mis datos
            </Link>
          </span>
          <span>No es potencia. Es táctica.</span>
        </div>
      </div>
    </footer>
  );
}
