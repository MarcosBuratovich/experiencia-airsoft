# Atribución del funnel de reserva (Fase 1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capturar de dónde viene cada persona en su primer contacto con el sitio, y persistir ese origen hasta la reserva y hasta el registro, para poder responder con SQL qué canal trae gente que efectivamente reserva y paga.

**Architecture:** Una cookie first-party `ea_attr` en el dominio raíz —igual que `_gcl_aw`, para sobrevivir el salto www → app— que un componente cliente escribe **una sola vez** en el primer pageview. Al momento de convertir, dos server actions la leen y copian el origen a `inscripciones` y a `profiles`. La lógica de parseo y validación es una **función pura, sin `next/headers`**, para que sea testeable con el patrón de inyección que ya usa el repo.

**Tech Stack:** Next.js 16.2.6 (App Router), TypeScript, Supabase (Postgres + RLS), Vitest 4.1.10, pnpm.

## Global Constraints

- **Gestor de paquetes: `pnpm`.** `npm` rompe el árbol de dependencias de este repo (`node_modules/.pnpm`).
- **Antes de escribir código de Next, leer la guía correspondiente en `node_modules/next/dist/docs/`** (mandato de `AGENTS.md`: esta no es la versión de Next que conocés).
- **Una reserva jamás se puede perder por un tema de analytics.** Todo insert con atribución lleva reintento sin ella. Es el principio que ya rige `solicitarPrivadaAction` (`app/platform/privada/actions.ts:117-137`).
- **Migraciones:** archivo nuevo `db/schema-phase-20.sql`, idempotente (`if not exists`), comentado en español con las secciones `PROBLEMA QUE RESUELVE` y `CÓMO FUNCIONA`. **Nunca se edita una fase anterior.** Se aplica a mano en el SQL Editor de Supabase (no hay CLI de migraciones).
- **Tests:** solo corren los que matchean `lib/**/*.test.ts` (ver `vitest.config.ts`). Environment `node`, sin `setupFiles`. Un test en `app/` **no se ejecuta**.
- **Nada de PII.** Se guarda `referrer_host` (solo el host), nunca la URL completa. Coherente con `sanitizarUrl()` de `lib/ga.ts`.
- **Los commits terminan con:** `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`

## Corrección al spec

El spec (`docs/superpowers/specs/2026-08-26-atribucion-funnel-reserva-design.md`) describe un único `leerAtribucion()` que llama a `cookies()` de `next/headers`, espejando `lib/gclid.ts`.

**Eso no es testeable con los patrones de este repo.** No existe ningún test que mockee `next/headers` (`lib/gclid.ts` no tiene tests), el patrón establecido es inyección de dependencias, y `vitest.config.ts` ni siquiera incluiría un test ubicado en `app/`.

Este plan lo parte en dos, sin cambiar el comportamiento:

| Función | Responsabilidad | Testeable |
|---|---|---|
| `parsearAtribucion(raw)` | Parseo + validación + sanitización. **Función pura**, recibe el string crudo. | Sí, sin mocks |
| `leerAtribucion()` | Wrapper de 4 líneas: lee `cookies()` y delega en la pura. | No hace falta |

Toda la lógica que puede fallar vive en la función pura. El wrapper no tiene lógica que testear.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `db/schema-phase-20.sql` | Columnas de atribución en `inscripciones` y `profiles` + `handle_new_user()` actualizado |
| `lib/atribucion.ts` | Tipo `Atribucion`, claves de la cookie, `parsearAtribucion()` (pura) y `leerAtribucion()` (wrapper) |
| `lib/atribucion.test.ts` | Tests de `parsearAtribucion()` |
| `app/_components/captura-atribucion.tsx` | Client component: escribe la cookie en el primer pageview |
| `app/layout.tsx:142-148` | Montaje del componente junto a los otros trackers |
| `app/platform/partidas/[id]/actions.ts` | `anotarmeAction` escribe la atribución en `inscripciones` |
| `app/platform/actions/auth.ts` | `signupAction` manda la atribución en `options.data` |

**Por qué así:** `lib/atribucion.ts` no importa nada de Supabase ni de React, así que se puede testear y reusar desde cualquier server action. El componente de captura es lo único que toca el browser y no tiene lógica de negocio: arma el objeto y lo escribe.

---

### Task 1: Migración fase 20

