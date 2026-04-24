-- =========================================================================
-- Experiencia Airsoft — Fase 3C migration: clanes self-serve
-- Correr una sola vez en Supabase SQL Editor, despues de schema-phase-3b.sql.
-- Idempotente.
-- =========================================================================

-- ---------- clanes -------------------------------------------------------
create table if not exists public.clanes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text not null check (length(nombre) between 2 and 40),
  descripcion text,
  color_hex text check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  logo_url text,
  capitan_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists clanes_capitan_idx on public.clanes(capitan_id);

-- ---------- clan_id en profiles (un usuario en un solo clan) -------------
alter table public.profiles
  add column if not exists clan_id uuid references public.clanes(id) on delete set null;

create index if not exists profiles_clan_idx on public.profiles(clan_id) where clan_id is not null;

-- ---------- clan_requests ------------------------------------------------
create table if not exists public.clan_requests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clanes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','aprobado','rechazado','cancelado')),
  mensaje text,
  respuesta text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Solo UNA solicitud pendiente por usuario (cross-clan). Evita spam.
create unique index if not exists clan_requests_pending_user_uq
  on public.clan_requests(user_id) where estado = 'pendiente';

create index if not exists clan_requests_clan_idx on public.clan_requests(clan_id);
create index if not exists clan_requests_user_idx on public.clan_requests(user_id);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.clanes enable row level security;
alter table public.clan_requests enable row level security;

-- clanes: todos los autenticados leen (es un directorio publico entre users)
drop policy if exists "clanes lectura autenticados" on public.clanes;
create policy "clanes lectura autenticados" on public.clanes
  for select using (auth.uid() is not null);

-- clanes: cualquier user puede crear un clan (con check de que capitan_id = auth.uid())
drop policy if exists "clanes insert self" on public.clanes;
create policy "clanes insert self" on public.clanes
  for insert with check (capitan_id = auth.uid());

-- clanes: solo capitan (o admin) puede actualizar
drop policy if exists "clanes update capitan" on public.clanes;
create policy "clanes update capitan" on public.clanes
  for update using (capitan_id = auth.uid() or public.is_admin())
  with check (capitan_id = auth.uid() or public.is_admin());

-- clanes: solo capitan (o admin) puede eliminar
drop policy if exists "clanes delete capitan" on public.clanes;
create policy "clanes delete capitan" on public.clanes
  for delete using (capitan_id = auth.uid() or public.is_admin());

-- clan_requests: user ve las suyas; capitan ve las de su clan; admin ve todas
drop policy if exists "clan_requests select self y capitan" on public.clan_requests;
create policy "clan_requests select self y capitan" on public.clan_requests
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clanes c
      where c.id = clan_requests.clan_id and c.capitan_id = auth.uid()
    )
  );

-- clan_requests: cualquier user crea su propia solicitud
drop policy if exists "clan_requests insert self" on public.clan_requests;
create policy "clan_requests insert self" on public.clan_requests
  for insert with check (user_id = auth.uid());

-- clan_requests: el propio user la cancela; capitan aprueba/rechaza; admin todo
drop policy if exists "clan_requests update" on public.clan_requests;
create policy "clan_requests update" on public.clan_requests
  for update using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clanes c
      where c.id = clan_requests.clan_id and c.capitan_id = auth.uid()
    )
  );

-- =========================================================================
-- Helper: generar slug (lowercase, sin acentos, sin caracteres raros)
-- =========================================================================
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(lower(unaccent(input)), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  ))
$$;

-- Nota: requiere extension `unaccent`. Intentamos crearla; si el proyecto
-- no la tiene habilitada, caera silenciosamente y slugify fallara al usarse.
-- Supabase normalmente la tiene por default.
create extension if not exists unaccent;
