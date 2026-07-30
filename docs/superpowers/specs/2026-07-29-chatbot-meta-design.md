# Chatbot de atención en canales de Meta — Diseño

**Fecha:** 2026-07-29
**Estado:** aprobado por el dueño del producto (Marcos), pendiente de plan de implementación.
**Revisión 2 (2026-07-29):** incorpora la devolución del cliente final —
segmentación de contactos, reglas anti-repetición y la decisión sobre Kommo.

## Problema

Toda la conversión del negocio pasa por mensajería: los CTAs de www empujan a
WhatsApp, las solicitudes de privadas terminan en un chat, y el checkout de la
tienda es un handoff a WhatsApp. Hoy esas conversaciones las contesta una
persona, a mano, cuando puede.

Objetivos declarados, en orden:

1. **Sacarse de encima lo repetitivo** — precios, horarios, qué llevar, edad
   mínima, cómo llegar.
2. **No perder leads** — que ningún mensaje quede sin respuesta.
3. **Responder rápido, 24/7** — un lead que espera se enfría o se va a otra
   cancha.

Explícitamente **fuera de alcance**: que el bot cierre reservas por su cuenta.

## Alcance de esta fase

**Canales:** Instagram DM, comentarios de Instagram/Facebook y Messenger.
**WhatsApp queda para la fase 2**, por dos razones: la bandeja humana de los
otros tres canales ya existe (Business Suite), y mover el número de WhatsApp a
la API tiene consecuencias operativas que hay que resolver aparte.

**Autonomía:** el bot responde con confianza lo que sabe y escala cuando duda o
cuando la conversación se vuelve comercial.

## Arquitectura

Un solo motor de conversación, con adaptadores por canal:

```
Instagram DM  ─┐
Comentarios   ─┤→ [Adaptador] → [ MOTOR ] → [Adaptador] → respuesta
Messenger     ─┤                    ↕
(WhatsApp)    ─┘             datos reales (Supabase)
```

Los adaptadores normalizan el formato de cada canal a un mensaje interno
genérico. El motor no sabe por qué canal entró la consulta, así que sumar
WhatsApp es un adaptador nuevo sin tocar la lógica.

**Ubicación:** repo `airsoft-app`. Es donde están partidas, precios y socios —
los datos que hacen útil al bot. La tienda puede sumarse después como una
herramienta más.

### Recorrido de un mensaje

1. Llega a `/api/meta/webhook`. Se **verifica la firma HMAC** de Meta; si no
   valida, se descarta.
2. Se persiste el mensaje y se responde **200 inmediatamente**. Meta corta la
   conexión si tardamos, y la inferencia lleva segundos.
3. El procesamiento sigue en segundo plano: se arma el contexto, se consulta el
   modelo, el modelo usa herramientas si necesita datos, y devuelve la
   respuesta.
4. Se envía por el mismo canal de entrada.
5. Queda registrada para el contexto del próximo mensaje y para supervisión.

### Decisiones de arquitectura

- **El historial se persiste de nuestro lado.** Meta entrega mensajes sueltos,
  sin hilo. Sin persistencia el bot no tiene memoria dentro de una misma charla.
- **Los datos del negocio nunca están en el prompt como hechos memorizados.** Se
  consultan por herramienta en cada uso. Un cambio de precio en `/admin/precios`
  aplica en el mensaje siguiente, sin sincronización.
- **Al escalar, el bot enmudece en esa conversación** hasta reactivación.
- **Filtro de eco.** Meta reenvía los mensajes salientes propios como eventos
  entrantes. Sin filtrarlo el bot se responde a sí mismo en loop, con costo por
  vuelta.

## Control manual — cómo se frena el bot

Cuatro mecanismos, del más automático al más contundente:

1. **Detección de intervención humana** (el principal). Si el dueño responde
   desde Instagram/Business Suite, el evento saliente nos llega y **el bot se
   silencia solo** en esa conversación. No requiere que se acuerde de apagar
   nada.
2. **Interruptor por conversación** en el panel: *Bot activo / Contesto yo*.
   Para silenciarlo antes de escribir.
3. **Escalado automático** por las reglas de abajo.
4. **Interruptor general**: apaga el bot para todos los canales.

**Reactivación:** una conversación tomada por un humano no vuelve al bot sola —
interrumpir una negociación en curso sería peor que el problema que resuelve.
Vuelve por interruptor manual, o automáticamente tras un período largo de
inactividad (propuesto: 24 hs) para que una consulta vieja no quede bloqueada.

## Conocimiento del bot

