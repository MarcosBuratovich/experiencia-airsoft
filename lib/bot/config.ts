import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Configuración del asistente. Vive en una fila única de `bot_config` para
 * que el dueño pueda apagarlo o cambiar el modelo sin un deploy.
 */
export type BotConfig = {
  encendido: boolean;
  modelo: string;
  topeDiarioUsd: number;
  maxMensajesConversacion: number;
};

/**
 * Apagado por defecto: si la tabla no existe o falla la lectura, el bot no
 * contesta. Preferimos silencio a una respuesta con configuración incierta.
 */
export const CONFIG_DEFAULT: BotConfig = {
  encendido: false,
  modelo: "claude-sonnet-5",
  topeDiarioUsd: 3,
  maxMensajesConversacion: 8,
};

type ClienteLectura = Pick<SupabaseClient, "from">;

export async function getBotConfig(
  supabase: ClienteLectura,
): Promise<BotConfig> {
  const { data, error } = await supabase
    .from("bot_config")
    .select("encendido, modelo, tope_diario_usd, max_mensajes_conversacion")
    .maybeSingle();

  if (error || !data) return { ...CONFIG_DEFAULT };

  const fila = data as Record<string, unknown>;
  return {
    encendido:
      typeof fila.encendido === "boolean"
        ? fila.encendido
        : CONFIG_DEFAULT.encendido,
    modelo:
      typeof fila.modelo === "string" && fila.modelo
        ? fila.modelo
        : CONFIG_DEFAULT.modelo,
    // numeric de Postgres llega como string por el driver.
    topeDiarioUsd:
      fila.tope_diario_usd != null
        ? Number(fila.tope_diario_usd)
        : CONFIG_DEFAULT.topeDiarioUsd,
    maxMensajesConversacion:
      typeof fila.max_mensajes_conversacion === "number"
        ? fila.max_mensajes_conversacion
        : CONFIG_DEFAULT.maxMensajesConversacion,
  };
}
