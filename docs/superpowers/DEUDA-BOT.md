# Deuda técnica — bot-motor

Este documento reemplaza a `.superpowers/sdd/2026-07-29-bot-motor/progress.md`
como lugar donde vive esta deuda. Ese archivo no está trackeado (vive bajo
`.superpowers/`, listado en `.gitignore`) y puede desaparecer en cualquier
momento — con él se hubieran perdido 21 hallazgos diferidos y dos bugs reales
fuera del alcance del plan original. Esto los junta, agrupados por tema, al
cerrar la revisión final antes de mergear `bot-motor`.

Lo que esa misma revisión final ya resolvió en el mismo pase (tests de
límites de `esClasificacionValida`, allowlist de herramientas en vez de lista
negra, test de privacidad por salida en vez de por argumentos, y este mismo
comentario de fragilidad ahora también dentro de `lib/bot/prompt.ts`) **no
está listado acá** — ya no es deuda, es historia. Ver el commit
correspondiente y `.superpowers/sdd/2026-07-29-bot-motor/fix-final-report.md`
(si todavía existe) para el detalle de ese pase.

## Bugs de código (fuera de este plan, no arreglados)

### 1. `lib/slots-privada.ts` — un slot ocupado puede leerse como "disponible"

`getSlotsEstado` desestructura solo `data` (nunca `error`) en sus 3 consultas
(`partidas`, `solicitudes_privada`, `slots_privada_overrides`). Si cualquiera
de las tres falla, `data` llega `undefined`, cae al `?? []` correspondiente, y
el cálculo de estado no se entera de que había una partida, una solicitud
pendiente o un override real ahí — el slot termina clasificado como
`"disponible"` aunque no lo esté. Lo consume
`app/platform/privada/actions.ts`, la pantalla donde se gestionan las
privadas.

Detectado por el revisor de la tarea 4 del plan `bot-motor`, adjudicado
deliberadamente FUERA de ese plan porque las privadas siempre escalan por
política antes de prometerle nada a un cliente (un humano agarra el slot mal
marcado antes de confirmar) — pero la propia pantalla de admin puede mostrar
un slot libre que no lo es, que es un problema real independiente del bot.

Arreglo sugerido: chequear `error` explícitamente en las 3 consultas, mismo
patrón ya establecido en este mismo plan para `lib/precios.ts`,
`lib/bot/conocimiento.ts` y `lib/bot/topes.ts` — loggear y no tratar "no pude
leer" como "0 filas de ocupación real".

### 2. `app/platform/admin/precios/actions.ts:14` — fuga de mensajes de zod en inglés

`updateSchema` (`z.enum(PRECIOS_KEYS_ORDER, ...)`, y el `z.number().int()` de
`valor_efectivo`/`valor_transferencia`) deja pasar los mensajes de validación
default de zod, en inglés, para el caso de tipo/enum inválido — la misma fuga
que ya se arregló en la pantalla de base de conocimiento del bot (commit
`f6d45bb`). `friendlyError` trata cualquier string de zod como si ya viniera
redactado para mostrarle al usuario, así que un mensaje en inglés puede
llegarle a Marcos tal cual. Alcanzable ANTES del chequeo de `super_admin`
(zod valida primero que la autenticación).

Detectado por el re-revisor de la tarea 9 al auditar el mismo patrón en otras
pantallas de admin.

Arreglo sugerido: mismo patrón que ya se aplicó en conversiones y base de
conocimiento — mensaje explícito en español en cada regla de zod que pueda
fallar (el `.min(0, "El precio debe ser >= 0")` ya lo tiene; falta cubrir el
caso de tipo/enum).

## Deuda menor diferida (cosmética / duplicación)

- **Tipos `ClienteLectura` duplicados**: una forma equivalente a
  `Pick<SupabaseClient, "from">` está definida por separado en
  `lib/bot/config.ts`, `lib/bot/conocimiento.ts` y `lib/bot/topes.ts`.
  Candidato a vivir en un solo lugar compartido (¿`lib/bot/tipos.ts`?).
- **`isoDeFecha`** (`lib/bot/herramientas.ts`) duplica el cálculo de
  `hoyEnArgentina` de `lib/semana.ts` — misma lógica, dos implementaciones.
