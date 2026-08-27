# Instrumentación del funnel de registro (Fase 2) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ver en qué paso exacto abandona la gente entre que hace click en "ver partidas" y que se anota, para saber si la fricción está en el muro de login, en el formulario, o en la confirmación del mail.

**Architecture:** Cuatro eventos GA4 nuevos, todos con los helpers que ya existen (`track()`, `TrackEvent`, `ParamEventTracker`). Sin schema nuevo, sin migración, sin dependencias. Más un arreglo en `proxy.ts` que hoy pierde el destino al redirigir a login.

**Tech Stack:** Next.js 16.2.6 (App Router), TypeScript, GA4 + Meta Pixel vía `lib/ga.ts`, Vitest, pnpm.

## Global Constraints

- **Gestor de paquetes: `pnpm`.** `npm` rompe el árbol de dependencias de este repo.
- **Antes de escribir código de Next, leer la guía correspondiente en `node_modules/next/dist/docs/`** (mandato de `AGENTS.md`).
- **Ningún evento puede llevar PII.** De un error de formulario va el **nombre del campo**, nunca el valor que escribió la persona. Es coherente con `sanitizarUrl()` y con el guard de `/admin` que ya existen.
- **`track()` es siempre un no-op seguro.** Nunca condicionar lógica de negocio a su resultado.
- **Nada puede romper el registro ni el login.** Son los caminos críticos: la instrumentación se agrega alrededor, nunca dentro de la lógica de auth.
- **Los commits terminan con:** `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## Contexto: por qué esto

Los datos de la Fase 0 (corridos el 2026-08-27 contra producción) muestran el problema:

- La ocupación creció 12x con la misma oferta: de 2,5% en junio a 32% en agosto.
- Solo el 35% de las inscripciones son auto-anotadas. El 65% las carga el staff.
- **212 guests sin cuenta** contra **69 personas** que se anotaron solas alguna vez.
- De esas 69, **48 se anotaron una sola vez**.

Y el embudo es ciego en el medio: hoy se mide `reservar_click` (click de www a app) y `anotarse_partida` (el final), sin nada entre los dos. Si de 100 clicks salen 5 inscripciones, no hay forma de saber si los 95 se fueron en el muro de login, en el DNI del formulario, o esperando un mail que nunca confirmaron.

**Lo que este plan NO resuelve:** la fricción en sí. Solo la hace visible. Las decisiones de producto —bajar el muro, acortar el formulario, convertir guests en cuentas— vienen después, con el dato en la mano.

## Estado actual de la instrumentación

Ya existe y no se toca:

| Evento | Dónde | Qué mide |
|---|---|---|
| `reservar_click` | `google-analytics.tsx` (listener delegado) | Click de www → app |
| `sign_up` | `login/page.tsx` con `TrackEvent once` | Registro exitoso |
| `login` | `platform/layout.tsx:60` con `ParamEventTracker` | Login exitoso |
| `anotarse_partida` | `partidas/[id]/anotarme-button.tsx` | Inscripción |

## Estructura de archivos

| Archivo | Cambio |
|---|---|
| `proxy.ts` | Pasar `?next=` al redirigir a login (hoy se pierde) |
| `app/platform/login/page.tsx` | Disparar `muro_login` cuando llega con `next` |
| `app/platform/signup/signup-form.tsx` | Disparar `signup_iniciado` y `signup_error` |
| `app/platform/auth/callback/route.ts` | Agregar `?confirmado=1` al redirect de `type=signup` |
| `app/platform/layout.tsx` | `ParamEventTracker` para `confirmado` |
| `app/_components/google-analytics.tsx` | Sumar `confirmado` a `PARAMS_MARCADORES` (línea 14) |

---

### Task 1: Preservar el destino al redirigir a login

Sin esto, el evento de la Task 2 no tiene el dato que lo hace útil, y además la persona pierde a dónde iba.

**Files:**
- Modify: `proxy.ts` (el bloque que construye `loginUrl`)

**Interfaces:**
- Produces: el redirect a `/platform/login` ahora lleva `?next=<pathname original>`.

- [ ] **Step 1: Entender el estado actual**

En `proxy.ts`, el camino de plataforma sin sesión hace:

```ts
const loginUrl = url.clone();
loginUrl.pathname = "/platform/login";
return NextResponse.redirect(loginUrl);
```

**Corrección post-review (2026-08-27):** el párrafo original de este plan decía que el proxy corre antes que las `page.tsx` y por eso el `next` de las páginas "casi nunca se usa". Eso es falso: en `proxy.ts:111-120`, la rama de rewrite (host de plataforma, pathname **sin** `/platform`) retorna de inmediato con `NextResponse.rewrite()` y nunca llega al bloque de auth-wall. Navegar a `app.experienciaairsoft.com/partidas` —el caso normal— toma exactamente esa rama: el proxy no chequea sesión ni redirige a login. Quien redirige ahí es el propio `redirect("/login?next=/partidas")` de `partidas/page.tsx`, que ya pasaba el `next` correctamente antes de este plan.

El bloque de auth-wall del proxy (`proxy.ts:122-148`, el que esta Task 1 toca) solo es alcanzable cuando el request entra con `/platform` ya en el pathname —es decir, alguien escribe a mano `app.experienciaairsoft.com/platform/partidas`—, no en la navegación normal. La Task 1 es entonces un *hardening* de ese camino directo, no el mecanismo que habilita `muro_login` en el caso normal: ese lo habilita el `redirect()` de cada `page.tsx`.

- [ ] **Step 2: Pasar el destino**

```ts
      const loginUrl = url.clone();
      loginUrl.pathname = "/platform/login";
      // Preservamos a donde queria ir para (a) devolverla ahi despues de
      // loguearse y (b) poder medir que la freno el muro y hacia donde iba.
      // `url.pathname` viene con el prefijo /platform del rewrite; lo sacamos
      // porque el login redirige a rutas sin ese prefijo.
      const destino = url.pathname.replace(/^\/platform/, "") || "/";
      loginUrl.search = "";
      if (destino !== "/" && destino !== "/login") {
        loginUrl.searchParams.set("next", destino);
      }
      const redirectResponse = NextResponse.redirect(loginUrl);
