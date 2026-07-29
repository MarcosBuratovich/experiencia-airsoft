/**
 * Tipos compartidos del asistente. Sin lógica pesada ni imports de
 * Supabase/Anthropic: lo importa tanto el motor como las pantallas de admin.
 */

export const CANALES = [
  "instagram",
  "messenger",
  "comentario",
  "prueba",
] as const;
export type CanalBot = (typeof CANALES)[number];

export type RolMensaje = "usuario" | "bot" | "humano";

export type MensajeBot = {
  rol: RolMensaje;
  texto: string;
  /** ISO 8601. */
  creado_at: string;
};

// --- Segmentación -------------------------------------------------------

export const INTENCIONES = [
  "partida_abierta",
  "privada_cumple",
  "privada_corp",
  "tienda",
  "socio",
  "otro",
] as const;
export type Intencion = (typeof INTENCIONES)[number];

export const DUDAS = [
  "precio",
  "dolor",
  "edad",
  "ubicacion",
  "equipo",
  "clima",
  "pago",
  "otro",
] as const;
export type DudaPrincipal = (typeof DUDAS)[number];

export const PRIMERA_VEZ = ["si", "no", "desconocido"] as const;
export type PrimeraVez = (typeof PRIMERA_VEZ)[number];

export type Clasificacion = {
  intencion: Intencion;
  /** Cuántos son, si lo mencionan. */
  grupo_tam: number | null;
  /** 'YYYY-MM-DD' si mencionan una fecha concreta. */
  fecha_tentativa: string | null;
  duda_principal: DudaPrincipal;
  primera_vez: PrimeraVez;
};

/** Tope defensivo: más que esto es el modelo alucinando, no un grupo real. */
const GRUPO_MAX = 500;

export function esClasificacionValida(c: unknown): c is Clasificacion {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;

  if (!INTENCIONES.includes(o.intencion as Intencion)) return false;
  if (!DUDAS.includes(o.duda_principal as DudaPrincipal)) return false;
  if (!PRIMERA_VEZ.includes(o.primera_vez as PrimeraVez)) return false;

  if (o.grupo_tam !== null) {
    if (typeof o.grupo_tam !== "number" || !Number.isInteger(o.grupo_tam)) {
      return false;
    }
    if (o.grupo_tam < 1 || o.grupo_tam > GRUPO_MAX) return false;
  }

  if (o.fecha_tentativa !== null) {
    if (typeof o.fecha_tentativa !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.fecha_tentativa)) return false;
  }

  return true;
}

// --- Uso y respuesta ----------------------------------------------------

export type UsoTokens = {
  entrada: number;
  salida: number;
  cacheLectura: number;
  cacheEscritura: number;
};

export const USO_CERO: UsoTokens = {
  entrada: 0,
  salida: 0,
  cacheLectura: 0,
  cacheEscritura: 0,
};

export type RespuestaBot =
  | {
      tipo: "responder";
      texto: string;
      clasificacion: Clasificacion;
      uso: UsoTokens;
    }
  | {
      tipo: "escalar";
      /**
       * Lo último que se le dice a la persona antes de que el bot enmudezca
       * ("en un rato te contesta alguien del equipo").
       *
       * null cuando la escalada es por FALLA TÉCNICA — API caída, respuesta
       * ilegible. Ahí no se manda nada: un mensaje de error nunca llega al
       * cliente. Silencio y aviso en el panel.
       */
      texto: string | null;
      /** Por qué escaló. Va al panel, no al cliente. */
      motivo: string;
      /** Resumen para que el humano retome sin leer el hilo. */
      resumen: string;
      clasificacion: Clasificacion;
      uso: UsoTokens;
    };