### Datos en vivo (herramientas, solo lectura)

| Herramienta | Devuelve | Fuente |
|---|---|---|
| Próximas partidas | Fecha, hora, modalidad, lugares disponibles | `partidas` + conteo de `inscripciones` |
| Precios | Entrada, alquiler básico/avanzado, chaleco, recargas, cuota — efectivo y transferencia | `precios_config` vía `lib/precios` |

### Base de conocimiento (curada)

Texto editable por el dueño: si duele, qué llevar, edad mínima,
estacionamiento, lluvia, duración, medios de pago.

**Se inyecta en el prompt, no se consulta por herramienta.** Con prompt caching
el prefijo estable se cobra ~10% en las lecturas siguientes, mientras que una
herramienta cuesta un round trip completo de inferencia por uso. Al tamaño
esperado (unos pocos miles de tokens) inyectar sale más barato. Si la base crece
por encima de ~10k tokens, migrar a búsqueda.

### Sin capacidad de escritura

**Todas las herramientas son de solo lectura.** El bot no puede anotar, cancelar,
cobrar ni modificar precios — no existe la herramienta. El peor error posible es
decir algo impreciso, nunca ejecutar algo. Es la principal decisión de seguridad
del diseño y lo que hace aceptable el riesgo de prompt injection.

### Reglas duras

- Nunca inventa precio ni horario: si la herramienta falla, escala.
- Nunca promete un lugar. Puede pasar el link para anotarse, no anotar.
- Nunca expone datos de otros jugadores.
- No negocia: descuentos y precios especiales escalan.
- Mensajes cortos, 2–3 líneas, tono de la marca (voseo, directo, sin
  corporativo).
- **Sin plantilla de salida y sin repetición.** No se le impone una estructura
  fija (saludo + respuesta + CTA): es la causa principal de que un bot con un
  buen modelo atrás igual suene mecánico. Reglas explícitas: no volver a
  saludar ni presentarse dentro de un hilo ya iniciado, no repetir una línea ya
  dicha en esa conversación, y no re-ofrecer un link que ya pasó. El historial
  persistido es lo que hace verificables estas tres reglas.
- Sin frase de fallback. Cuando no sabe, escala (ver abajo); no existe un
  "no entendí, ¿podés reformular?" al que volver en loop.

### Política de escalado

**Resuelve solo:** precios, horarios, qué partidas hay, disponibilidad, qué
incluye el alquiler, qué llevar, edad, cómo llegar, si duele, medios de pago,
cómo anotarse (con link a la partida).

**Escala y enmudece:** privadas / cumpleaños / corporativos (ticket alto —
**sin decir siquiera qué días hay libres**: decisión de Marcos del 2026-07-29,
tomada al detectar que una herramienta de agenda era inalcanzable bajo esta
política. La disponibilidad de privadas la dice una persona),
reclamos, pedidos de descuento, pedido explícito de hablar con alguien, temas de
seguridad o lesiones, y cualquier caso donde no sepa o haya dado muchas vueltas.

**Al escalar deja un resumen** de qué quiere la persona y dónde quedó la charla,
para que el humano retome sin leer el hilo completo.

## Segmentación de contactos

Requisito agregado por el cliente: necesita segmentar a quien consulta, tanto
para remarketing como porque **la duda aclarada a tiempo es lo que convierte**,
y hoy eso no se mide.

El modelo ya está leyendo cada mensaje para responderlo. Pedirle además una
clasificación estructurada cuesta un puñado de tokens de salida, no un round
trip extra. Se emite junto con la respuesta, no en una segunda llamada.

| Campo | Valores |
|---|---|
| `intencion` | `partida_abierta` · `privada_cumple` · `privada_corp` · `tienda` · `socio` · `otro` |
| `grupo_tam`, `fecha_tentativa` | Solo si la persona los menciona; nulos por defecto |
| `duda_principal` | `precio` · `dolor` · `edad` · `ubicacion` · `equipo` · `clima` · `pago` · `otro` |
| `primera_vez` | `si` · `no` · `desconocido` |
| `desenlace` | `link_enviado` · `se_anoto` · `frio` · `escalada` |

**Se guarda en `bot_conversaciones`, no en una tabla nueva.** Es una propiedad
de la conversación y se sobreescribe con cada mensaje: la clasificación del
último turno es la buena.

`desenlace = se_anoto` no lo decide el modelo: se cruza contra `inscripciones`
y `solicitudes_privada` por ventana temporal. El bot no tiene forma de saber si
la persona efectivamente se anotó.

### Qué se hace con eso, en tres niveles

