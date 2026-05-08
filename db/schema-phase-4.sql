-- =========================================================================
-- Experiencia Airsoft — Fase 4 migration: player_number + match_stats
-- Correr en Supabase SQL Editor despues de schema-phase-3f.sql. Idempotente.
-- =========================================================================

-- ---------- profiles: player_number unico de 6 digitos --------------------
alter table public.profiles
  add column if not exists player_number text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_player_number_format_chk'
  ) then
    alter table public.profiles
      add constraint profiles_player_number_format_chk
      check (player_number is null or player_number ~ '^\d{6}$');
  end if;
end $$;

-- unique parcial: solo aplica si no es null (permite multiples nulls
-- mientras los users existentes completan su numero)
create unique index if not exists profiles_player_number_uq
  on public.profiles(player_number) where player_number is not null;

-- ---------- match_stats: una fila por (partida, jugador) ------------------
create table if not exists public.match_stats (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  player_number text not null,
  kills int not null default 0 check (kills >= 0),
  deaths int not null default 0 check (deaths >= 0),
  bomb_plants int not null default 0 check (bomb_plants >= 0),
  bomb_defuses int not null default 0 check (bomb_defuses >= 0),
  revives int not null default 0 check (revives >= 0),
  assists int not null default 0 check (assists >= 0),
  mvp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partida_id, user_id)
);

create index if not exists match_stats_user_idx on public.match_stats(user_id);
create index if not exists match_stats_partida_idx on public.match_stats(partida_id);
create index if not exists match_stats_player_number_idx on public.match_stats(player_number);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.match_stats enable row level security;

drop policy if exists "match_stats lectura autenticados" on public.match_stats;
create policy "match_stats lectura autenticados" on public.match_stats
  for select using (auth.uid() is not null);

drop policy if exists "match_stats admin write" on public.match_stats;
create policy "match_stats admin write" on public.match_stats
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================================
-- Trigger handle_new_user actualizado para leer player_number del metadata
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, nombre, apellido, dni, celular, email, player_number
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', ''),
    coalesce(new.raw_user_meta_data->>'celular', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'player_number', '')
  );
  return new;
end;
$$;
