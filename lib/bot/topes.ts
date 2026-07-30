import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsoTokens } from "./tipos";
import type { BotConfig } from "./config";

/**
 * Control de gasto. El daño máximo de cualquier descontrol —un loop, una
 * campaña que dispara mensajes, un error nuestro— tiene que ser un número
 * definido de antemano.
 *
 * REQUIERE SERVICE ROLE (revisión final antes de merge, IMPORTANTE). Las
 * cinco tablas de fase-19 (bot_conversaciones, bot_mensajes,
 * bot_conocimiento, bot_pendientes, bot_config — ver db/schema-phase-19.sql)
 * tienen policy `for all using (public.is_admin())`. Un cliente que no sea
 * service role —anónimo, o un usuario autenticado que no sea admin— no ve
 * NADA de estas tablas, y Postgres/PostgREST no lo reportan como error: la
 * respuesta es 200 con `data: []` y `error: null`. Es indistinguible, mirando
 * solo la forma de la respuesta, de "la tabla está legítimamente vacía".
 *
 * Esa ambigüedad es la raíz de un fail-open real: `gastoDelDia` no tiene
 * forma de distinguir "no se gastó nada hoy" (0 filas reales en
 * bot_mensajes) de "no puedo ver bot_mensajes" (0 filas por RLS) — las dos
 * producen el mismo `data: []`. Sin más, eso hacía que `gastoDelDia`
 * devolviera 0 en vez de `Infinity`: el tope diario de gasto (`debeFrenar`)
 * nunca dispara. Lo que lo vuelve una trampa y no un fallo cualquiera: las
 * herramientas de DATOS del bot (`proximas_partidas`, `precios`, en
 * herramientas.ts) viven en otras tablas con policies más permisivas y
 * siguen funcionando con ese mismo cliente — el bot parece sano mientras
 * gasta sin techo.
 *
 * `verificarAccesoAdmin` (más abajo) cierra ese agujero con un canario:
 * `bot_config` es una fila SINGLETON sembrada por la migración
 * (`insert ... on conflict (id) do nothing`), así que — a diferencia de
 * `bot_mensajes`, donde 0 filas puede ser perfectamente legítimo— un cliente
 * con acceso real SIEMPRE tiene que ver exactamente 1 fila ahí. Verla en 0
 * no es ambiguo: o el cliente no es service role, o no se corrió
 * db/schema-phase-19.sql. Cualquiera de los dos motivos amerita frenar todo
 * ANTES de fingir que el bot puede operar con datos que en realidad no ve.
 * `gastoDelDia` la llama automáticamente (ver más abajo): así ningún futuro
 * adaptador (el webhook de Instagram/Messenger, todavía sin escribir en este
 * repo) puede desplegarse con el cliente equivocado sin que algo reviente de
 * forma ruidosa y explícita en los logs — no depende de que alguien se
 * acuerde de llamar a un chequeo aparte antes de usar este módulo.
 */

/** USD por millón de tokens. Tabla de Anthropic, junio 2026. */
export const PRECIOS_MODELO: Record<string, { entrada: number; salida: number }> = {
  "claude-opus-5": { entrada: 5, salida: 25 },
  // Precio de lanzamiento hasta el 2026-08-31; después pasa a 3 / 15.
  "claude-sonnet-5": { entrada: 2, salida: 10 },
  "claude-haiku-4-5": { entrada: 1, salida: 5 },
};

/** Multiplicadores de prompt caching: leer sale ~0.1x, escribir 1.25x. */
const CACHE_LECTURA = 0.1;
const CACHE_ESCRITURA = 1.25;

function tarifaDe(modelo: string) {
  const conocido = PRECIOS_MODELO[modelo];
  if (conocido) return conocido;
  // Un modelo que no conocemos se cobra al más caro que conocemos: preferimos
  // sobreestimar el gasto y frenar de más, antes que gastar de más.
  // Tomamos el máximo de entrada y salida por separado para garantizar
  // que nunca subvaloramos el costo, incluso con modelos nuevos inesperados.
  const maxEntrada = Math.max(
    ...Object.values(PRECIOS_MODELO).map((p) => p.entrada),
  );
  const maxSalida = Math.max(
    ...Object.values(PRECIOS_MODELO).map((p) => p.salida),
  );
  return { entrada: maxEntrada, salida: maxSalida };
}