1. **Tablero (inmediato, sin dependencias).** Consultas del mes por intención,
   dudas ordenadas por frecuencia, y tasa de cierre por intención. La lista de
   dudas es el mapa de qué falta explicar en la web.
2. **Conversions API de mensajería.** Meta acepta eventos de business messaging
   identificando a la persona con `page_id` + `page_scoped_user_id` en
   `user_data` — el PSID que ya nos llega por el webhook. Al confirmarse una
   reserva se emite el evento, y las campañas optimizan hacia conversaciones que
   cierran en vez de conversaciones que existen. Misma lógica que las
   conversiones offline de Google Ads ya implementadas (`lib/gclid.ts`,
   `/admin/conversiones`). Reutiliza `lib/meta-capi.ts`.
3. **Audiencias por lista.** Requiere teléfono o mail hasheado. Instagram y
   Messenger no los entregan (ver *Limitación conocida*). Llega con WhatsApp en
   la fase 2.

**Métrica principal del proyecto, revisada.** Deja de ser "proporción resuelta
por el bot vs. escalada" y pasa a ser **cierre por intención sobre las
conversaciones que el bot resolvió**. La primera mide actividad; la segunda mide
plata.

## CRM externo (Kommo) — decisión

El cliente está evaluando Kommo para lo mismo. **No compiten:** Kommo es la
bandeja, el embudo y el fichero de contactos; este diseño es quién redacta la
respuesta.

**Decisión (2026-07-29): seguimos con conexión directa a Meta.** Kommo está en
evaluación, no en producción, así que no hay inversión que respetar ni bandeja
que aprovechar, y evitamos una suscripción por usuario con mínimo de 6 meses.

**La puerta queda abierta y es barata.** Kommo expone en Salesbot el handler
`widget_request`: POST firmado con JWT a un servicio externo, que debe responder
200 en menos de 2 s y luego devolver la respuesta al `return_url` recibido. Ese
patrón asincrónico encaja con la arquitectura de adaptadores — sería un
adaptador más, sin tocar el motor.

**Restricción a respetar si algún día entra:** un solo sistema puede ser dueño
de cada canal. Dos bots suscritos al mismo Instagram se pisan.

## Modelo de datos

Cuatro tablas nuevas más una configuración. Nada de lo existente se modifica.

| Tabla | Contenido |
|---|---|
| `bot_conversaciones` | Una por contacto+canal: identificador externo (PSID), nombre, estado (`bot`/`humano`/`cerrada`), motivo y resumen del escalado, **campos de segmentación** (ver sección anterior), timestamps |
| `bot_mensajes` | Rol (`usuario`/`bot`/`humano`), texto, **id de mensaje de Meta (único, para deduplicar)**, tokens de entrada/salida para costo real |
| `bot_conocimiento` | Entradas de la base: título, contenido, activo, orden |
| `bot_pendientes` | Preguntas que el bot no supo responder, con estado |
| `bot_config` | Fila única: encendido general y parámetros |

**Deduplicación:** el id de mensaje de Meta es único. Meta reintenta entregas, y
sin esa restricción el bot responde el mismo mensaje varias veces.

**Privacidad:** RLS restringida a administradores, igual que el resto de datos
sensibles (DNI, celular). Ni un jugador autenticado puede leer conversaciones.

**Retención:** 12 meses. Después se eliminan.

### Limitación conocida

Instagram y Messenger **no exponen teléfono ni email** del contacto — solo un
identificador con alcance de página y el nombre de perfil. En esta fase el bot
**no puede identificar si quien escribe ya tiene cuenta o es socio**.

Con WhatsApp sí llega el número, que es la clave con la que identificamos
jugadores. Es el argumento principal para priorizar WhatsApp como fase 2: el bot
pasa de responder bien a responder personalizado.

## Panel de administración

Bajo `Admin → Bot`, cuatro pantallas:

1. **Bandeja de conversaciones** — listado con estado (te esperan / bot
   atendiendo / cerrada), canal, última línea, antigüedad. Filtros por estado.
2. **Conversación** — hilo completo, resumen del escalado arriba, interruptor
   *Bot activo / Contesto yo*, y **botón para abrirla en Instagram**.
3. **Base de conocimiento** — alta, edición y activación de entradas.
4. **Preguntas pendientes** — lo que el bot no supo, con acción directa para
   convertir cada una en una entrada de la base. Es el circuito de mejora.

Más un tablero con: conversaciones del mes desglosadas por intención,
**cierre por intención sobre lo que el bot resolvió** (la métrica que justifica
el proyecto), dudas ordenadas por frecuencia, proporción resuelta vs. escalada,
costo real del mes e interruptor general.