- **`esClasificacionValida`** (`lib/bot/tipos.ts`): acepta propiedades extra
  no declaradas en el objeto (comportamiento estándar de un type guard
  estructural, no un bug) — tenerlo en cuenta si algún día se serializa la
  clasificación completa hacia Meta u otro sistema externo. El regex de
  `fecha_tentativa` valida FORMATO (`YYYY-MM-DD`), no validez de calendario
  — `"2026-13-40"` pasa. Ninguno de los dos se tocó en la revisión final: son
  gaps conocidos y aceptados, no regresiones nuevas.
- **`lib/bot/topes.ts`**: los helpers de validación numérica (el equivalente
  a "entero válido" / "número finito positivo" usado para
  `tope_diario_usd`/`max_mensajes_conversacion`) son IIFEs anónimas inline en
  vez de funciones nombradas. Mismo comportamiento verificado, legibilidad
  ligeramente peor.
- **`prompt.test.ts`**: el patrón `.map((b) => b.text).join("\n")` está
  duplicado en la mayoría de los tests de `construirSistema` — candidato a
  un helper compartido.

## Deuda de comportamiento a revisar (gaps conocidos, no bugs confirmados)

- **`tope_diario_usd = 0` deliberado** (`lib/bot/config.ts`) cae al default
  de 3 en vez de cortar el gasto en 0: la guarda de fase-19 exige `n > 0` y
  trata 0 como inválido, no como "apagar el gasto". El off-switch real es
  `encendido = false`, y el guard de `debeFrenar` (`topeDiarioUsd <= 0` →
  frena con `apagarBot:true`) hace que la composición sea segura, pero es
  sorprendente si alguien espera que poner 0 signifique "cero gasto
  permitido" en vez de "usar el default de 3".
- **Gap de mutation-testing en `herramientas.test.ts`**: algunas guardas que
  chequean `!data || error` en `proximasPartidas` están probadas solo por la
  mitad `!data`; la mitad `error` (con `data` presente pero `error` también)
  no siempre tiene su propio caso dedicado.
- **`limiteConsulta = limite + 10`** en `proximasPartidas`
  (`lib/bot/herramientas.ts`) asume que nunca compiten más de 10 partidas del
  mismo día con inscripción ya cerrada por el límite pedido. Con el volumen
  real (~1 partida pública por día) no se satura; si algún día se satura,
  degrada mostrando menos opciones, nunca inventando una partida que no
  existe.
- **`proximas_partidas` selecciona `duracion_min` pero lo descarta** antes de
  devolverlo en la respuesta — por eso "¿cuánto dura la partida?" no se puede
  contestar solo con la herramienta, hace falta que esté en la base de
  conocimiento.
- **Motor — reintento ciego al tipo de error** (`llamarConUnReintento`,
  `lib/bot/motor.ts`): reintenta la llamada una vez sin mirar si el error es
  reintentable — por ejemplo, reintentaría un 400 (que nunca va a cambiar en
  el segundo intento), y ese reintento se apila además con los reintentos
  internos que ya hace el SDK de Anthropic.
- **Prompt — intención mixta sin instrucción explícita**: un mensaje que
  mezcla una pregunta resoluble con un pedido de descuento en el mismo turno
  no tiene una regla dedicada en `lib/bot/prompt.ts` sobre cuál de las dos
  gana.
- **Fragmento de sintaxis de function-calling filtrado al texto** (tarea 10,
  ronda 3): observado UNA vez en una corrida real contra la API
  (`</parameter><parameter name="escalar">false` pegado al final de una
  respuesta por lo demás normal), no reproducido en más de 10 intentos
  posteriores. Tiene defensa en el borde desde la ronda 4
  (`PATRONES_FUGA_SINTAXIS` en `lib/bot/motor.ts`: detecta el patrón y escala
  en silencio en vez de mandar el fragmento) pero sin causa raíz confirmada
  — sigue siendo un misterio mitigado, no resuelto.
- **Banco de regresión — mismatch verbo/sustantivo en el checker**: la
  función `menciona`/`noMenciona` de `scripts/banco-preguntas.mjs`
  (apoyada en `lib/banco/texto.ts`) es substring-based y no matchea variantes
  morfológicas — visto 3 veces (ropa: "larga" vs "larg[o]"; autorización:
  "autorizar" vs "autorizaci[ón]"; estacionamiento: "estacionar" vs
  "estacionamiento"). Recomendada una pasada sistemática sobre todos los
  `menciona`/`noMenciona` de `scripts/banco-preguntas.json`, no casos
  sueltos.

## Pendientes operativos de Marcos (no son código)