export function costoDeUso(modelo: string, uso: UsoTokens): number {
  const t = tarifaDe(modelo);
  return (
    (uso.entrada / 1e6) * t.entrada +
    (uso.salida / 1e6) * t.salida +
    (uso.cacheLectura / 1e6) * t.entrada * CACHE_LECTURA +
    (uso.cacheEscritura / 1e6) * t.entrada * CACHE_ESCRITURA
  );
}

/** Medianoche de hoy en hora argentina, como instante UTC. */
function inicioDelDiaArg(ahora: Date): Date {
  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(ahora);
  // Argentina es UTC-3 todo el año.
  return new Date(`${fecha}T00:00:00-03:00`);
}

type ClienteLectura = Pick<SupabaseClient, "from">;

/**
 * Tabla canario: la fila singleton de fase-19 (`id boolean primary key
 * default true`, sembrada con `on conflict (id) do nothing`). Por
 * construcción SIEMPRE tiene exactamente 1 fila para cualquier cliente con
 * acceso real — ver el docstring largo más arriba.
 */
const TABLA_CANARIO_ADMIN = "bot_config";

/**
 * Chequeo en runtime, ruidoso a propósito: falla (lanza) si `supabase` no
 * puede ver la fila singleton de `bot_config`. Ver el docstring del módulo
 * (arriba) para el porqué completo. Puntos de diseño:
 *
 * - LANZA, no devuelve un booleano ni un `Infinity` silencioso: esto NO es
 *   un fallo transitorio de red como los que el resto de este módulo
 *   tolera devolviendo un valor por defecto seguro — es un error de
 *   despliegue/configuración (cliente equivocado, o migración no corrida)
 *   que tiene que frenar todo de forma imposible de ignorar, no degradar
 *   en silencio a "total gastado: 0".
 * - Además de lanzar, hace `console.error` del mismo mensaje: si algo río
 *   arriba llegara a tragarse la excepción, el mensaje igual queda en los
 *   logs del servidor.
 * - Se llama SOLO desde `gastoDelDia` (abajo), nunca por su cuenta: así
 *   cualquier código nuevo que use este módulo como está pensado —para
 *   aplicar el tope diario— quede cubierto automáticamente, sin depender de
 *   que quien lo integre se acuerde de invocar un chequeo aparte.
 */
export async function verificarAccesoAdmin(
  supabase: ClienteLectura,
): Promise<void> {
  const { data, error } = await supabase
    .from(TABLA_CANARIO_ADMIN)
    .select("id")
    .limit(1);

  const filas = Array.isArray(data) ? data.length : 0;
  if (error || filas === 0) {
    const detalle = error
      ? `error: ${JSON.stringify(error)}`
      : "0 filas (se esperaba exactamente 1, es una fila singleton)";
    const mensaje =
      `[bot] ACCESO ADMIN AUSENTE sobre "${TABLA_CANARIO_ADMIN}" (${detalle}). ` +
      "Las 5 tablas de fase-19 (bot_conversaciones, bot_mensajes, " +
      "bot_conocimiento, bot_pendientes, bot_config) solo son visibles con " +
      "un cliente service role (policy `for all using (public.is_admin())`" +
      " en db/schema-phase-19.sql). Con el cliente equivocado esto NO tira " +
      "error igual — RLS filtra en silencio y el tope diario de gasto queda " +
      "muerto (gastoDelDia vería 0 filas y devolvería 0 en vez de Infinity, " +
      "sin techo real). Usá createServiceRoleClient() de " +
      "lib/supabase/admin.ts para todo lo que lea o escriba estas tablas, y " +
      "confirmá que se corrió db/schema-phase-19.sql.";
    console.error(mensaje);
    throw new Error(mensaje);
  }
}