```

**Cuidado:** el resto del bloque (copiar las cookies de sesión al `redirectResponse` y aplicar la cookie de atribución) **queda exactamente igual**. Solo cambia la construcción de `loginUrl`.

- [ ] **Step 3: Verificar que `login/page.tsx` sanitiza el `next`**

Leé `app/platform/login/page.tsx`. Ya tiene:

```ts
const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
```

Confirmá que ese guard sigue cubriendo lo que ahora manda el proxy. **No lo modifiques** — previene open redirect y está bien.

- [ ] **Step 4: Verificar**

Run: `pnpm build && pnpm test`
Expected: build limpio, `ƒ Proxy (Middleware)` presente, 194 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add proxy.ts
git commit -m "fix(proxy): preservar el destino al redirigir a login

El proxy corre antes que las page.tsx, asi que su redirect a /login era el
que ganaba y perdia el ?next=. La persona terminaba en la home despues de
loguearse en vez de en la partida que queria ver.

Ademas es el dato que hace util al evento muro_login: sin el sabemos que
alguien choco el muro, pero no hacia donde iba.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Evento `muro_login`

**Files:**
- Modify: `app/platform/login/page.tsx`

**Interfaces:**
- Consumes: el `?next=` que produce la Task 1; el componente `TrackEvent` de `app/_components/track-event.tsx`.
- Produces: evento GA4 `muro_login` con `{ destino }`.

- [ ] **Step 1: Ubicar el punto**

`app/platform/login/page.tsx` ya desestructura `next` de `searchParams` y ya calcula `dest`. También ya monta `<TrackEvent event="sign_up" ... />` dentro del bloque `if (signup === "ok")`.

El evento nuevo va en el render normal (el que muestra el formulario de login), **no** dentro del bloque de `signup === "ok"` — alguien que viene de registrarse no chocó ningún muro.

- [ ] **Step 2: Disparar el evento**

En el JSX del login normal, cerca del inicio:

```tsx
        {/* Llego acá porque quiso entrar a algo que requiere cuenta. Es el
            primer escalon del embudo de registro y hoy es invisible: sin
            esto no se puede distinguir "no le interesó crear cuenta" de
            "ni siquiera pudo ver las partidas". */}
        {next && (
          <TrackEvent
            event="muro_login"
            params={{ destino: dest }}
            once={`muro_login:${dest}`}
          />
        )}
