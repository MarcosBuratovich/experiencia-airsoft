-- =========================================================================
-- Experiencia Airsoft — Fase 4C: rename 'muerte' -> 'eliminacion'
-- Cambio de lenguaje: en todo el producto usamos terminologia airsoft
-- ("eliminacion") en vez de la palabra anterior. Idempotente:
-- chequea si ya fue aplicada antes de mutar.
-- Correr en Supabase SQL Editor.
-- =========================================================================

-- ---------- 1. Migrar filas existentes ------------------------------------
update public.match_events
   set tipo = 'eliminacion'
 where tipo = 'muerte';

-- ---------- 2. Actualizar el check constraint -----------------------------
-- (postgres no da nombre explicito a CHECK creado con `check (...)`, asi
--  que buscamos el constraint por su pg_constraint.conrelid + pg_constraint.consrc)
do $$
declare
  c_name text;
begin
  select conname into c_name
    from pg_constraint
   where conrelid = 'public.match_events'::regclass
     and contype  = 'c'
     and pg_get_constraintdef(oid) ilike '%''muerte''%';
  if c_name is not null then
    execute format('alter table public.match_events drop constraint %I', c_name);
  end if;
end$$;

alter table public.match_events
  drop constraint if exists match_events_tipo_check;

alter table public.match_events
  add constraint match_events_tipo_check
  check (tipo in ('eliminacion','captura','reanimacion','planto'));

-- ---------- 3. Recrear las vistas con la nueva columna --------------------
drop view if exists public.match_stats_global cascade;
drop view if exists public.match_stats_by_partida cascade;
drop view if exists public.match_stats_mensual cascade;
drop view if exists public.match_stats_clan cascade;

-- Global all-time
create view public.match_stats_global as
select
  e.user_id,
  e.player_number,
  p.nombre,
  p.apellido,
  p.clan_id,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura')     as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto')      as plantos,
  count(distinct e.partida_id) filter (where e.partida_id is not null) as partidas_jugadas,
  -- Score: premia objetivos, penaliza eliminaciones recibidas
  ((count(*) filter (where e.tipo = 'captura'))::int * 3
   + (count(*) filter (where e.tipo = 'reanimacion'))::int * 2
   + (count(*) filter (where e.tipo = 'planto'))::int * 5
   - (count(*) filter (where e.tipo = 'eliminacion'))::int) as score
from public.match_events e
join public.profiles p on p.id = e.user_id
where e.status = 'aceptado' and e.user_id is not null
group by e.user_id, e.player_number, p.nombre, p.apellido, p.clan_id;

-- Por partida (scoreboard)
create view public.match_stats_by_partida as
select
  e.partida_id,
  e.user_id,
  e.player_number,
  p.nombre,
  p.apellido,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura')     as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto')      as plantos
from public.match_events e
join public.profiles p on p.id = e.user_id
where e.status = 'aceptado' and e.user_id is not null and e.partida_id is not null
group by e.partida_id, e.user_id, e.player_number, p.nombre, p.apellido;

-- Mensual
create view public.match_stats_mensual as
select
  to_char(pa.fecha, 'YYYY-MM') as periodo,
  e.user_id,
  e.player_number,
  p.nombre,
  p.apellido,
  p.clan_id,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura')     as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto')      as plantos,
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
create view public.match_stats_clan as
select
  c.id as clan_id,
  c.slug,
  c.nombre as clan_nombre,
  c.color_hex,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura')     as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto')      as plantos,
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
