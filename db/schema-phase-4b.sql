-- =========================================================================
-- Experiencia Airsoft — Fase 4B: ingesta de eventos atomicos del local
-- Correr en Supabase SQL Editor despues de schema-phase-4.sql. Idempotente.
-- =========================================================================

-- ---------- Drop la tabla agregada del plan original que nunca se uso -----
drop table if exists public.match_stats cascade;

-- ---------- match_events --------------------------------------------------
create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  -- Asociacion (puede ser null al inicio si llego huerfano)
  partida_id uuid references public.partidas(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  -- Datos crudos del evento
  player_number text not null,
  tipo text not null check (tipo in ('eliminacion','captura','reanimacion','planto')),
  -- Idempotencia: el local manda un id unico por evento real
  local_event_id text not null unique,
  -- Cuando ocurrio en cancha (segun el local)
  occurred_at timestamptz not null,
  -- Cuando lo recibimos (server)
  ingested_at timestamptz not null default now(),
  -- Status del procesamiento
  status text not null default 'aceptado'
    check (status in ('aceptado','huerfano','rechazado')),
  reason text,            -- explicacion si huerfano/rechazado
  -- Payload original por si en el futuro agregamos campos extra
  raw jsonb
);

create index if not exists match_events_partida_idx
  on public.match_events(partida_id);
create index if not exists match_events_user_idx
  on public.match_events(user_id);
create index if not exists match_events_player_number_idx
  on public.match_events(player_number);
create index if not exists match_events_status_idx
  on public.match_events(status);
create index if not exists match_events_occurred_at_idx
  on public.match_events(occurred_at desc);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.match_events enable row level security;

-- Lectura: cualquier autenticado (necesario para leaderboards y scoreboards)
drop policy if exists "match_events lectura autenticados" on public.match_events;
create policy "match_events lectura autenticados" on public.match_events
  for select using (auth.uid() is not null);

-- Escritura UI: solo admin (carga manual desde la app). El endpoint API
-- usa la Service Role Key que bypassa RLS, asi que esta policy no le
-- afecta.
drop policy if exists "match_events admin write" on public.match_events;
create policy "match_events admin write" on public.match_events
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================================
-- VISTAS: agregaciones para leaderboards / scoreboards
-- =========================================================================

-- Global all-time
create or replace view public.match_stats_global as
select
  e.user_id,
  e.player_number,
  p.nombre,
  p.apellido,
  p.clan_id,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura') as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto') as plantos,
  count(distinct e.partida_id) filter (where e.partida_id is not null) as partidas_jugadas,
  -- Score combinado (heuristica): premia objetivos, penaliza eliminaciones
  ((count(*) filter (where e.tipo = 'captura'))::int * 3
   + (count(*) filter (where e.tipo = 'reanimacion'))::int * 2
   + (count(*) filter (where e.tipo = 'planto'))::int * 5
   - (count(*) filter (where e.tipo = 'eliminacion'))::int) as score
from public.match_events e
join public.profiles p on p.id = e.user_id
where e.status = 'aceptado' and e.user_id is not null
group by e.user_id, e.player_number, p.nombre, p.apellido, p.clan_id;

-- Por partida (scoreboard)
create or replace view public.match_stats_by_partida as
select
  e.partida_id,
  e.user_id,
  e.player_number,
  p.nombre,
  p.apellido,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura') as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto') as plantos
from public.match_events e
join public.profiles p on p.id = e.user_id
where e.status = 'aceptado' and e.user_id is not null and e.partida_id is not null
group by e.partida_id, e.user_id, e.player_number, p.nombre, p.apellido;

-- Mensual (joinea con partida.fecha)
create or replace view public.match_stats_mensual as
select
  to_char(pa.fecha, 'YYYY-MM') as periodo,
  e.user_id,
  e.player_number,
  p.nombre,
  p.apellido,
  p.clan_id,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura') as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto') as plantos,
  count(distinct e.partida_id) as partidas_jugadas,
  ((count(*) filter (where e.tipo = 'captura'))::int * 3
   + (count(*) filter (where e.tipo = 'reanimacion'))::int * 2
   + (count(*) filter (where e.tipo = 'planto'))::int * 5
   - (count(*) filter (where e.tipo = 'eliminacion'))::int) as score
from public.match_events e
join public.profiles p on p.id = e.user_id
join public.partidas pa on pa.id = e.partida_id
where e.status = 'aceptado' and e.user_id is not null
group by to_char(pa.fecha, 'YYYY-MM'), e.user_id, e.player_number, p.nombre, p.apellido, p.clan_id;

-- Por clan
create or replace view public.match_stats_clan as
select
  c.id as clan_id,
  c.slug,
  c.nombre as clan_nombre,
  c.color_hex,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura') as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto') as plantos,
  count(distinct e.user_id) as miembros_activos,
  count(distinct e.partida_id) as partidas_jugadas,
  ((count(*) filter (where e.tipo = 'captura'))::int * 3
   + (count(*) filter (where e.tipo = 'reanimacion'))::int * 2
   + (count(*) filter (where e.tipo = 'planto'))::int * 5
   - (count(*) filter (where e.tipo = 'eliminacion'))::int) as score
from public.match_events e
join public.profiles p on p.id = e.user_id
join public.clanes c on c.id = p.clan_id
where e.status = 'aceptado' and e.user_id is not null
group by c.id, c.slug, c.nombre, c.color_hex;
