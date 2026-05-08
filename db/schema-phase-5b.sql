-- =========================================================================
-- Experiencia Airsoft — Fase 5B: precio_recargas separado del alquiler
-- Correr despues de schema-phase-5.sql. Idempotente.
--
-- Cambio conceptual:
-- - Las recargas NO son elegidas por el jugador al anotarse — el admin
--   las marca durante el check-in a medida que el jugador las pide en
--   el local.
-- - Se separa `precio_recargas` (dinámico, calculado con los precios
--   actuales) de `precio_alquiler` (snapshot al anotarse).
-- - precio_total = entrada + alquiler + recargas (generated column).
-- =========================================================================

alter table public.inscripciones
  add column if not exists precio_recargas int not null default 0
    check (precio_recargas >= 0);

-- Recrear precio_total para que incluya las recargas. Como es generated
-- column, hay que dropearla y recrearla (no se puede ALTER directamente).
alter table public.inscripciones drop column if exists precio_total;
alter table public.inscripciones
  add column precio_total int generated always as
    (precio_entrada + precio_alquiler + precio_recargas) stored;
