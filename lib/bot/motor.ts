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
  /**
   * Cuántas vueltas de herramienta se tolera dar antes de escalar. El motor
   * intenta como máximo maxVueltas + 1 veces en total (incluye el intento
   * final con la vuelta 0) — ver el `<=` en el for de generarRespuesta.
   */
  maxVueltas?: number;
  /** Techo de tokens de salida por llamada a la API. */
  maxTokens?: number;
  ahora?: Date;
};

export type EntradaMotor = {
  historial: MensajeBot[];
  conocimiento: string;
};

const MAX_VUELTAS_DEFAULT = 6;

// Holgado a propósito: el texto (2-3 líneas) más el JSON completo de
// "responder" (motivo + resumen de escalada + clasificación de 5 campos) ya
// come varios cientos de tokens. Con thinking desactivado no hay presupuesto
// de razonamiento que compita por el mismo techo, así que subir esto no
// agrega costo real en el caso normal (el costo depende de lo que el modelo
// genera, no del techo) — solo evita el corte en el caso más verboso.
const MAX_TOKENS_DEFAULT = 1536;

// Sin razonamiento extendido a propósito: para 2-3 líneas de chat con datos
// ya resueltos por herramienta, "pensar" solo agrega latencia y costo que acá
// no queremos. Mandarlo explícito evita quedar a merced del comportamiento
// adaptativo por defecto del modelo, que comparte techo con max_tokens y
// puede cortar la llamada a "responder" a mitad de camino (B-1/B-2).
const THINKING_DESACTIVADO: Anthropic.ThinkingConfigParam = { type: "disabled" };

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
  // SIEMPRE una copia nueva: CLASIF_DESCONOCIDA es una constante compartida
  // por todo el módulo. Si se devolviera por referencia, quien reciba esta
  // RespuestaBot y mute su `clasificacion` (a mano, o en un test) contaminaría
  // la próxima llamada que caiga en este mismo default. Mismo criterio que
  // `{ ...USO_CERO }` más abajo.
  clasificacion: Clasificacion = { ...CLASIF_DESCONOCIDA },
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

/**
 * Valida y limpia la forma del historial ANTES de gastar una llamada a la
 * API. La API de Anthropic exige que el primer mensaje sea de rol "user" y
 * rechaza bloques de texto vacíos; y si no queda un turno de cliente al
 * final (p.ej. el dueño contestó a mano y recién ahora se reactiva el bot)
 * no hay nada nuevo que responder — inventar una respuesta ahí sería
 * contestarle a la nada. `null` cuando no queda nada válido para pedirle al
 * modelo: así se evita el 400 (y el reintento que le sigue) del todo, sin
 * gastar inferencia en una llamada condenada de antemano.
 */
function historialUtilizable(historial: MensajeBot[]): MensajeBot[] | null {
  const conTexto = historial.filter((m) => m.texto.trim().length > 0);
  if (!conTexto.length) return null;
  if (conTexto[0].rol !== "usuario") return null;
  if (conTexto[conTexto.length - 1].rol !== "usuario") return null;
  return conTexto;
}

/**
 * Entero >= mínimo, o el default si lo que vino no sirve. Cubre NaN a
 * propósito: `Number.isInteger(NaN)` es false, así que nunca se cuela (a
 * diferencia de `v ?? default`, que deja pasar NaN porque no es
 * null/undefined y después hace fallar todas las comparaciones `<=`/`>=`
 * silenciosamente en false).
 */
function enteroValido(
  v: number | undefined,
  minimo: number,
  porDefecto: number,
): number {
  if (v === undefined) return porDefecto;
  return Number.isInteger(v) && v >= minimo ? v : porDefecto;
}

