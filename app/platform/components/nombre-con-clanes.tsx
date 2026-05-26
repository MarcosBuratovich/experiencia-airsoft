import Image from "next/image";
import { colorLeibleSobreInk, type ClanChip } from "@/lib/clanes";

type Size = "xs" | "sm";

/**
 * Renderiza el nombre del jugador con sus clanes en cadena al principio:
 *   [WOLF][🦊][PRO] Juan Perez
 *
 * Cada clan se muestra:
 *   - como [ALIAS] coloreado con el color del clan (si display_mode='alias'
 *     o si display_mode='logo' pero no hay logo_url cargado).
 *   - como logo circular chico (si display_mode='logo' y hay logo_url).
 *
 * El color del alias cae a bone si el color del clan no pasa contraste
 * sobre el fondo oscuro de la app.
 */
export function NombreConClanes({
  nombre,
  clanes,
  size = "sm",
  nameClassName,
}: {
  nombre: string;
  clanes: ClanChip[];
  size?: Size;
  /** Override del estilo del nombre (por ej. text-smoke en filas pasadas). */
  nameClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {clanes.map((c) => (
        <ClanBadge key={c.id} clan={c} size={size} />
      ))}
      <span className={nameClassName ?? "text-bone"}>{nombre}</span>
    </span>
  );
}

function ClanBadge({ clan, size }: { clan: ClanChip; size: Size }) {
  const showLogo = clan.display_mode === "logo" && !!clan.logo_url;
  // Logos un poco más prominentes que el texto del alias (el círculo
  // necesita aire para que se reconozca el escudo del clan).
  const logoPx = size === "xs" ? "w-7 h-7" : "w-8 h-8";
  const logoSize = size === "xs" ? 28 : 32;

  if (showLogo) {
    return (
      <Image
        src={clan.logo_url as string}
        alt={clan.nombre}
        title={clan.nombre}
        width={logoSize}
        height={logoSize}
        className={`${logoPx} rounded-full object-cover border border-rail/40 shrink-0`}
      />
    );
  }

  // Si display_mode='alias' pero el alias está vacío, fallback al logo si
  // existe; sino no renderizamos nada para ese clan.
  if (!clan.alias) {
    if (clan.logo_url) {
      return (
        <Image
          src={clan.logo_url}
          alt={clan.nombre}
          title={clan.nombre}
          width={logoSize}
          height={logoSize}
          className={`${logoPx} rounded-full object-cover border border-rail/40 shrink-0`}
        />
      );
    }
    return null;
  }

  const color = colorLeibleSobreInk(clan.color_hex);
  const cls =
    size === "xs"
      ? "font-mono text-[10px] tracking-[.16em] uppercase shrink-0"
      : "font-mono fluid-xs tracking-[.18em] uppercase shrink-0";
  return (
    <span title={clan.nombre} style={{ color }} className={cls}>
      [{clan.alias}]
    </span>
  );
}
