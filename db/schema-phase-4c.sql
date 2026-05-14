-- =========================================================================
-- Experiencia Airsoft — Fase 4C: rename 'muerte' -> 'eliminacion'
--
-- Cambio de lenguaje: en todo el producto usamos terminologia airsoft
-- ('eliminacion') en vez de la palabra anterior. Solo es necesaria si
-- ya aplicaste una version vieja de schema-phase-4b.sql (con
-- check tipo IN ('muerte', ...) y columna 'muertes').
--
-- Idempotente y safe:
-- - Si match_events no existe, no hace nada (clean install -> aplicar 4b nuevo).
-- - Si match_events existe pero ya tiene 'eliminacion' como tipo valido,
--   no toca nada.
-- - Si match_events tiene el constraint viejo, migra filas + constraint
--   + vistas.
-- =========================================================================

do $$
declare
  table_exists boolean;
  old_constraint_exists boolean;
  old_constraint_name text;
begin
  -- 1) Existe la tabla?
  select exists (
    select 1 from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'match_events'
  ) into table_exists;

  if not table_exists then
    raise notice '4c: match_events no existe; aplicar schema-phase-4b.sql actualizado.';
    return;
  end if;

  -- 2) Existe el constraint viejo (que acepta 'muerte')?
  select conname into old_constraint_name
    from pg_constraint
   where conrelid = 'public.match_events'::regclass
     and contype  = 'c'
     and pg_get_constraintdef(oid) ilike '%''muerte''%';

  old_constraint_exists := old_constraint_name is not null;

  if not old_constraint_exists then
    raise notice '4c: el tipo ya esta migrado a ''eliminacion''. Nada que hacer.';
    return;
  end if;

  -- 3) Migrar filas existentes
  update public.match_events
     set tipo = 'eliminacion'
   where tipo = 'muerte';

  -- 4) Reemplazar el constraint
  execute format('alter table public.match_events drop constraint %I', old_constraint_name);
  alter table public.match_events
    add constraint match_events_tipo_check
    check (tipo in ('eliminacion','captura','reanimacion','planto'));

  raise notice '4c: migracion de tipo aplicada.';
end$$;

-- =========================================================================
-- Recrear vistas: idempotente con CREATE OR REPLACE / DROP CASCADE.
-- Solo tiene sentido si match_events existe. Si no existe, las vistas
-- van a fallar al crearse (la tabla referenciada no existe), por eso
-- chequeamos antes.
-- =========================================================================

do $$
declare
  table_exists boolean;
begin
  select exists (
    select 1 from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'match_events'
  ) into table_exists;

  if not table_exists then
    raise notice '4c: skip vistas, match_events no existe.';
    return;
  end if;

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

  raise notice '4c: vistas recreadas con columna eliminaciones.';
end$$;