```

`once` lleva el destino en la clave para que dos muros distintos en la misma sesión se cuenten los dos, pero un reload de la misma página no duplique.

Usá `dest` (ya sanitizado), no `next` crudo.

- [ ] **Step 3: Verificar**

Run: `pnpm build && pnpm test`
Expected: build limpio, 194 tests en verde.

- [ ] **Step 4: Commit**

```bash
git add app/platform/login/page.tsx
git commit -m "feat(analytics): evento muro_login

Primer escalon del embudo de registro, hoy invisible. Sin el no se puede
distinguir a quien no le interesa crear cuenta de quien ni siquiera pudo
ver que partidas hay: /partidas requiere sesion para MIRAR, no solo para
anotarse.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Eventos `signup_iniciado` y `signup_error`

Los dos que dicen si el formulario es el obstáculo, y cuál campo.

**Files:**
- Modify: `app/platform/signup/signup-form.tsx`

**Interfaces:**
- Consumes: `track` de `lib/ga.ts`.
- Produces: eventos GA4 `signup_iniciado` (sin params) y `signup_error` con `{ campos: string }`.

- [ ] **Step 1: Leer el formulario**

`app/platform/signup/signup-form.tsx` usa `useActionState(signupAction, initial)`.

La forma exacta ya está verificada, no la adivines. En `lib/errors.ts:393`:

```ts
export type ActionErrorState = {
  error: FriendlyError;
  formErrors?: Record<string, string[]>;
};
```

La clave es **`formErrors`**, no `fieldErrors`. Y el formulario ya la extrae en la línea 49:

```ts
const formErrors = state && "formErrors" in state ? state.formErrors : undefined;
```

O sea que ya tenés la variable lista para usar. El archivo importa `useActionState, useState, useTransition` de React pero **no `useEffect`** — vas a tener que agregarlo al import.

- [ ] **Step 2: `signup_iniciado` al montar**

```tsx
  // Abrio el formulario. Es el denominador del embudo de registro: contra
  // esto se mide cuantos lo completan.
  useEffect(() => {
    track("signup_iniciado");
  }, []);
```

- [ ] **Step 3: `signup_error` cuando la validación falla**

```tsx
  // Que campo lo freno. Va el NOMBRE del campo, nunca el valor: es PII.
  // Ordenado y unido para que GA agrupe combinaciones iguales.
  useEffect(() => {
    if (!formErrors) return;
    const nombres = Object.keys(formErrors).sort().join(",");
    if (!nombres) return;
    track("signup_error", { campos: nombres });
  }, [formErrors]);
```

Usá la variable `formErrors` que el componente ya calcula en la línea 49. **No** vuelvas a derivarla del `state`.

Un detalle de dependencias: `formErrors` es un objeto nuevo en cada render cuando existe, así que ponerlo directo en el array de deps puede re-disparar el evento en renders que no son un intento nuevo. Serializá la lista de nombres y dependé de ese string, como ya hace `TrackEvent` con `serialized`:

```ts
  const camposConError = formErrors
    ? Object.keys(formErrors).sort().join(",")
    : "";

  useEffect(() => {
    if (!camposConError) return;
    track("signup_error", { campos: camposConError });
  }, [camposConError]);
```

- [ ] **Step 4: Verificar que no se manda PII**

Releé tu propio cambio y confirmá que en ningún caso el objeto de params puede contener un valor tipeado por la persona (DNI, celular, email, nombre). Solo claves.

- [ ] **Step 5: Verificar**

Run: `pnpm build && pnpm test`
Expected: build limpio, 194 tests en verde.

- [ ] **Step 6: Commit**

