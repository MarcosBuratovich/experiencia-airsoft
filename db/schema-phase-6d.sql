-- =========================================================================
-- Experiencia Airsoft — Fase 6D: drop profiles.clan_id, vistas usan junction
-- Correr despues de schema-phase-6c.sql. Idempotente.
--
-- Cambios:
-- - Las vistas de stats (match_stats_global, _by_partida, _mensual, _clan)
--   se recrean usando profile_clanes como source of truth. Para mantener
--   la semántica vieja de "una stats por jugador con su clan principal",
--   tomamos el clan de posicion=1 como "primary clan".
-- - Para match_stats_clan se mantiene la atribución única por primary
--   clan: las eliminaciones/capturas/etc del jugador suman solo a SU
--   clan primario, no a los 3 clanes simultáneamente (evita inflar
--   rankings cuando un jugador está en varios clanes).
-- - Drop final de profiles.clan_id (la columna deja de existir).
-- =========================================================================

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
  (select pc.clan_id from public.profile_clanes pc
   where pc.profile_id = p.id order by pc.posicion limit 1) as clan_id,
  count(*) filter (where e.tipo = 'eliminacion') as eliminaciones,
  count(*) filter (where e.tipo = 'captura')     as capturas,
  count(*) filter (where e.tipo = 'reanimacion') as reanimaciones,
  count(*) filter (where e.tipo = 'planto')      as plantos,
  count(distinct e.partida_id) filter (where e.partida_id is not null) as partidas_jugadas,
  ((count(*) filter (where e.tipo = 'captura'))::int * 3
   + (count(*) filter (where e.tipo = 'reanimacion'))::int * 2
   + (count(*) filter (where e.tipo = 'planto'))::int * 5
   - (count(*) filter (where e.tipo = 'eliminacion'))::int) as score
from public.match_events e
join public.profiles p on p.id = e.user_id
where e.status = 'aceptado' and e.user_id is not null
group by e.user_id, e.player_number, p.id, p.nombre, p.apellido;

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
  (select pc.clan_id from public.profile_clanes pc
   where pc.profile_id = p.id order by pc.posicion limit 1) as clan_id,
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
group by to_char(pa.fecha, 'YYYY-MM'), e.user_id, e.player_number, p.id, p.nombre, p.apellido;

-- Por clan (solo cuenta para el clan primario del jugador — posicion 1)
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
join public.profile_clanes pc on pc.profile_id = e.user_id and pc.posicion = 1
join public.clanes c on c.id = pc.clan_id
where e.status = 'aceptado' and e.user_id is not null
group by c.id, c.slug, c.nombre, c.color_hex;

-- Drop del index legacy antes de la columna (puede no existir si las
-- migraciones se aplicaron en otro orden).
drop index if exists public.profiles_clan_idx;

-- Por fin: drop de la columna vieja.
alter table public.profiles drop column if exists clan_id;