Sin las columnas, todo lo demás no tiene dónde escribir. Va primero porque el resto reintenta sin ella y quedaría silenciosamente sin datos.

**Files:**
- Create: `db/schema-phase-20.sql`

**Interfaces:**
- Produces: columnas `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `referrer_host`, `landing_path`, `atribucion_first_seen_at` en `public.inscripciones` y en `public.profiles`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- =========================================================================
-- Experiencia Airsoft — Fase 20: atribución del funnel de reserva
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- PROBLEMA QUE RESUELVE
-- Hoy no se puede responder qué canal trae gente que efectivamente reserva.
-- GA4 tiene los clicks pero no las reservas; Supabase tiene las reservas y
-- la plata pero no sabe de dónde vino nadie. `solicitudes_privada` guarda
-- `gclid` desde la fase 18, pero solo para privadas y solo para Google Ads.
--
-- CÓMO FUNCIONA
-- Un componente cliente escribe la cookie `ea_attr` en el primer pageview,
-- en el dominio raíz (.experienciaairsoft.com) para que sobreviva el salto
-- www → app. Es first-touch: si la cookie ya existe, no se toca. Al
-- anotarse o al registrarse, el server la lee y copia el origen acá.
--
-- Todas las columnas son nullable a propósito: una inscripción cargada por
-- un admin (walk-in, o alguien que arregló por WhatsApp) no tiene navegador
-- de origen y debe quedar en NULL. NULL significa "no sabemos", que es la
-- verdad, y no hay que confundirlo con "vino directo".
--
-- `atribucion_first_seen_at` guarda cuándo la persona llegó al sitio por
-- primera vez, NO cuándo se escribió la fila. Restado contra `created_at`
-- da cuánto tarda alguien desde que descubre el sitio hasta que reserva.
-- =========================================================================

alter table public.inscripciones
  -- Campaña: de dónde vino (instagram, google), qué tipo de tráfico
  -- (social, cpc, organic) y qué campaña puntual.
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  -- Identificador del clic en un anuncio de Meta.
  add column if not exists fbclid       text,
  -- SOLO el host del referrer (instagram.com), nunca la URL completa: no
  -- queremos guardar por qué páginas navegó la persona.
  add column if not exists referrer_host text,
  -- Primera página del sitio que vio.
  add column if not exists landing_path  text,
  -- Cuándo llegó por primera vez (de la cookie, no del insert).
  add column if not exists atribucion_first_seen_at timestamptz;

alter table public.profiles
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists fbclid       text,
  add column if not exists referrer_host text,
  add column if not exists landing_path  text,
  add column if not exists atribucion_first_seen_at timestamptz;

-- Índices parciales: los reportes agrupan por canal y la enorme mayoría de
-- las filas viejas tienen NULL, no tiene sentido indexarlas.
create index if not exists inscripciones_utm_source_idx
  on public.inscripciones(utm_source)
  where utm_source is not null;

create index if not exists profiles_utm_source_idx
  on public.profiles(utm_source)
  where utm_source is not null;

-- =========================================================================
-- Trigger handle_new_user: sumar la atribución que manda signupAction.
--
-- CUIDADO: esta función está en el camino crítico del registro. Si tira,
-- nadie se puede registrar. Por eso:
--   - `nullif(..., '')` en vez de `coalesce(..., '')`: acá un string vacío
--     tiene que quedar NULL ("no sabemos"), al revés de nombre/apellido que
--     son obligatorios y usan coalesce.
--   - El cast a timestamptz va con regex de validación previa: si llega
--     basura, queda NULL en vez de abortar el registro.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_seen text := new.raw_user_meta_data->>'first_seen_at';
begin
  insert into public.profiles (
    id, nombre, apellido, dni, celular, email, player_number,
    utm_source, utm_medium, utm_campaign, fbclid,
    referrer_host, landing_path, atribucion_first_seen_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', ''),
    coalesce(new.raw_user_meta_data->>'celular', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'player_number', ''),
    nullif(new.raw_user_meta_data->>'utm_source', ''),
    nullif(new.raw_user_meta_data->>'utm_medium', ''),
    nullif(new.raw_user_meta_data->>'utm_campaign', ''),
    nullif(new.raw_user_meta_data->>'fbclid', ''),
    nullif(new.raw_user_meta_data->>'referrer_host', ''),
    nullif(new.raw_user_meta_data->>'landing_path', ''),
    -- Solo casteamos si tiene pinta de ISO-8601. Cualquier otra cosa → NULL.
    case
      when v_first_seen ~ '^\d{4}-\d{2}-\d{2}T'
      then v_first_seen::timestamptz
      else null
    end
  );
  return new;
end;
$$;
```

