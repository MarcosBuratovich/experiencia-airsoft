-- =========================================================================
-- Experiencia Airsoft — Fase 3A migration: tipo_jugador + precios_config
-- Correr una sola vez en Supabase SQL Editor, despues de schema-phase-2.sql.
-- Idempotente: si ya existen columnas/tablas, los alter/create son no-op.
-- =========================================================================

-- ---------- profiles: tipo de jugador (alquiler | byop) ------------------
alter table public.profiles
  add column if not exists tipo_jugador text not null default 'byop'
    check (tipo_jugador in ('alquiler','byop'));

create index if not exists profiles_tipo_jugador_idx on public.profiles(tipo_jugador);

-- ---------- precios_config (key-value, single source of truth) -----------
create table if not exists public.precios_config (
  key text primary key,
  valor int not null check (valor >= 0),
  descripcion text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- seed idempotente (no pisa valores ya editados por super_admin)
insert into public.precios_config (key, valor, descripcion) values
  ('entrada_alquiler',   0, 'Entrada partida, usuario tipo alquiler'),
  ('entrada_byop',       0, 'Entrada partida, usuario tipo byop'),
  ('entrada_socio',      0, 'Entrada partida, socio (normalmente 0)'),
  ('alquiler_marcadora', 0, 'Alquiler marcadora comun'),
  ('alquiler_premium',   0, 'Alquiler marcadora premium (tracer)'),
  ('alquiler_chaleco',   0, 'Alquiler chaleco'),
  ('cuota_socio',        0, 'Cuota mensual socio')
on conflict (key) do nothing;

alter table public.precios_config enable row level security;

-- helper super_admin (se usa en RLS de precios_config y futuras policies)
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

-- todos los usuarios autenticados leen precios (para calcular inscripciones)
drop policy if exists "precios lectura autenticados" on public.precios_config;
create policy "precios lectura autenticados" on public.precios_config
  for select using (auth.uid() is not null);

-- solo super_admin escribe
drop policy if exists "precios update super_admin" on public.precios_config;
create policy "precios update super_admin" on public.precios_config
  for update using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "precios insert super_admin" on public.precios_config;
create policy "precios insert super_admin" on public.precios_config
  for insert with check (public.is_super_admin());

-- ---------- trigger handle_new_user: leer tipo_jugador de metadata -------
-- Reescribe la funcion con la nueva columna. Mantiene default 'byop' si no se pasa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellido, dni, celular, email, tipo_jugador)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', ''),
    coalesce(new.raw_user_meta_data->>'celular', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'tipo_jugador', 'byop')
  );
  return new;
end;
$$;

-- trigger ya esta definido en schema.sql; no hace falta recrearlo.
