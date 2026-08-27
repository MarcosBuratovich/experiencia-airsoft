# Atribución del funnel de reserva — Diseño

**Fecha:** 2026-08-26
**Estado:** aprobado por el dueño del producto (Marcos), pendiente de plan de implementación.

## Problema

Después del pico de tráfico orgánico de agosto 2026 quedó a la vista un agujero:
entra gente al sitio y no sabemos qué le pasa después. Concretamente, hoy no se
puede responder ninguna de estas tres preguntas:

1. **¿Por dónde entra la gente que efectivamente reserva?** WhatsApp y la
   plataforma conviven y no sabemos cuál gana.
2. **¿Qué canal trae gente que reserva** (no que visita)? Instagram puede traer
   diez veces más visitas y cero reservas.
3. **¿En qué paso exacto abandonan** los que no llegan a reservar?

La instrumentación existente es buena pero está partida en dos mundos que no se
tocan:

- **GA4 + Meta Pixel** (`lib/ga.ts`, `app/_components/google-analytics.tsx`)
  tienen los clicks —`whatsapp_click`, `reservar_click`, `sign_up`,
  `anotarse_partida`— pero no tienen las reservas ni la plata.
- **Supabase** tiene las reservas, los check-ins y la plata cobrada, pero
  `inscripciones` no guarda **ningún** dato de origen. Solo
  `solicitudes_privada` guarda `gclid` (fase 18), y solo para privadas.

Nadie tiene el hilo completo desde "visitante anónimo" hasta "jugador que pagó
y vino".

## Alcance de esta fase

**Dentro:**

- **Fase 0** — responder el reparto WhatsApp vs plataforma con los datos que ya
  existen. Cero código.
- **Fase 1** — capturar origen en el primer contacto y persistirlo hasta la
  reserva y hasta el registro.

**Fuera, a propósito:**

- **Fase 2** (instrumentar los pasos intermedios del registro) y **Fase 3**
  (cerrar el loop de WhatsApp) quedan para después de correr la Fase 0. El
  reparto real cambia cuál de las dos es urgente: si el 90% entra por WhatsApp,
  la Fase 3 pasa a ser lo importante y la Fase 2 casi no mueve la aguja.
- Cualquier dashboard nuevo. Las preguntas se responden con SQL contra Supabase.
  Un panel se construye cuando sepamos qué métricas mirar todos los días.

## Fase 0 — lo que ya se puede responder hoy

`inscripciones` ya distingue el origen operativo sin saberlo:

- `agregado_por is null` + `user_id` → la persona se anotó sola en la plataforma.
- `agregado_por` apuntando a un admin → lo cargó el staff: vino por WhatsApp o
  fue walk-in (`agregarWalkinAction`).
- `guest_nombre is not null` → invitado sin cuenta, siempre carga manual.
- `agregado_por` apuntando a un jugador → invitado que sumó un organizador a su
  privada.

Cruzado con `checkins.presente` (quién realmente fue) y `checkins.pago_monto`
(cuánto pagó), eso ya contesta la pregunta 1:

```sql
select
  to_char(p.fecha, 'YYYY-MM')                            as mes,
  case
    when i.guest_nombre is not null          then 'guest sin cuenta (carga manual)'
    when i.agregado_por is null              then 'auto-anotado (plataforma)'
    when adm.role in ('admin','super_admin') then 'cargado por admin (WhatsApp/walk-in)'
    else                                          'agregado por organizador'
  end                                                    as origen,
  count(*)                                               as inscripciones,
  count(*) filter (where c.presente)                     as asistieron,
  round(avg(p.fecha - i.created_at::date), 1)            as dias_de_anticipacion
from inscripciones i
join partidas p        on p.id = i.partida_id
left join profiles adm on adm.id = i.agregado_por
left join checkins c   on c.inscripcion_id = i.id
where i.estado <> 'cancelado'
  and p.fecha >= current_date - interval '6 months'
group by 1, 2
order by 1 desc, 3 desc;
```

`dias_de_anticipacion` es la señal de control: los de plataforma reservan con
días de anticipación, los de carga manual caen sobre la fecha. Si ese número da
cerca de cero para un grupo, confirma que son de último momento.

**Limitación conocida:** es un proxy, no una verdad. Un admin puede cargar a
alguien que arregló por Instagram, no por WhatsApp. Sirve para dimensionar el
reparto plataforma vs. asistido, no para atribuir canal — eso lo resuelve la
Fase 1.

## Fase 1 — Arquitectura

