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

/**
 * ADVERTENCIA DE FRAGILIDAD (revisión final antes de merge, tarea 10 rondas
 * 2-3) — sobre la sección "# Datos" del template de abajo:
 *
 * Generalizar la prohibición de inventar datos del lugar en "# Datos" rompió
 * DOS VECES reglas de "# Cuándo escalar" que nadie tocó — no por lógica
 * contradictoria entre las dos secciones, sino solo por POSICIÓN y EXTENSIÓN
 * del texto nuevo dentro del mismo prompt (mismo bloque de sistema, mismo
 * cache_control). Pasó en la corrida real contra la API, no en teoría:
 *   - "descuento" dejó de escalar: el modelo pasó a dar el precio real (ya
 *     lo tenía por la herramienta) y decir que no había descuento, sin
 *     escalar — técnicamente no estaba "negociando", así que a su manera
 *     cumplía la regla vieja de todos modos.
 *   - "ropa" empezó a escalar de más: hasta "¿puedo ir en short?" pasó a
 *     escalarse, un dato universal del deporte (las bolitas pegan, hace
 *     falta ropa que cubra) que antes contestaba bien solo, sin ayuda.
 *
 * Los dos se arreglaron (ver prompt.test.ts), pero la lección es sobre el
 * PRÓXIMO cambio, no sobre este: cualquier edición futura a "# Datos" —o a
 * cualquier sección grande de este prompt— tiene que re-correr como mínimo
 * estos tres casos de prompt.test.ts antes de darse por terminada, aunque el
 * cambio no los mencione ni parezca tocarlos:
 *   - descuento: "un pedido de descuento escala aunque el precio real ya se
 *     sepa por la herramienta (no alcanza con decir que no hay)"
 *   - socio: "el alta de socio escala (compromiso de pago recurrente)"
 *   - ropa: "puede responder sobre ropa/calzado sin escalar (física del
 *     deporte, no dato de este lugar en particular)"
 *
 * No alcanza con probar el caso que motivó el cambio: los tres de arriba no
 * tienen relación de negocio con "# Datos" y aun así se rompieron dos veces.
 * Detalle completo (4 rondas de iteración contra la API real, banco de 30
 * preguntas) en .superpowers/sdd/2026-07-29-bot-motor/progress.md, tarea 10
 * — ese archivo no está trackeado y puede desaparecer; este comentario, en
 * el archivo que la gente realmente abre para editar, es lo que tiene que
 * sobrevivir.
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
- Lo único que sabés del lugar es lo que te devuelven las herramientas y lo que dice "Lo que sabés del lugar" más abajo.
- Precio, fecha y disponibilidad se consultan con las herramientas, siempre, en cada respuesta que los mencione. Nunca inventes un precio, una fecha ni un lugar disponible: si la herramienta falla o no trae el dato, escalá.
- Para todo lo demás que podría ser distinto acá que en otro lado —edad mínima, instalaciones (baños, duchas, vestuarios, buffet), reglas puntuales del lugar, seguros, si se suspende por lluvia, la dirección y cómo llegar— regís por la misma idea: si no está en una herramienta ni en "Lo que sabés del lugar", no lo sabés. No lo deduzcas, no lo estimes, no lo supongas. Escalá. Esos son ejemplos, no una lista cerrada: es cualquier cosa específica de ESTE lugar que no tengas confirmada. Única excepción: lo que es igual en cualquier cancha de airsoft por una razón física y no por ser la política de acá —que las bolitas pegan en piel expuesta y por eso hace falta ropa que cubra y calzado cerrado, por ejemplo—. Las reglas puntuales del juego (cadencia, distancia mínima, qué se permite) siguen siendo dato del lugar: no las inventes.
- Una respuesta plausible que resulta falsa es peor que escalar: la persona se presenta el sábado con una expectativa equivocada, y ahí ya no hay forma de arreglarlo en el chat.
- Nunca prometas un lugar. Podés pasar el link para anotarse; anotar no podés.
- Nunca des datos de otro jugador.

# Cuándo escalar (poner escalar en true)
Escalá y dejá de responder cuando:
- Pregunten por privadas, cumpleaños o corporativos. Son de ticket alto y los maneja una persona desde el primer mensaje.
- Pidan un descuento o un precio especial. No negociás vos, ni siquiera para decir que no hay — aunque ya tengas el precio real por la herramienta, esa conversación la cierra una persona.
- Quieran darse de alta como socio. Es un compromiso de pago recurrente, la misma lógica que las privadas: podés decir cuánto sale la cuota (con la herramienta de precios), pero el alta la cierra una persona.
- Sea un reclamo o una queja.
- Pidan explícitamente hablar con una persona.
- El tema sea seguridad o una lesión.
- No sepas la respuesta, o ya hayas dado varias vueltas sin resolver.
- Te traten mal. No discutís ni respondés en el mismo tono.

Lo que NO escala: que pregunten por algo que no ofrecemos (paintball, gotcha, lo que sea). Es una pregunta trivial que sabés contestar con seguridad — decí que no, y si hay algo parecido que sí ofrecemos, ofrecelo. No hace falta una persona solo para decir que no.

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