/**
 * Gasto acumulado del día. Devuelve Infinity si no se puede calcular: sin
 * saber cuánto llevamos gastado, el bot no debe seguir contestando.
 *
 * Antes de leer nada, verifica que el cliente tenga acceso admin real (ver
 * `verificarAccesoAdmin` y el docstring del módulo) — si no lo tiene, esta
 * función LANZA en vez de devolver un número: la ambigüedad "0 filas
 * legítimas" vs "0 filas por RLS" no se puede resolver mirando solo
 * `bot_mensajes`, así que hace falta el canario aparte.
 */
export async function gastoDelDia(
  supabase: ClienteLectura,
  ahora: Date = new Date(),
): Promise<number> {
  await verificarAccesoAdmin(supabase);

  const desde = inicioDelDiaArg(ahora).toISOString();
  const { data, error } = await supabase
    .from("bot_mensajes")
    .select("costo_usd")
    .gte("created_at", desde);

  if (error || !data) return Number.POSITIVE_INFINITY;

  return (data as { costo_usd: string | number | null }[]).reduce(
    (acc, f) => acc + Number(f.costo_usd ?? 0),
    0,
  );
}

// --- Aplicación de los topes --------------------------------------------

export type Freno =
  | { frenar: false }
  | {
      frenar: true;
      motivo: string;
      /**
       * true = apagar el bot para TODOS los canales (se alcanzó el techo de
       * gasto). false = solo escalar esta conversación; las demás siguen
       * atendidas.
       */
      apagarBot: boolean;
    };

/**
 * Única fuente de verdad sobre si el bot puede contestar. La llama el
 * adaptador antes de gastar una inferencia — no el motor, que no debería
 * saber de políticas de negocio.
 */
export function debeFrenar(
  config: BotConfig,
  estado: { gastoHoy: number; mensajesDelBot: number },
): Freno {
  if (!config.encendido) {
    return { frenar: true, motivo: "El bot está apagado", apagarBot: false };
  }

  // Infinity llega cuando no se pudo leer el gasto. Sin saber cuánto va
  // gastado, no se sigue.
  if (!Number.isFinite(estado.gastoHoy)) {
    return {
      frenar: true,
      motivo: "No se pudo calcular el gasto del día",
      apagarBot: true,
    };
  }

  // Defensa en profundidad: getBotConfig ya garantiza un tope finito y
  // positivo, pero si alguna vez dejara pasar un NaN, la comparación de abajo
  // sería siempre falsa y el tope fallaría ABIERTO. Un límite de seguridad
  // tiene que fallar cerrado.
  if (!Number.isFinite(config.topeDiarioUsd) || config.topeDiarioUsd <= 0) {
    return {
      frenar: true,
      motivo: "El tope diario configurado no es un número válido",
      apagarBot: true,
    };
  }

  if (estado.gastoHoy >= config.topeDiarioUsd) {
    return {
      frenar: true,
      motivo: `Se alcanzó el tope diario de USD ${config.topeDiarioUsd}`,
      apagarBot: true,
    };
  }

  // Defensa en profundidad: maxMensajesConversacion debe ser un entero >= 1.
  // Si es NaN, 0, negativo, o no entero, con la comparación fallaría abierto.
  if (
    !Number.isFinite(config.maxMensajesConversacion) ||
    config.maxMensajesConversacion < 1 ||
    !Number.isInteger(config.maxMensajesConversacion)
  ) {
    return {
      frenar: true,
      motivo: "El máximo de mensajes configurado no es un número válido",
      apagarBot: true,
    };
  }

  // mensajesDelBot debe ser un número finito >= 0. NaN aquí también
  // hace fallar abierto la comparación de abajo.
  if (!Number.isFinite(estado.mensajesDelBot) || estado.mensajesDelBot < 0) {
    return {
      frenar: true,
      motivo: "El contador de mensajes no es un número válido",
      apagarBot: true,
    };
  }

  if (estado.mensajesDelBot >= config.maxMensajesConversacion) {
    return {
      frenar: true,
      motivo: "La conversación dio demasiadas vueltas sin resolverse",
      apagarBot: false,
    };
  }

  return { frenar: false };
}