- **Correr `db/schema-phase-19.sql`** en el SQL Editor de Supabase — a la
  fecha de este documento, confirmado que TODAVÍA no corrió (`bot_config` y
  `bot_conocimiento` responden `PGRST205`, tabla inexistente en el schema
  cache). Sin esto el bot no tiene dónde leer configuración, guardar
  historial, ni consultar la base de conocimiento — y el chequeo de acceso
  admin agregado en la revisión final (`verificarAccesoAdmin` en
  `lib/bot/topes.ts`) va a fallar ruidosamente hasta que se corra, que es el
  comportamiento esperado y buscado.
- **Sembrar las 7 entradas de `bot_conocimiento`** (el SQL vivía en el
  informe de la tarea 5, `task-5-report.md`, bajo `.superpowers/` — si ese
  archivo ya no existe, reconstruir con el dueño: edad mínima, qué duele, qué
  llevar, instalaciones, lluvia, cómo llegar, duración de la partida).
- Con la migración corrida y la KB sembrada, el banco de regresión (`pnpm
  banco` — cuesta dinero real de API, no correr sin necesidad real) debería
  subir del 24/30 medido en la última corrida: las 6 fallas actuales son
  escaladas limpias por falta de KB (edad, cómo llegar, lluvia, duración,
  autorización de menores, y el último mensaje del caso de no-repetirse).

---

Fuente: extraído y agrupado de
`.superpowers/sdd/2026-07-29-bot-motor/progress.md` (líneas `minor
(deferred)`, `PENDIENTE FUERA DE ESTE PLAN` y `PENDIENTE DE MARCOS`) al cerrar
la revisión final antes de mergear la rama. Ese archivo no está trackeado —
si todavía existe en el momento de leer esto, tiene el detalle completo
tarea por tarea (incluida la evidencia empírica de cada hallazgo).

---

## Anotado en el gate final (2026-07-30)

Tres puntos que la última revisión levantó y que se decidió **no** arreglar en
esta rama. Ninguno bloquea el merge; los tres tienen que resolverse antes de
que el bot hable con clientes reales o durante el plan 2.

### 1. Un precio en 0 se cotiza como precio vigente — ACCIÓN DEL DUEÑO

`getPreciosConfigResultado` ahora devuelve `ok:false` ante una lectura vacía,
pero una lectura **parcial** sigue siendo `ok:true`: las keys que falten se
rellenan con `PRECIOS_DEFAULT`.

El agravante es que `db/schema-phase-3a.sql` y `db/schema-phase-5.sql` siembran
las 8 keys **con valor 0**. Si nunca se editaron chaleco, las dos recargas y la
cuota de socio, esas filas existen en 0 y el bot las cotizaría en $0 — con
`ok:true`, sin ninguna señal de que algo anda mal. El prompt autoriza
explícitamente cotizar la cuota de socio.

**Antes de encender el bot:** confirmar en `/admin/precios` que chaleco, las dos
recargas y la cuota de socio tengan valor > 0.

**Arreglo de código pendiente:** tratar un precio en 0 como "no configurado" en
la herramienta `precios`, o exigir el set completo de keys para dar `ok:true`.

### 2. `gastoDelDia` ahora lanza en vez de devolver `Infinity`

`verificarAccesoAdmin` (`lib/bot/topes.ts`) cierra bien el agujero del cliente
sin permisos, pero cambió el contrato: el módulo entero fallaba cerrado **por
valor** (`Infinity` → `debeFrenar` frena), y ahora esa garantía depende de que
el llamador no atrape la excepción.

**Trampa concreta para quien escriba el adaptador (plan 2):** un
`try { g = await gastoDelDia() } catch { g = 0 }` reabre el fail-open que este
arreglo cerró. **Mejor arreglo:** que `verificarAccesoAdmin` devuelva `Infinity`
en lugar de lanzar, y que loguee — así el fail-closed no depende de nadie.

Además, el docstring de `gastoDelDia` sigue diciendo "Devuelve Infinity si no se
puede calcular", que ya no es toda la verdad.

### 3. El test de privacidad mejoró menos de lo que dice su comentario

El test nuevo asevera sobre la salida con un fixture de partidas públicas y
privadas mezcladas — es mejor que el anterior. Pero como el doble deriva el
filtrado de los argumentos que registra, **sigue sin poder detectar el caso
"el filtro se manda pero la base no lo honra"**. Para eso hace falta una prueba
de integración contra Supabase real. El comentario del test promete más de lo
que da.