- [ ] **Step 2: Aplicar la migración**

Abrir el SQL Editor de Supabase, pegar el contenido completo de `db/schema-phase-20.sql` y darle Run.

Expected: `Success. No rows returned.`

- [ ] **Step 3: Verificar que las columnas existen**

Correr en el SQL Editor:

```sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_name in ('inscripciones','profiles')
  and column_name in ('utm_source','utm_medium','utm_campaign','fbclid',
                      'referrer_host','landing_path','atribucion_first_seen_at')
order by table_name, column_name;
```

Expected: 14 filas (7 por tabla), todas con `is_nullable = YES`.

- [ ] **Step 4: Verificar que el registro sigue funcionando**

Esto es lo que puede romper todo. En el SQL Editor, simular lo que hace el trigger:

```sql
-- Debe devolver un timestamptz válido
select case when '2026-08-26T10:00:00.000Z' ~ '^\d{4}-\d{2}-\d{2}T'
            then '2026-08-26T10:00:00.000Z'::timestamptz else null end as ok;
-- Debe devolver NULL, no tirar error
select case when 'basura' ~ '^\d{4}-\d{2}-\d{2}T'
            then 'basura'::timestamptz else null end as debe_ser_null;
```

Expected: la primera devuelve `2026-08-26 10:00:00+00`, la segunda devuelve `null` **sin error**.

- [ ] **Step 5: Commit**

```bash
git add db/schema-phase-20.sql
git commit -m "feat(db): columnas de atribucion en inscripciones y profiles

Fase 20. Agrega utm_source/medium/campaign, fbclid, referrer_host,
landing_path y atribucion_first_seen_at a las dos tablas, mas el trigger
handle_new_user actualizado para bajarlas desde raw_user_meta_data.

Todas nullable a proposito: una inscripcion cargada por un admin no tiene
navegador de origen y debe quedar NULL. NULL es 'no sabemos', distinto de
'vino directo'.

El cast a timestamptz va detras de un regex para que un valor invalido
deje la columna en NULL en vez de abortar el registro.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `lib/atribucion.ts` — parseo puro y lectura de cookie

Toda la lógica que puede fallar vive acá y se testea sin mocks.

**Files:**
- Create: `lib/atribucion.ts`
- Test: `lib/atribucion.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Atribucion = { utm_source, utm_medium, utm_campaign, fbclid, referrer_host, landing_path: string | null; first_seen_at: string }`
  - `const COOKIE_ATRIBUCION = "ea_attr"`
  - `parsearAtribucion(raw: string | undefined | null): Atribucion | null`
  - `leerAtribucion(): Promise<Atribucion | null>`
  - `type ColumnasAtribucion` y `aColumnas(attr: Atribucion): ColumnasAtribucion`

- [ ] **Step 1: Escribir el test que falla**

Crear `lib/atribucion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aColumnas, parsearAtribucion } from "./atribucion";

/** Cookie válida, con las claves cortas que escribe el cliente. */
const COMPLETA = JSON.stringify({
  s: "instagram",
  m: "social",
  c: "reels-agosto",
  f: "IwAR0abc-DEF_123",
  r: "instagram.com",
  l: "/precios",
  t: "2026-08-26T10:00:00.000Z",
});