export async function generarRespuesta(
  deps: DepsMotor,
  entrada: EntradaMotor,
): Promise<RespuestaBot> {
  const historial = historialUtilizable(entrada.historial);
  if (!historial) {
    return escalarEnSilencio(
      "El historial no tiene un turno de cliente pendiente de responder",
      "No hay un mensaje nuevo del cliente para contestar todavía.",
      { ...USO_CERO },
    );
  }

  const maxVueltas = enteroValido(deps.maxVueltas, 0, MAX_VUELTAS_DEFAULT);
  const maxTokens = enteroValido(deps.maxTokens, 1, MAX_TOKENS_DEFAULT);
  const sistema = construirSistema(entrada.conocimiento);
  const mensajes: Anthropic.MessageParam[] = aMensajesApi(historial);
  let uso: UsoTokens = { ...USO_CERO };

  for (let vuelta = 0; vuelta <= maxVueltas; vuelta++) {
    let respuesta: Anthropic.Message;
    try {
      respuesta = await llamarConUnReintento(deps, sistema, mensajes, maxTokens);
    } catch (err) {
      console.error("[bot] la API falló dos veces:", err);
      return escalarEnSilencio(
        "Falla técnica de la API",
        "No se pudo generar una respuesta. La consulta quedó sin contestar.",
        uso,
      );
    }

    uso = sumarUso(uso, respuesta.usage);

    if (respuesta.stop_reason === "max_tokens") {
      // El turno se cortó a mitad de camino: cualquier texto o tool_use que
      // haya en `content` puede venir truncado (un "sale $18.000 y el
      // alquiler sa" a medio terminar, ya visto en revisión). Una respuesta
      // a medias es peor que ninguna — no se interpreta ese contenido, se
      // escala en silencio directamente sin mirar `content`.
      return escalarEnSilencio(
        "La respuesta del modelo se cortó por límite de tokens",
        "El modelo no terminó de responder a tiempo. La consulta quedó sin contestar.",
        uso,
      );
    }

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
  maxTokens: number,
): Promise<Anthropic.Message> {
  // Un solo objeto para las dos ramas: así no se puede editar una sin la
  // otra (B-6) — antes eran dos literales duplicados a mano.
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: deps.modelo,
    max_tokens: maxTokens,
    system: sistema,
    tools: [...ESQUEMAS_HERRAMIENTAS, ESQUEMA_RESPONDER],
    messages: mensajes,
    thinking: THINKING_DESACTIVADO,
  };
  try {
    return await deps.anthropic.messages.create(params);
  } catch (primera) {
    console.warn("[bot] reintentando tras fallo de la API:", primera);
    return await deps.anthropic.messages.create(params);
  }
}

function interpretarRespuesta(input: unknown, uso: UsoTokens): RespuestaBot {
  const o = (input ?? {}) as Record<string, unknown>;
  const texto = typeof o.texto === "string" ? o.texto.trim() : "";

  let clasificacionValida: boolean;
  let clasificacion: Clasificacion;
  if (esClasificacionValida(o.clasificacion)) {
    clasificacionValida = true;
    clasificacion = o.clasificacion;
  } else {
    clasificacionValida = false;
    clasificacion = { ...CLASIF_DESCONOCIDA };
  }

  if (o.escalar === true) {
    // Escalada de política (privadas/cumpleaños, descuento, reclamo, pedido
    // explícito de humano, seguridad, "no sé"/muchas vueltas, malos tratos):
    // si el modelo ya se despidió con un texto usable, se lo mandamos igual
    // aunque la clasificación haya venido mal (B-11). Perder la despedida
    // por un campo que ni siquiera lee el cliente es peor que dejar el
    // tablero sin ese dato puntual — acá sí importa más no dejar a la
    // persona esperando una respuesta que nunca llega.
    if (!texto) {
      return escalarEnSilencio(
        "Respuesta vacía",
        "El asistente no produjo texto para enviar.",
        uso,
        clasificacion,
      );
    }
    return {
      tipo: "escalar",
      // Escalada por política: sí se manda la despedida. Distinto de
      // escalarEnSilencio, que es por falla.
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

  // Camino normal (no escalar): acá sí exigimos clasificación válida — es
  // la única señal de que el resto de la respuesta (el texto que se manda
  // tal cual al cliente) también es confiable.
  if (!clasificacionValida) {
    return escalarEnSilencio(
      "Clasificación inválida",
      "El asistente devolvió una clasificación que no se pudo interpretar.",
      uso,
    );
  }

  if (!texto) {
    return escalarEnSilencio(
      "Respuesta vacía",
      "El asistente no produjo texto para enviar.",
      uso,
      clasificacion,
    );
  }

  return { tipo: "responder", texto, clasificacion, uso };
}
