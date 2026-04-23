-- =========================================================================
-- Experiencia Airsoft — Fase 1 schema
-- Ejecutar en Supabase SQL Editor (una sola vez) al crear el proyecto.
-- =========================================================================

-- ---------- PROFILES -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  dni text not null unique,
  celular text not null,
  email text not null,
  role text not null default 'jugador' check (role in ('jugador','admin','super_admin')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- ---------- PARTIDAS -----------------------------------------------------
create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  fecha date not null,
  hora_inicio time not null,
  duracion_min int not null default 180,
  modalidad text not null check (modalidad in ('dinamica','tacsim','speedsoft')),
  cupo_max int not null check (cupo_max > 0),
  precio int not null default 0,
  visibilidad text not null default 'publica' check (visibilidad in ('publica','privada')),
  private_token text unique,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada','cancelada')),
  notas text,
  creado_por uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists partidas_fecha_idx on public.partidas(fecha);
create index if not exists partidas_estado_idx on public.partidas(estado);
create index if not exists partidas_visibilidad_idx on public.partidas(visibilidad);

-- ---------- INSCRIPCIONES -----------------------------------------------
create table if not exists public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  estado text not null default 'confirmado' check (estado in ('confirmado','waitlist','cancelado')),
  posicion_waitlist int,
  created_at timestamptz not null default now(),
  unique(partida_id, user_id)
);

create index if not exists inscripciones_partida_idx on public.inscripciones(partida_id);
create index if not exists inscripciones_user_idx on public.inscripciones(user_id);

-- ---------- CHECKINS -----------------------------------------------------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null unique references public.inscripciones(id) on delete cascade,
  presente boolean not null default false,
  pago_estado text check (pago_estado in ('efectivo','transferencia','debe','socio_presente')),
  pago_monto int,
  nota text,
  admin_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles      enable row level security;
alter table public.partidas      enable row level security;
alter table public.inscripciones enable row level security;
alter table public.checkins      enable row level security;

-- Helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','super_admin')
  );
$$;

-- ---------- profiles policies -------------------------------------------
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- ---------- partidas policies -------------------------------------------
drop policy if exists "partidas publicas select" on public.partidas;
create policy "partidas publicas select" on public.partidas
  for select using (
    visibilidad = 'publica'
    or public.is_admin()
    or exists (select 1 from public.inscripciones i where i.partida_id = partidas.id and i.user_id = auth.uid())
  );

drop policy if exists "partidas admin write" on public.partidas;
create policy "partidas admin write" on public.partidas
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- inscripciones policies --------------------------------------
drop policy if exists "inscripciones self select" on public.inscripciones;
create policy "inscripciones self select" on public.inscripciones
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "inscripciones self insert" on public.inscripciones;
create policy "inscripciones self insert" on public.inscripciones
  for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "inscripciones self update" on public.inscripciones;
create policy "inscripciones self update" on public.inscripciones
  for update using (user_id = auth.uid() or public.is_admin());

drop policy if exists "inscripciones admin delete" on public.inscripciones;
create policy "inscripciones admin delete" on public.inscripciones
  for delete using (public.is_admin() or user_id = auth.uid());

-- ---------- checkins policies -------------------------------------------
drop policy if exists "checkins admin all" on public.checkins;
create policy "checkins admin all" on public.checkins
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================================
-- TRIGGER: auto-create profile row on auth signup (populated via raw_user_meta_data)
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellido, dni, celular, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', ''),
    coalesce(new.raw_user_meta_data->>'celular', ''),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
