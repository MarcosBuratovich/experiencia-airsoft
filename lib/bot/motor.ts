import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ESQUEMAS_HERRAMIENTAS, ejecutarHerramienta } from "./herramientas";
import { ESQUEMA_RESPONDER, construirSistema } from "./prompt";
import {
  esClasificacionValida,
  USO_CERO,
  type Clasificacion,
  type MensajeBot,
  type RespuestaBot,
  type UsoTokens,
} from "./tipos";

/**
 * El motor: recibe un historial y devuelve una respuesta ya decidida.
 *
 * No sabe de canales ni de Meta — eso es de los adaptadores. Tampoco escribe
 * en la base: quien lo llama decide qué persistir. Así se puede probar
 * entero sin red y sin Supabase.
 */

export type DepsMotor = {
  anthropic: Anthropic;
  supabase: SupabaseClient;
  modelo: string;
  /** Cuántas vueltas de herramienta se toleran antes de escalar. */
  maxVueltas?: number;
  ahora?: Date;
};

export type EntradaMotor = {
  historial: MensajeBot[];
  conocimiento: string;
};

const MAX_VUELTAS_DEFAULT = 6;
const MAX_TOKENS = 700;

/** Clasificación de descarte cuando no hay una válida del modelo. */
const CLASIF_DESCONOCIDA: Clasificacion = {
  intencion: "otro",
  grupo_tam: null,
  fecha_tentativa: null,
  duda_principal: "otro",
  primera_vez: "desconocido",
};

/**
 * Escalada por falla técnica: sin texto. Un mensaje de error nunca llega al
 * cliente — se calla y avisa en el panel.
 */
function escalarEnSilencio(
  motivo: string,
  resumen: string,
  uso: UsoTokens,
  clasificacion: Clasificacion = CLASIF_DESCONOCIDA,
): RespuestaBot {
  return { tipo: "escalar", texto: null, motivo, resumen, clasificacion, uso };
}

function sumarUso(acc: UsoTokens, usage: unknown): UsoTokens {
  const u = (usage ?? {}) as Record<string, number | undefined>;
  return {
    entrada: acc.entrada + (u.input_tokens ?? 0),
    salida: acc.salida + (u.output_tokens ?? 0),
    cacheLectura: acc.cacheLectura + (u.cache_read_input_tokens ?? 0),
    cacheEscritura: acc.cacheEscritura + (u.cache_creation_input_tokens ?? 0),
  };
}

/** El historial interno traducido al formato de la API. */
function aMensajesApi(historial: MensajeBot[]): Anthropic.MessageParam[] {
  return historial.map((m) => ({
    // Lo que escribió el dueño a mano cuenta como turno del asistente: es
    // parte de lo ya dicho, y el bot no debe repetirlo.
    role: m.rol === "usuario" ? ("user" as const) : ("assistant" as const),
    content: m.texto,
  }));
}

export async function generarRespuesta(
  deps: DepsMotor,
  entrada: EntradaMotor,
): Promise<RespuestaBot> {
  const maxVueltas = deps.maxVueltas ?? MAX_VUELTAS_DEFAULT;
  const sistema = construirSistema(entrada.conocimiento);
  const mensajes: Anthropic.MessageParam[] = aMensajesApi(entrada.historial);
  let uso: UsoTokens = { ...USO_CERO };

  for (let vuelta = 0; vuelta <= maxVueltas; vuelta++) {
    let respuesta: Anthropic.Message;
    try {
      respuesta = await llamarConUnReintento(deps, sistema, mensajes);
    } catch (err) {
      console.error("[bot] la API falló dos veces:", err);
      return escalarEnSilencio(
        "Falla técnica de la API",
        "No se pudo generar una respuesta. La consulta quedó sin contestar.",
        uso,
      );
    }

    uso = sumarUso(uso, respuesta.usage);

    const bloques = (respuesta.content ?? []) as Anthropic.ContentBlock[];
    const usos = bloques.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    // ¿Llamó a responder? Ahí termina.
    const final = usos.find((u) => u.name === "responder");
    if (final) return interpretarRespuesta(final.input, uso);

    if (!usos.length) {
      // Contestó texto suelto en vez de usar la herramienta. No mandamos eso
      // al cliente: no pasó por las reglas de formato ni trae clasificación.
      return escalarEnSilencio(
        "El modelo no usó la herramienta de respuesta",
        "Respuesta descartada por formato. La consulta quedó sin contestar.",
        uso,
      );
    }

    // Ejecutar las herramientas pedidas y seguir la conversación.
    mensajes.push({ role: "assistant", content: bloques });
    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const u of usos) {
      const r = await ejecutarHerramienta(
        deps.supabase,
        u.name,
        (u.input ?? {}) as Record<string, unknown>,
        deps.ahora,
      );
      resultados.push({
        type: "tool_result",
        tool_use_id: u.id,
        content: r.ok ? JSON.stringify(r.datos) : r.error,
        is_error: !r.ok,
      });
    }
    mensajes.push({ role: "user", content: resultados });
  }

  return escalarEnSilencio(
    "Se agotaron las vueltas de herramientas",
    "El asistente dio muchas vueltas sin llegar a una respuesta.",
    uso,
  );
}

async function llamarConUnReintento(
  deps: DepsMotor,
  sistema: Anthropic.TextBlockParam[],
  mensajes: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
  try {
    return await deps.anthropic.messages.create({
      model: deps.modelo,
      max_tokens: MAX_TOKENS,
      system: sistema,
      tools: [...ESQUEMAS_HERRAMIENTAS, ESQUEMA_RESPONDER],
      messages: mensajes,
    });
  } catch (primera) {
    console.warn("[bot] reintentando tras fallo de la API:", primera);
    return await deps.anthropic.messages.create({
      model: deps.modelo,
      max_tokens: MAX_TOKENS,
      system: sistema,
      tools: [...ESQUEMAS_HERRAMIENTAS, ESQUEMA_RESPONDER],
      messages: mensajes,
    });
  }
}

function interpretarRespuesta(input: unknown, uso: UsoTokens): RespuestaBot {
  const o = (input ?? {}) as Record<string, unknown>;
  const texto = typeof o.texto === "string" ? o.texto.trim() : "";

  if (!esClasificacionValida(o.clasificacion)) {
    // La clasificación alimenta el tablero y los eventos a Meta. Si vino mal,
    // no confiamos tampoco en el resto de la respuesta.
    return escalarEnSilencio(
      "Clasificación inválida",
      "El asistente devolvió una clasificación que no se pudo interpretar.",
      uso,
    );
  }
  const clasificacion = o.clasificacion;

  if (!texto) {
    return escalarEnSilencio(
      "Respuesta vacía",
      "El asistente no produjo texto para enviar.",
      uso,
      clasificacion,
    );
  }

  if (o.escalar === true) {
    return {
      tipo: "escalar",
      // Escalada por política (cumpleaños, descuento, reclamo): sí se manda
      // la despedida. Distinto de escalarEnSilencio, que es por falla.
      texto,
      motivo: typeof o.motivo === "string" && o.motivo ? o.motivo : "Sin motivo",
      resumen:
        typeof o.resumen === "string" && o.resumen
          ? o.resumen
          : "El asistente escaló sin dejar resumen.",
      clasificacion,
      uso,
    };
  }

  return { tipo: "responder", texto, clasificacion, uso };
}