Espejo de `lib/gclid.ts`, que ya funciona en producción desde la fase 18. Mismo
contrato, misma degradación elegante, misma ubicación de cookie.

**Nota (post-implementación):** el diagrama y la sección de abajo describían
originalmente un componente cliente que escribía la cookie con
`document.cookie`. Eso cambió durante la implementación — la escribe
`proxy.ts` — por qué y el detalle completo están en "Quién escribe la cookie:
`proxy.ts`, no un componente cliente", más abajo.

```
primer pageview (www o app)
        │
        ▼
   proxy.ts         ── si NO existe cookie ──▶  Set-Cookie `ea_attr`
(construirCookieAtribucion /                     en .experienciaairsoft.com
 aplicarCookieAtribucion)                                │
              ... la persona navega, se va, vuelve ...     │
                                                          ▼
        conversión (anotarse / registrarse)  ──▶  leerAtribucion()  ──▶  columnas
                                                   (server)              en Supabase
```

### `lib/atribucion.ts` y `lib/atribucion-cookie.ts` (server)

```ts
export type Atribucion = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  first_seen_at: string;
};

export async function leerAtribucion(): Promise<Atribucion | null>
```

Lee la cookie `ea_attr`, la parsea y la valida. **Nunca tira**: cualquier error
—cookie corrupta, JSON inválido, campos fuera de rango— devuelve `null`, igual
que `leerGclid()`.

Validación de cada campo, porque el contenido viene del cliente y es
manipulable: 100 caracteres (255 para `fbclid`, que son largos de verdad), se
descarta cualquier campo que no matchee `/^[\p{L}\p{N}_ .:/-]+$/u` — letras
Unicode incluidas, porque las campañas de este negocio se nombran en español
("Black Friday", "Promoción Agosto"). Un valor sucio no invalida la cookie
entera, solo ese campo. El mismo criterio vive en un solo lugar
(`lib/atribucion-cookie.ts`) y lo aplican tanto la escritura
(`armarDatosAtribucion`) como la lectura (`parsearAtribucion`), para que no se
desincronicen.

### Quién escribe la cookie: `proxy.ts`, no un componente cliente

**Corrección respecto al diseño original de este documento:** la idea inicial
era un componente cliente (`app/_components/captura-atribucion.tsx`), montado
en el root layout, que escribía `ea_attr` con `document.cookie` en el primer
pageview. Ese componente **nunca se implementó así** y no existe en el repo.

En cambio, la escribe `proxy.ts` con el header `Set-Cookie`, en
`construirCookieAtribucion()` (arma el valor, con el chequeo first-touch
primero que nada) y `aplicarCookieAtribucion()` (lo aplica a la respuesta que
se devuelve).

**Por qué el cambio:** Safari con Intelligent Tracking Prevention (ITP), y
Firefox con una protección similar, recortan a **7 días** el `max-age` de
cualquier cookie escrita por JavaScript del lado del cliente
(`document.cookie`) — y a solo **24 horas** si el aterrizaje trae *link
decoration* de un dominio clasificado como tracker, que es exactamente el
caso de un `?fbclid=...` llegando desde Instagram. Con first-touch a 400 días
(el techo que respeta Chrome), escribir desde el cliente hubiera sesgado
sistemáticamente el tráfico de Instagram/Facebook —uno de los canales que más
importa medir en este negocio— hacia "sin dato" mucho antes de que esa
persona vuelva a convertir. Una cookie de servidor (`Set-Cookie`) no está
sujeta a ese recorte.

Igual que el diseño original: cookie en `.experienciaairsoft.com` (dominio
raíz, para sobrevivir el salto www → app, el mismo motivo por el que funciona
`_gcl_aw`), `max-age` 400 días, `SameSite=Lax`, `Secure`. A diferencia del
diseño original, **sí lleva `HttpOnly`**: al escribirla el servidor (no el
cliente) no hace falta que ningún JavaScript propio la lea, y `HttpOnly`
evita que un tag de terceros la lea o la pise.

Se escribe solo en hosts de producción, reusando `esHostProduccion()` de
`lib/ga.ts` (con el host normalizado sin el `:puerto` que puede traer el
header `Host`, algo que `location.hostname` del browser nunca tiene), para no
ensuciar con datos de localhost y previews.

**De paso, también se captura `gclid`:** independiente de `ea_attr` y del tipo
`Atribucion`, `anotarmeAction` lee además la cookie `_gcl_aw` —la que ya
escribe el tag de Google Ads— vía `leerGclid()` (`lib/gclid.ts`) y persiste
`gclid` junto con el resto de las columnas de atribución en el mismo insert.