describe("parsearAtribucion", () => {
  it("parsea una cookie completa", () => {
    expect(parsearAtribucion(COMPLETA)).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "reels-agosto",
      fbclid: "IwAR0abc-DEF_123",
      referrer_host: "instagram.com",
      landing_path: "/precios",
      first_seen_at: "2026-08-26T10:00:00.000Z",
    });
  });

  it("devuelve null si no hay cookie", () => {
    expect(parsearAtribucion(undefined)).toBeNull();
    expect(parsearAtribucion(null)).toBeNull();
    expect(parsearAtribucion("")).toBeNull();
  });

  it("devuelve null si el JSON está corrupto", () => {
    expect(parsearAtribucion("{no es json")).toBeNull();
    expect(parsearAtribucion("[1,2,3]")).toBeNull();
    expect(parsearAtribucion('"un string"')).toBeNull();
  });

  it("parsea la cookie tal como la escribe el cliente (URL-encoded)", () => {
    // El componente escribe encodeURIComponent(JSON.stringify(...)). Según
    // quién lea la cookie puede llegar codificada o no; las dos tienen que
    // funcionar o la atribución se pierde entera y en silencio.
    expect(parsearAtribucion(encodeURIComponent(COMPLETA))).toEqual(
      parsearAtribucion(COMPLETA),
    );
  });

  it("devuelve null si falta el timestamp o es inválido", () => {
    expect(parsearAtribucion(JSON.stringify({ s: "google" }))).toBeNull();
    expect(parsearAtribucion(JSON.stringify({ s: "google", t: "ayer" }))).toBeNull();
  });

  it("acepta una cookie que solo tiene timestamp (tráfico directo)", () => {
    const solo = JSON.stringify({ t: "2026-08-26T10:00:00.000Z" });
    expect(parsearAtribucion(solo)).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      fbclid: null,
      referrer_host: null,
      landing_path: null,
      first_seen_at: "2026-08-26T10:00:00.000Z",
    });
  });

  it("descarta campos sucios sin invalidar el resto", () => {
    const sucio = JSON.stringify({
      s: "instagram",
      m: "<script>alert(1)</script>",
      r: "instagram.com",
      t: "2026-08-26T10:00:00.000Z",
    });
    const r = parsearAtribucion(sucio);
    expect(r?.utm_source).toBe("instagram");
    expect(r?.utm_medium).toBeNull();
    expect(r?.referrer_host).toBe("instagram.com");
  });

  it("descarta campos que no son string", () => {
    const raro = JSON.stringify({ s: 42, m: { a: 1 }, t: "2026-08-26T10:00:00.000Z" });
    const r = parsearAtribucion(raro);
    expect(r?.utm_source).toBeNull();
    expect(r?.utm_medium).toBeNull();
  });

  it("trunca valores muy largos en vez de descartarlos", () => {
    const largo = JSON.stringify({ s: "a".repeat(500), t: "2026-08-26T10:00:00.000Z" });
    expect(parsearAtribucion(largo)?.utm_source).toHaveLength(100);
  });

  it("permite los caracteres reales de un landing path", () => {
    const p = JSON.stringify({ l: "/blog/que-es-airsoft", t: "2026-08-26T10:00:00.000Z" });
    expect(parsearAtribucion(p)?.landing_path).toBe("/blog/que-es-airsoft");
  });
});

