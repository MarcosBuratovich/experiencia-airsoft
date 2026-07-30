import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsoTokens } from "./tipos";
import type { BotConfig } from "./config";

/**
 * Control de gasto. El daño máximo de cualquier descontrol —un loop, una
 * campaña que dispara mensajes, un error nuestro— tiene que ser un número
 * definido de antemano.
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
 * Gasto acumulado del día. Devuelve Infinity si no se puede calcular: sin
 * saber cuánto llevamos gastado, el bot no debe seguir contestando.
 */
export async function gastoDelDia(
  supabase: ClienteLectura,
  ahora: Date = new Date(),
): Promise<number> {
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