```bash
git add app/platform/signup/signup-form.tsx
git commit -m "feat(analytics): eventos signup_iniciado y signup_error

El formulario pide 8 campos, entre ellos DNI y un numero de jugador de 6
digitos. signup_error manda el NOMBRE del campo que fallo (nunca el valor,
que es PII), que es lo que permite saber si alguno de esos dos es el que
frena a la gente.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Evento `email_confirmado`

El último tramo ciego: alguien que se registró pero nunca confirmó el mail hoy es indistinguible de alguien que confirmó y no volvió.

**Files:**
- Modify: `app/platform/auth/callback/route.ts`
- Modify: `app/platform/layout.tsx`
- Modify: `lib/ga.ts`

**Interfaces:**
- Consumes: `ParamEventTracker` de `app/_components/track-event.tsx`.
- Produces: evento GA4 `email_confirmado`.

- [ ] **Step 1: Marcar el redirect en el callback**

En `app/platform/auth/callback/route.ts`, después de que `verifyOtp` sale bien y ya se calculó `dest`, agregá el marcador **solo para `type === "signup"`** (recovery, invite y email_change no son confirmaciones de registro):

```ts
  // Sanitizar `next` para evitar open redirect: solo path relativo permitido.
  if (!dest.startsWith("/")) dest = "/partidas";

  // Marcador para medir la confirmacion de mail, que es el ultimo tramo
  // ciego del embudo: hoy quien se registro y nunca confirmo es
  // indistinguible de quien confirmo y no volvio. Lo limpia
  // ParamEventTracker con router.replace.
  const url = new URL(`${origin}${dest}`);
  if (type === "signup") url.searchParams.set("confirmado", "1");

  return NextResponse.redirect(url.toString(), { status: 302 });
```

- [ ] **Step 2: Capturarlo en el layout**

En `app/platform/layout.tsx`, al lado del `ParamEventTracker` de `login` que ya existe:

```tsx
        <ParamEventTracker param="confirmado" event="email_confirmado" />
```

Mirá cómo está montado el de `login` (línea ~60) y seguí exactamente ese patrón, incluido el límite de Suspense si lo tiene — `ParamEventTracker` usa `useSearchParams`.

- [ ] **Step 3: Sumarlo a los params marcadores**

La constante `PARAMS_MARCADORES` está en `app/_components/google-analytics.tsx:14` (ya verificado; **no** está en `lib/ga.ts`). Hoy vale `["login", "creado"]`. Sumá `"confirmado"` a la lista para que el `page_view` manual no cuente dos veces la misma página cuando `router.replace` limpia la URL.

- [ ] **Step 4: Verificar**

Run: `pnpm build && pnpm test`
Expected: build limpio, 194 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add app/platform/auth/callback/route.ts app/platform/layout.tsx app/_components/google-analytics.tsx
git commit -m "feat(analytics): evento email_confirmado

Ultimo tramo ciego del embudo. Hoy quien se registro y nunca confirmo el
mail es indistinguible de quien confirmo y no volvio, que son dos problemas
distintos con soluciones distintas.

Solo se marca type=signup: recovery, invite y email_change no son
confirmaciones de registro.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verificación final del plan

- [ ] `pnpm test` — 194 en verde.
- [ ] `pnpm build` — sin errores, `ƒ Proxy (Middleware)` presente.
- [ ] Ningún evento nuevo lleva un valor tipeado por una persona.

**Verificación manual, post-deploy:** en GA4 → DebugView, con `?debug_mode=1`:

1. Entrar deslogueado a `app.experienciaairsoft.com/partidas` → tiene que aparecer `muro_login` con `destino: "/partidas"`, y la URL de login tiene que traer `?next=/partidas`.
2. Ir a signup → `signup_iniciado`.
3. Mandar el formulario con el DNI mal → `signup_error` con `campos: "dni"`. Confirmar que **no** aparece el valor.
4. Completarlo bien → `sign_up`.
5. Confirmar el mail → `email_confirmado`.
6. Loguearse → `login`, y tiene que volver a `/partidas`, no a la home.

**El embudo queda así**, y se puede cruzar por canal con la atribución de la Fase 1:

```
reservar_click → muro_login → signup_iniciado → [signup_error] →
sign_up → email_confirmado → login → anotarse_partida
```

## Lo que este plan deja afuera (a propósito)

- **Bajar el muro de `/partidas`.** Hacer la lista de partidas visible sin cuenta es probablemente el cambio de producto con más impacto, pero es una decisión de negocio, no de instrumentación. Este plan la hace medible; no la toma.
- **Acortar el formulario.** Idem: primero el dato de qué campo frena.
- **Convertir guests en cuentas.** Los 212 guests sin cuenta son el volumen más grande y no pasan por este embudo en absoluto. Es un problema aparte.
- **Eventos de scroll o de tiempo en página.** Ruido para esta pregunta.