describe("aColumnas", () => {
  it("mapea first_seen_at a la columna atribucion_first_seen_at", () => {
    const attr = parsearAtribucion(COMPLETA)!;
    expect(aColumnas(attr)).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "reels-agosto",
      fbclid: "IwAR0abc-DEF_123",
      referrer_host: "instagram.com",
      landing_path: "/precios",
      atribucion_first_seen_at: "2026-08-26T10:00:00.000Z",
    });
  });

  it("no deja ninguna clave que no sea columna real", () => {
    const attr = parsearAtribucion(COMPLETA)!;
    expect(Object.keys(aColumnas(attr))).not.toContain("first_seen_at");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./atribucion"`.

- [ ] **Step 3: Escribir la implementación**

Crear `lib/atribucion.ts`:

```ts
import { cookies } from "next/headers";

/**
 * Atribución de origen — de dónde vino la persona la PRIMERA vez.
 *
 * La escribe `CapturaAtribucion` en el navegador y la leen las server
 * actions al momento de convertir. Es first-touch: si la cookie ya existe
 * no se toca nunca más.
 *
 * La cookie usa claves de una letra a propósito. Viaja en CADA request al
 * dominio (incluidos los assets estáticos), así que cada byte se paga
 * muchas veces por visita.
 */
export const COOKIE_ATRIBUCION = "ea_attr";

/** 400 días: el techo que respeta Chrome para cookies. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export type Atribucion = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  /** ISO-8601. Cuándo se vio a esta persona por primera vez. */
  first_seen_at: string;
};

/** Clave corta en la cookie → nombre del campo. */
const CLAVES = {
  s: "utm_source",
  m: "utm_medium",
  c: "utm_campaign",
  f: "fbclid",
  r: "referrer_host",
  l: "landing_path",
} as const;

/**
 * Caracteres permitidos. Alcanza para un utm real (`reels-agosto`), un
 * host (`instagram.com`), un path (`/blog/que-es-airsoft`) y un fbclid
 * (alfanumérico con `-` y `_`). Todo lo demás se descarta: el contenido
 * viene del cliente y es manipulable.
 */
const LIMPIO = /^[\w./-]+$/;

const MAX_LARGO = 100;
/** Los fbclid son largos de verdad. */
const MAX_LARGO_FBCLID = 255;

function sanitizar(valor: unknown, max: number): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim();
  if (!v) return null;
  if (!LIMPIO.test(v)) return null;
  return v.slice(0, max);
}

/**
 * Parsea el contenido crudo de la cookie. Función pura: no toca
 * `next/headers`, así que se testea sin mocks.
 *
 * Devuelve `null` si no hay cookie, si está corrupta o si no trae un
 * `first_seen_at` válido — sin ese dato la fila no sirve para nada.
 * Un campo suelto inválido NO invalida el resto: se descarta solo ese.
 */
export function parsearAtribucion(
  raw: string | undefined | null,
): Atribucion | null {
  if (!raw) return null;

  // El cliente escribe con encodeURIComponent. Del lado del server, según
  // quién lea la cookie, puede llegar ya decodificada o no. En vez de
  // depender de eso, probamos las dos formas: primero tal cual, y si no
  // parsea, decodificada.
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    try {
      obj = JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return null;

  const src = obj as Record<string, unknown>;

  // Sin timestamp válido no hay atribución que valga.
  const t = src.t;
  if (typeof t !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(t)) return null;
  if (Number.isNaN(Date.parse(t))) return null;

  const out = { first_seen_at: t } as Atribucion;
  for (const [clave, campo] of Object.entries(CLAVES)) {
    const max = campo === "fbclid" ? MAX_LARGO_FBCLID : MAX_LARGO;
    out[campo] = sanitizar(src[clave], max);
  }
  return out;
}

/**
 * Lee la cookie del request. Wrapper delgado sobre `parsearAtribucion`:
 * toda la lógica que puede fallar está en la función pura.
 */
export async function leerAtribucion(): Promise<Atribucion | null> {
  try {
    const c = await cookies();
    return parsearAtribucion(c.get(COOKIE_ATRIBUCION)?.value);
  } catch {
    return null;
  }
}

/** Las columnas tal como se llaman en Postgres. */
export type ColumnasAtribucion = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  atribucion_first_seen_at: string;
};

/**
 * Mapea al nombre de las columnas. Existe porque `first_seen_at` se llama
 * `atribucion_first_seen_at` en la base: un spread directo de `Atribucion`
 * mandaría una columna inexistente y el insert fallaría SIEMPRE.
 * No reemplazar esto por `{ ...attr }`.
 */
export function aColumnas(attr: Atribucion): ColumnasAtribucion {
  return {
    utm_source: attr.utm_source,
    utm_medium: attr.utm_medium,
    utm_campaign: attr.utm_campaign,
    fbclid: attr.fbclid,
    referrer_host: attr.referrer_host,
    landing_path: attr.landing_path,
    atribucion_first_seen_at: attr.first_seen_at,
  };
}
```

- [ ] **Step 4: Correr los tests**

Run: `pnpm test`
Expected: PASS — los 12 tests nuevos en verde, y los 162 que ya existían siguen pasando.

- [ ] **Step 5: Commit**

```bash
git add lib/atribucion.ts lib/atribucion.test.ts
git commit -m "feat(atribucion): parseo y lectura de la cookie ea_attr

parsearAtribucion() es pura y recibe el string crudo, siguiendo el patron
de inyeccion del repo: no hay ningun test que mockee next/headers y no
queriamos introducir ese patron. leerAtribucion() queda como wrapper de
cuatro lineas sin logica que testear.

aColumnas() existe porque first_seen_at se llama atribucion_first_seen_at
en la base; un spread directo mandaria una columna inexistente y el insert
fallaria siempre.

Claves de una letra en la cookie: viaja en cada request al dominio,
incluidos los assets, asi que cada byte se paga muchas veces por visita.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Componente de captura en el navegador

**Files:**
- Create: `app/_components/captura-atribucion.tsx`
- Modify: `app/layout.tsx` (imports y el bloque `<body>`, líneas 142-148)

**Interfaces:**
- Consumes: `COOKIE_ATRIBUCION` y `COOKIE_MAX_AGE` de `lib/atribucion.ts`; `esHostProduccion` de `lib/ga.ts`.
- Produces: `<CapturaAtribucion />`.

- [ ] **Step 1: Crear el componente**

Crear `app/_components/captura-atribucion.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { COOKIE_ATRIBUCION, COOKIE_MAX_AGE } from "@/lib/atribucion";
import { esHostProduccion } from "@/lib/ga";

/**
 * Escribe la cookie `ea_attr` en el PRIMER pageview y nunca más.
 *
 * First-touch a propósito: la pregunta del negocio es qué canal TRAE gente
 * que reserva, no qué click cerró la venta. Si la cookie ya existe, este
 * componente no hace absolutamente nada.
 *
 * La cookie va en el dominio raíz para sobrevivir el salto www → app, el
 * mismo motivo por el que funciona `_gcl_aw` (ver lib/gclid.ts).
 */
export function CapturaAtribucion() {
  useEffect(() => {
    try {
      // Ya la tenemos: es un visitante que vuelve. No se toca.
      if (document.cookie.includes(`${COOKIE_ATRIBUCION}=`)) return;

      // Fuera de producción no ensuciamos: localhost y previews quedan sin
      // atribución, igual que los hits internos de GA.
      if (!esHostProduccion(window.location.hostname)) return;

      const q = new URLSearchParams(window.location.search);

      let refHost: string | null = null;
      try {
        const r = document.referrer;
        // Un referrer de nuestro propio dominio no es un origen: es
        // navegación interna.
        if (r) {
          const h = new URL(r).hostname;
          if (!esHostProduccion(h)) refHost = h;
        }
      } catch {
        refHost = null;
      }

      // Claves de una letra: la cookie viaja en cada request.
      const datos: Record<string, string> = { t: new Date().toISOString() };
      const s = q.get("utm_source");
      const m = q.get("utm_medium");
      const c = q.get("utm_campaign");
      const f = q.get("fbclid");
      if (s) datos.s = s;
      if (m) datos.m = m;
      if (c) datos.c = c;
      if (f) datos.f = f;
      if (refHost) datos.r = refHost;
      datos.l = window.location.pathname;

      const valor = encodeURIComponent(JSON.stringify(datos));
      document.cookie =
        `${COOKIE_ATRIBUCION}=${valor}; ` +
        `domain=.experienciaairsoft.com; path=/; ` +
        `max-age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`;
    } catch {
      // Analytics jamás rompe la página.
    }
  }, []);

  return null;
}
```

- [ ] **Step 2: Montarlo en el layout**

En `app/layout.tsx`, agregar el import junto a los otros de `_components` (líneas 4-6):

```tsx
import { CapturaAtribucion } from "./_components/captura-atribucion";
```

Y montarlo en el `<body>` **antes** de `<GoogleAnalytics />`, para que la cookie exista lo antes posible:

```tsx
<body className="relative">
  <CapturaAtribucion />
  <GoogleAnalytics />
  <MetaPixel />
  <SiteJsonLd />
  {children}
</body>
```

- [ ] **Step 3: Verificar que compila**

Run: `pnpm build`
Expected: build exitoso, sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add app/_components/captura-atribucion.tsx app/layout.tsx
git commit -m "feat(atribucion): capturar origen en el primer pageview

Componente cliente que escribe la cookie ea_attr una sola vez, en el
dominio raiz para sobrevivir el salto www -> app.

Descarta el referrer propio: un referrer de nuestro dominio es navegacion
interna, no un origen. Fue justamente lo que confundio el reporte de
Vercel del pico de agosto.

Fuera de produccion no escribe nada, reusando esHostProduccion() de
lib/ga.ts, para no ensuciar con localhost ni previews.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Escribir la atribución al anotarse

**Files:**
- Modify: `app/platform/partidas/[id]/actions.ts` (import y el insert de `anotarmeAction`, alrededor de la línea 125)

**Interfaces:**
- Consumes: `leerAtribucion`, `aColumnas` de `lib/atribucion.ts`.

- [ ] **Step 1: Agregar el import**

En `app/platform/partidas/[id]/actions.ts`, junto a los imports existentes:

```ts
import { aColumnas, leerAtribucion } from "@/lib/atribucion";
```

- [ ] **Step 2: Reemplazar el insert**

El insert actual (alrededor de la línea 125) arma un objeto literal directo. Extraerlo a `base` y agregar el reintento:

```ts
  const base = {
    partida_id: partidaId,
    user_id: user.id,
    estado,
    posicion_waitlist,
    tipo_jugador,
    alquila_marcadora: alquila.marcadora,
    alquila_premium: alquila.premium,
    alquila_chaleco: alquila.chaleco,
    precio_entrada: transf.entrada,
    precio_alquiler: transf.alquiler,
    precio_fijo_efectivo: efec.total,
    // recargas se asignan despues por el admin durante el check-in
  };

  // De dónde vino esta persona la primera vez. Si la migración fase 20
  // todavía no corrió, o la cookie está corrupta, la inscripción se crea
  // igual: una reserva jamás se pierde por un tema de analytics.
  const attr = await leerAtribucion();
  const conAttr = attr ? { ...base, ...aColumnas(attr) } : base;

  let { error } = await supabase.from("inscripciones").insert(conAttr);
  if (error && attr) {
    console.error(
      "[anotarmeAction] insert con atribución falló, reintento sin ella:",
      error.message,
    );
    ({ error } = await supabase.from("inscripciones").insert(base));
  }
```

El objeto `base` de arriba es **exactamente** el que ya estaba en el insert original (los 12 campos, sin cambiar ningún valor). El único cambio es extraerlo a una variable para poder reintentar con él. El bloque que sigue —`if (error) { console.error(...); return ERR(error); }`, los `revalidatePath` y el envío a `enviarEventoMeta`— queda igual, sin tocar.

- [ ] **Step 3: Verificar que compila y que nada se rompió**

Run: `pnpm build && pnpm test`
Expected: build exitoso y los tests en verde.

- [ ] **Step 4: Commit**

```bash
git add "app/platform/partidas/[id]/actions.ts"
git commit -m "feat(atribucion): guardar origen al anotarse a una partida

Con reintento sin atribucion si el insert falla, igual que
solicitarPrivadaAction: una reserva jamas se pierde por analytics.

agregarWalkinAction y organizador-actions no se tocan a proposito: esas
inscripciones no tienen navegador de origen y deben quedar en NULL.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Escribir la atribución al registrarse

**Files:**
- Modify: `app/platform/actions/auth.ts` (import y la llamada a `signUp`, alrededor de la línea 71)

**Interfaces:**
- Consumes: `leerAtribucion` de `lib/atribucion.ts`. El trigger `handle_new_user()` de la Task 1 baja los campos a `profiles`.

- [ ] **Step 1: Agregar el import**

```ts
import { leerAtribucion } from "@/lib/atribucion";
```

- [ ] **Step 2: Mandar la atribución en `options.data`**

Reemplazar la llamada a `signUp` (alrededor de la línea 71):

```ts
  // El origen viaja en el metadata del usuario; handle_new_user() lo baja a
  // profiles. Si no hay cookie, no se manda nada y las columnas quedan NULL.
  const attr = await leerAtribucion();
  const datosAttr = attr
    ? {
        utm_source: attr.utm_source ?? "",
        utm_medium: attr.utm_medium ?? "",
        utm_campaign: attr.utm_campaign ?? "",
        fbclid: attr.fbclid ?? "",
        referrer_host: attr.referrer_host ?? "",
        landing_path: attr.landing_path ?? "",
        first_seen_at: attr.first_seen_at,
      }
    : {};

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre, apellido, dni, celular, player_number,
        ...datosAttr,
      },
      emailRedirectTo: `${appUrl}/`,
    },
  });
```

**Por qué `?? ""` acá y no `null`:** el metadata de Supabase serializa a JSON y el trigger usa `nullif(..., '')`, que convierte el string vacío en `NULL`. Mandar `null` directo también funcionaría, pero `""` mantiene el tipo uniforme en el JSON.

- [ ] **Step 3: Verificar que compila**

Run: `pnpm build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add app/platform/actions/auth.ts
git commit -m "feat(atribucion): guardar origen al registrarse

Los campos viajan en options.data del signUp y handle_new_user() los baja
a profiles. Atribuir el registro ademas de la reserva permite separar dos
fugas distintas: un canal que trae gente que se registra pero no reserva
tiene un problema de producto; uno que no trae ni registros tiene un
problema de mensaje.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Verificación end-to-end en producción

No hay forma de probar la cookie de dominio raíz ni el salto www → app en local: `esHostProduccion()` corta la escritura fuera de `experienciaairsoft.com`. Esta tarea se hace después de deployar.

**Files:** ninguno.

- [ ] **Step 1: Deployar a producción**

- [ ] **Step 2: Verificar que la cookie se escribe**

Entrar a `https://www.experienciaairsoft.com/?utm_source=test_plan&utm_medium=qa`. En la consola del navegador:

```js
document.cookie.split("; ").find(c => c.startsWith("ea_attr="))
```

Expected: una cookie con `s: "test_plan"` y `m: "qa"` (URL-encoded).

- [ ] **Step 3: Verificar que es first-touch**

Navegar a `https://www.experienciaairsoft.com/precios?utm_source=OTRO_DISTINTO` y volver a leer la cookie.

Expected: sigue diciendo `test_plan`. **Si dice `OTRO_DISTINTO`, el guard de "ya existe" está roto** y hay que volver a la Task 3.

- [ ] **Step 4: Verificar el salto cross-domain**

Sin borrar la cookie, ir a `https://app.experienciaairsoft.com/partidas` y leerla de nuevo.

Expected: la cookie sigue presente con `test_plan`. Si no aparece, el `domain=.experienciaairsoft.com` no se aplicó.

- [ ] **Step 5: Verificar la escritura en `inscripciones`**

Con esa misma sesión, registrarse con una cuenta de prueba y anotarse a una partida. Después, en el SQL Editor:

```sql
select utm_source, utm_medium, referrer_host, landing_path,
       atribucion_first_seen_at, created_at
from inscripciones
where utm_source is not null
order by created_at desc
limit 5;
```

Expected: una fila con `utm_source = 'test_plan'` y `atribucion_first_seen_at` **anterior** a `created_at`.

- [ ] **Step 6: Verificar la escritura en `profiles`**

```sql
select email, utm_source, utm_medium, atribucion_first_seen_at
from profiles
where utm_source is not null
order by created_at desc
limit 5;
```

Expected: la cuenta de prueba con `utm_source = 'test_plan'`.

- [ ] **Step 7: Verificar que los walk-ins quedan en NULL**

Cargar un walk-in desde el check-in del admin y confirmar:

```sql
select id, guest_nombre, agregado_por, utm_source
from inscripciones
where agregado_por is not null
order by created_at desc
limit 5;
```

Expected: `utm_source` en `NULL`. Si trae la atribución del admin que lo cargó, es un bug: significa que `agregarWalkinAction` se tocó por error.

- [ ] **Step 8: Verificar la degradación con cookie corrupta**

Es la verificación de "una reserva jamás se pierde por analytics". En la
consola del navegador, ensuciar la cookie a mano:

```js
document.cookie = "ea_attr=%7Bcorrupta; domain=.experienciaairsoft.com; path=/";
```

Después anotarse a una partida.

Expected: la inscripción **se crea igual**, con las columnas de atribución en
`NULL`. Si tira error, el `try/catch` de `leerAtribucion()` no está haciendo su
trabajo y hay que volver a la Task 2.

- [ ] **Step 9: Limpiar los datos de prueba**

```sql
delete from inscripciones where utm_source = 'test_plan';
-- y borrar la cuenta de prueba desde el panel de Auth de Supabase
```

---

## Verificación final del plan

- [ ] `pnpm test` — los 162 tests existentes más los 12 nuevos, todos en verde.
- [ ] `pnpm build` — sin errores de TypeScript.
- [ ] Las 6 tareas commiteadas por separado.
- [ ] La Task 6 completa en producción, con los datos de prueba borrados.

Cuando esté todo, la pregunta del negocio se responde con esto:

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

## Lo que este plan deja afuera (a propósito)

- **Fase 2 — pasos intermedios del registro.** Hoy se ve `reservar_click` y se ve `anotarse_partida`, pero nada en el medio. Se planifica después de correr la query de Fase 0, que puede mostrar que la fuga real está en otro lado.
- **Fase 3 — loop de WhatsApp.** Requiere un cambio operativo, no solo código.
- **Dashboard en el admin.** SQL primero; panel cuando sepamos qué se mira a diario.
- **Backfill de filas viejas.** No hay dato de origen para recuperar. Las inscripciones anteriores a este deploy quedan en `NULL` para siempre, y está bien: `NULL` es "no sabemos".
- **`agregarWalkinAction` y `organizador-actions.ts`.** Esas inscripciones no tienen navegador de origen y deben quedar en `NULL`.