### Por qué first-touch

La pregunta del negocio es *"qué canal me **trae** gente que reserva"*, no *"qué
click cerró la venta"*. First-touch la responde y es más simple: se escribe una
vez y no se toca nunca más. Last-touch requeriría decidir reglas de
sobreescritura (¿un self-referral pisa el origen? ¿un click de email?) que no
aportan a esta pregunta.

Decisión revisable: si más adelante hace falta last-touch, se agrega una segunda
cookie sin tocar la primera.

## Modelo de datos

Migración nueva: `db/schema-phase-20.sql`.

### `inscripciones`

Siete columnas nullable, todas `text` salvo el timestamp:

```sql
alter table public.inscripciones
  add column if not exists utm_source                text,
  add column if not exists utm_medium                text,
  add column if not exists utm_campaign              text,
  add column if not exists fbclid                    text,
  add column if not exists referrer_host             text,
  add column if not exists landing_path              text,
  add column if not exists atribucion_first_seen_at  timestamptz;
```

`atribucion_first_seen_at` guarda el `first_seen_at` **de la cookie** —cuándo la
persona llegó al sitio por primera vez—, no cuándo se escribió la fila. Es el
dato con valor: restado contra `created_at` da cuánto tarda alguien desde que
descubre el sitio hasta que reserva, que es una señal directa de fricción.

Nullable a propósito: las inscripciones cargadas por un admin (`agregado_por`)
no tienen atribución de navegador y deben quedar en `null`, no en un string
vacío. `null` significa "no sabemos", que es la verdad.

Índice en `utm_source` para las agregaciones del reporte.

### `profiles`

Las mismas columnas. Atribuir el registro además de la reserva permite separar
dos fugas distintas: un canal que trae gente que se registra pero no reserva
tiene un problema de producto; un canal que no trae ni registros tiene un
problema de mensaje.

Se llenan vía `handle_new_user()`, que ya copia campos desde
`raw_user_meta_data` con `coalesce`. Se suman siete lecturas más, con el mismo
patrón tolerante: si el campo no vino, queda `null` y el registro se completa
igual.

`signupAction` pasa los seis campos de texto dentro de `options.data` del
`signUp`, con los mismos nombres que tiene la cookie. El trigger los lee y mapea
el de tiempo al nombre de la columna:

```sql
nullif(new.raw_user_meta_data->>'utm_source', ''),
-- ... los otros cinco igual ...
v_atribucion_first_seen_at  -- variable cargada en un sub-bloque begin/exception,
                             -- → atribucion_first_seen_at
```

`nullif(..., '')` en vez de `coalesce(..., '')` a propósito: acá un string vacío
tiene que quedar `null` ("no sabemos"), no `''` ("sabemos que es vacío"). Es lo
contrario de lo que hacen `nombre` y `apellido`, que son obligatorios y usan
`coalesce`.

El cast a `timestamptz` es el único que puede tirar si llega basura. Por eso no
se hace inline: corre dentro de un sub-bloque `begin/exception` de plpgsql que
carga una variable antes del `insert`. Un `case` con regex de validación previa
no alcanza —un string con forma ISO-8601 pero semánticamente imposible, como
`'2026-13-45T00:00:00Z'`, pasa cualquier regex y explota igual al castear—, así
que la única garantía real de que un valor inválido no aborte el registro es
capturar la excepción del cast: si falla, la columna queda `null`.

**Riesgo asumido:** `handle_new_user()` está en el camino crítico del registro.
Un error ahí y nadie se puede registrar. Mitigación: usar exclusivamente
`coalesce(new.raw_user_meta_data->>'campo', null)`, que no puede fallar por dato
faltante, y verificar el registro completo en staging antes de aplicar.

## Puntos de escritura

Dos, los dos con el patrón de reintento de `solicitarPrivadaAction`:

| Dónde | Archivo | Qué escribe |
|---|---|---|
| Al anotarse a una partida | `app/platform/partidas/[id]/actions.ts` → `anotarmeAction` | las 7 columnas de `inscripciones`, con insert directo |
| Al registrarse | `app/platform/actions/auth.ts` → `signupAction` | los 7 campos dentro de `options.data`; a `profiles` los baja `handle_new_user()` |

El patrón de reintento, copiado de `solicitarPrivadaAction`:

```ts
const attr = await leerAtribucion();
// Mapeo explícito, NO spread: los nombres de la cookie y de las columnas no
// coinciden uno a uno (`first_seen_at` → `atribucion_first_seen_at`), y un
// spread ciego mandaría un campo inexistente y rompería el insert siempre.
const columnasAttr = attr && {
  utm_source: attr.utm_source,
  utm_medium: attr.utm_medium,
  utm_campaign: attr.utm_campaign,
  fbclid: attr.fbclid,
  referrer_host: attr.referrer_host,
  landing_path: attr.landing_path,
  atribucion_first_seen_at: attr.first_seen_at,
};

let { error } = await supabase
  .from("inscripciones")
  .insert(columnasAttr ? { ...base, ...columnasAttr } : base);

if (error && columnasAttr) {
  console.error("[anotarmeAction] insert con atribución falló, reintento sin ella:", error.message);
  ({ error } = await supabase.from("inscripciones").insert(base));
}
```

Esto encarna el principio que ya rige el codebase: **una inscripción jamás se
puede perder por un tema de analytics.** Si la migración todavía no corrió, o si
la cookie está corrupta, la persona se anota igual.

`agregarWalkinAction` y `organizador-actions.ts` **no** se tocan: esas
inscripciones no tienen navegador de origen y deben quedar en `null`.

## Privacidad

Se guarda `referrer_host` —solo el host, nunca la URL completa— y nada de PII.
Es coherente con lo que ya hace `sanitizarUrl()` con los magic links y con el
guard que excluye `/admin` del tracking.

Los `utm_*` y `fbclid` son parámetros de campaña propios, no identificadores de
persona. La cookie no contiene nada que identifique al usuario por sí solo.

## Manejo de errores

| Falla | Qué pasa |
|---|---|
| Cookie ausente | `leerAtribucion()` devuelve `null`, se inserta sin atribución |
| Cookie corrupta o JSON inválido | idem, se descarta entera |
| Campo individual sucio | se descarta ese campo, el resto sobrevive |
| Migración sin correr | el insert reintenta sin las columnas |
| Ad blocker que bloquea GA | **no afecta**: la cookie es propia, no de un tercero |

Ese último punto es la ventaja principal de este diseño sobre resolverlo en GA4.

## Verificación

1. **Unit** — `leerAtribucion()` contra cookies válidas, ausentes, corruptas,
   con campos sucios y con campos sobredimensionados. Sigue el patrón de los
   tests existentes en vitest.
2. **Manual, first-touch** — entrar con `?utm_source=instagram`, navegar a otra
   página con `?utm_source=google`, verificar que la cookie sigue diciendo
   `instagram`.
3. **Manual, cross-domain** — entrar a `www` con utm, saltar a `app`,
   registrarse, y verificar que `profiles` quedó con el origen correcto.
4. **Manual, degradación** — con la migración sin aplicar, anotarse a una
   partida y confirmar que la inscripción se crea igual.
5. **Regresión de registro** — un registro completo end-to-end después de tocar
   `handle_new_user()`, incluida la confirmación de email.

## Qué habilita

La pregunta 2 pasa a ser una query:

```sql
select
  coalesce(i.utm_source, i.referrer_host, 'directo') as canal,
  count(*)                                           as reservas,
  count(*) filter (where c.presente)                 as asistieron,
  sum(c.pago_monto)                                  as ingreso_real
from inscripciones i
left join checkins c on c.inscripcion_id = i.id
where i.created_at >= now() - interval '90 days'
group by 1
order by ingreso_real desc nulls last;
```

**Canal cruzado con plata efectivamente cobrada.** Eso es lo que GA4 no puede
dar: sin sampling, sin lag de 24-48h, sin perder el 15-30% del mobile por ad
blockers, y con la definición de conversión que importa —vino y pagó— en vez de
la que es fácil de medir —hizo click—.

## Fuera de alcance (explícito)

- **Pasos intermedios del registro** (Fase 2). Hoy se ve `reservar_click` y se
  ve `anotarse_partida`, pero nada en el medio. Se decide después de la Fase 0.
- **Loop de WhatsApp** (Fase 3). Requiere un cambio operativo, no solo código.
- **Dashboard en el admin.** SQL primero; panel cuando sepamos qué se mira a
  diario.
- **Last-touch y modelos multi-touch.** No responden la pregunta actual.
- **Unir GA4 con Supabase vía `client_id`.** Evaluado y descartado: agrega una
  dependencia frágil (se rompe al borrar cookies o cambiar de device) para un
  beneficio que las columnas propias ya cubren.
