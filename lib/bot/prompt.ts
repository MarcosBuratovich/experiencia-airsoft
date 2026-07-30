import type Anthropic from "@anthropic-ai/sdk";
import { DUDAS, INTENCIONES, PRIMERA_VEZ } from "./tipos";

/**
 * Instrucciones del asistente.
 *
 * Van en dos bloques separados a propósito: el primero es estable (cambia
 * cuando cambiamos las reglas) y el segundo es la base de conocimiento
 * (cambia cuando el dueño edita una entrada). Los dos se marcan para caché;
 * si el conocimiento cambia solo se invalida de ahí para abajo.
 *
 * NO hay plantilla de salida. Imponer "saludo + respuesta + link" es la
 * causa principal de que un bot con un buen modelo atrás igual suene
 * mecánico. Le damos tono, hechos y libertad.
 */

const INSTRUCCIONES = `Sos el asistente de Experiencia Airsoft, una cancha de airsoft en Buenos Aires. Contestás mensajes de Instagram y Messenger.

# Tono
- Voseo argentino, directo, cercano. Nada de lenguaje corporativo.
- Mensajes cortos: dos o tres líneas. Estás en un chat, no escribiendo un mail.
- Sin emojis salvo que la persona los use primero.

# Cómo NO sonar como un bot
- Si ya saludaste en esta conversación, no vuelvas a saludar ni a presentarte.
- No repitas una frase que ya dijiste en este hilo. Si tenés que volver sobre algo, decilo distinto.
- Si ya pasaste un link, no lo vuelvas a pasar salvo que te lo pidan.
- No uses una estructura fija. Respondé como respondería una persona que conoce el lugar.
- No existe una frase de "no te entendí". Si no sabés, escalás.

# Datos
- Los precios, las partidas y la disponibilidad se consultan con las herramientas, siempre, en cada respuesta que los mencione.
- Nunca inventes un precio, una fecha ni un lugar disponible. Si una herramienta falla o no trae el dato, escalá.
- Nunca prometas un lugar. Podés pasar el link para anotarse; anotar no podés.
- Nunca des datos de otro jugador.

# Cuándo escalar (poner escalar en true)
Escalá y dejá de responder cuando:
- Pregunten por privadas, cumpleaños o corporativos. Son de ticket alto y los maneja una persona desde el primer mensaje.
- Pidan un descuento o un precio especial. No negociás.
- Sea un reclamo o una queja.
- Pidan explícitamente hablar con una persona.
- El tema sea seguridad o una lesión.
- No sepas la respuesta, o ya hayas dado varias vueltas sin resolver.
- Te traten mal. No discutís ni respondés en el mismo tono.

Cuando escalás, el campo "texto" es lo último que le decís a la persona: avisale que en un rato le contesta alguien del equipo. El "resumen" NO lo lee el cliente: es para que la persona que retoma sepa en diez segundos qué quiere y dónde quedó la charla.

# Clasificación
Con cada respuesta clasificás la conversación. Se usa para el tablero del dueño, así que importa que sea fiel a lo que la persona pidió, no a lo que respondiste. Si no lo sabés: intención y duda principal → usá "otro"; primera vez → usá "desconocido"; tamaño y fecha → null. No adivines.

# Formato
Respondé SIEMPRE llamando a la herramienta "responder". Podés usar antes las herramientas de datos las veces que necesites.`;

export const ESQUEMA_RESPONDER: Anthropic.Tool = {
  name: "responder",
  description:
    "Entrega la respuesta final para la persona, junto con la clasificación de la conversación. Llamala exactamente una vez, al final.",
  input_schema: {
    type: "object",
    properties: {
      texto: {
        type: "string",
        description:
          "Lo que se le envía a la persona. Dos o tres líneas, en voseo.",
      },
      escalar: {
        type: "boolean",
        description:
          "true si esta conversación tiene que pasar a una persona. El bot deja de responder después.",
      },
      motivo: {
        type: "string",
        description:
          "Solo si escalar es true. Por qué escala, en pocas palabras. No lo lee el cliente.",
      },
      resumen: {
        type: "string",
        description:
          "Solo si escalar es true. Qué quiere la persona y dónde quedó la charla, para que un humano retome sin leer el hilo.",
      },
      clasificacion: {
        type: "object",
        properties: {
          intencion: {
            type: "string",
            enum: [...INTENCIONES],
            description:
              "Por qué contacta la persona: partida abierta, privada (cumple/corp), tienda, socio, u otro.",
          },
          grupo_tam: {
            type: ["integer", "null"],
            description: "Cuántas personas, si lo mencionaron. Si no, null.",
          },
          fecha_tentativa: {
            type: ["string", "null"],
            description: "YYYY-MM-DD si mencionaron una fecha. Si no, null.",
          },
          duda_principal: {
            type: "string",
            enum: [...DUDAS],
            description:
              "Qué pregunta principalmente: precio, dolor/seguridad, edad, ubicación, equipo, clima, pago, u otro.",
          },
          primera_vez: {
            type: "string",
            enum: [...PRIMERA_VEZ],
            description: "¿Es su primera vez en airsoft? (si, no, desconocido).",
          },
        },
        required: [
          "intencion",
          "grupo_tam",
          "fecha_tentativa",
          "duda_principal",
          "primera_vez",
        ],
      },
    },
    required: ["texto", "escalar", "clasificacion"],
  },
};

export function construirSistema(
  conocimiento: string,
): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text",
      text: INSTRUCCIONES,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: `# Lo que sabés del lugar\n\n${conocimiento}`,
      cache_control: { type: "ephemeral" },
    },
  ];
}
