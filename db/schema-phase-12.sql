-- =========================================================================
-- Experiencia Airsoft — Fase 12: nombre y alias únicos en clanes
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Constraints:
-- - clanes.nombre: único case-insensitive (no podés tener "Lobos" y
--   "lobos" o "LOBOS" como clanes distintos).
-- - clanes.alias: único case-insensitive cuando no es null. Múltiples
--   clanes sin alias siguen permitidos.
--
-- Si la migración FALLA con error tipo "duplicate key value": tenés
-- registros existentes con nombres o aliases repetidos. Corré primero:
--
--   -- Encontrar nombres duplicados:
--   select lower(nombre) as nombre_lower, count(*), array_agg(id)
--   from public.clanes group by lower(nombre) having count(*) > 1;
--
--   -- Encontrar aliases duplicados:
--   select lower(alias) as alias_lower, count(*), array_agg(id)
--   from public.clanes
--   where alias is not null
--   group by lower(alias) having count(*) > 1;
--
-- Renombrá / asigná alias distintos a los duplicados a mano antes de
-- correr este script.
-- =========================================================================

create unique index if not exists clanes_nombre_lower_uq
  on public.clanes (lower(nombre));

create unique index if not exists clanes_alias_lower_uq
  on public.clanes (lower(alias))
  where alias is not null;