**Decisión: panel de supervisión, no bandeja de respuesta.** El humano responde
en Business Suite, que ya tiene notificaciones push, multimedia y audios.
Construir una bandeja peor duplicaría trabajo. El panel aporta lo que Meta no
tiene: contexto del escalado y el circuito de mejora. Revisable si el salto entre
apps molesta en el uso real.

**Aviso de escalado:** contador en el menú, como el de solicitudes pendientes. No
hace falta más: Meta ya notifica el DM al celular. Nuestro aviso es el contexto,
no la alarma.

## Manejo de errores

| Falla | Comportamiento |
|---|---|
| Inferencia caída, lenta o rate-limited | Un reintento; si falla, **escala en silencio** y avisa. Nunca se envía un mensaje de error al cliente. |
| Base de datos no responde | Escala. Nunca inventa el dato que no pudo consultar. |
| Mensaje duplicado de Meta | Descartado por id único. |
| Intento de manipulación del prompt | Peor caso: una respuesta tonta. Sin herramientas de escritura no hay acción posible; los temas de descuento escalan por regla. |
| Token de Meta vencido | Se detecta el error de auth y se avisa en el panel. |

### Topes de gasto

- **Por conversación:** superado un número de mensajes sin resolución, escala.
  Corta loops y charlas eternas.
- **Por día:** techo de gasto configurable. Al alcanzarlo el bot **se apaga solo**
  y avisa.

El daño máximo de cualquier descontrol es un número definido de antemano.

## Puesta en producción

**Etapa 1 — Modo sombra (1–2 semanas).** El bot recibe mensajes reales y **no
responde**: genera la respuesta que habría dado y la guarda junto a la que dio el
humano. El dueño compara y va cargando la base de conocimiento. Riesgo cero con
tráfico real. Se activa cuando las respuestas propuestas sean las que él hubiera
dado.

**Etapa 2 — Un canal.** Activo de verdad en el canal de menor volumen
(comentarios o Messenger), una semana, con el interruptor general a mano.

**Etapa 3 — Todos los canales.** Instagram DM incluido. WhatsApp como fase
siguiente.

## Verificación

**Banco de 30 preguntas reales**, incluyendo casos borde: cliente enojado, pedido
de descuento, consulta sobre algo inexistente, intento de manipulación. Se corre
ante cada cambio de instrucciones o de la base, comparando contra lo esperado. Es
el equivalente a los tests del resto del sistema.

**Chequeo de repetición.** Además de las respuestas sueltas, el banco incluye
**hilos de 5+ mensajes** donde se verifica que no re-saluda, no repite líneas ni
re-ofrece el mismo link. Es la regresión que protege la regla de arriba: un
cambio de instrucciones puede volver mecánico al bot sin que ninguna respuesta
individual esté mal.

**Clasificación.** Sobre el mismo banco se compara la segmentación emitida
contra la esperada. Una intención mal clasificada ensucia el tablero y, peor,
manda un evento equivocado a Meta.

## Costos estimados

Conversación típica (3 intercambios, con consulta de disponibilidad), con prompt
caching sobre el prefijo estable:

| Modelo | Por conversación | 300/mes | 1.000/mes |
|---|---|---|---|
| Opus 5 | ~US$0,06 | ~US$18 | ~US$60 |
| Sonnet 5 | ~US$0,024 | ~US$7 | ~US$24 |
| Haiku 4.5 | ~US$0,023 | ~US$7 | ~US$23 |

Instagram, Messenger y comentarios **no tienen costo de mensajería en Meta**.
WhatsApp sí cobra por conversación, a evaluar en la fase 2.

Haiku no conviene: su prefijo mínimo cacheable (4096 tokens) es mayor que nuestro
prefijo estable, así que no aprovecha el descuento por reutilización y termina
costando casi lo mismo que Sonnet 5 con menos capacidad.

Sin infraestructura nueva: corre en el Vercel y el Supabase existentes.

## Fuera de alcance (explícito)

- Que el bot anote gente en partidas o cree solicitudes.
- WhatsApp (fase 2).
- La tienda como fuente de datos del bot (se puede sumar como herramienta).
- Identificación de socios en Instagram/Messenger (imposible sin teléfono).
- Bandeja de respuesta propia (se usa Business Suite).
- Audiencias de remarketing por lista (requieren teléfono/mail — fase WhatsApp).
- Integración con Kommo u otro CRM externo (evaluada y pospuesta, ver arriba).
