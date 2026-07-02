-- =========================================================================
-- Experiencia Airsoft — Fase 17: precio efectivo/transferencia por ítem
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cada ítem de la lista de precios pasa a tener DOS valores independientes:
-- efectivo y transferencia. El check-in cobra el del medio elegido.
--
-- Backfill: ambos = `valor` actual → sin cambio de comportamiento hasta que el
-- dueño edite los precios. `valor` queda como legacy (= transferencia/lista).
-- =========================================================================

-- 1) precios_config: dos precios por ítem
alter table public.precios_config
  add column if not exists valor_efectivo int,
  add column if not exists valor_transferencia int;

update public.precios_config
  set valor_efectivo = coalesce(valor_efectivo, valor),
      valor_transferencia = coalesce(valor_transferencia, valor);

comment on column public.precios_config.valor_efectivo is
  'Precio del ítem pagando en efectivo.';
comment on column public.precios_config.valor_transferencia is
  'Precio del ítem pagando por transferencia (referencia/lista). `valor` = legacy = este.';

-- 2) inscripciones: snapshot del fijo (entrada+alquiler) en efectivo.
--    El fijo de transferencia sale de precio_entrada + precio_alquiler (ya existentes).
alter table public.inscripciones
  add column if not exists precio_fijo_efectivo int;

update public.inscripciones
  set precio_fijo_efectivo = coalesce(precio_fijo_efectivo, coalesce(precio_entrada, 0) + coalesce(precio_alquiler, 0));

comment on column public.inscripciones.precio_fijo_efectivo is
  'Snapshot de entrada+alquiler en efectivo. El de transferencia = precio_entrada+precio_alquiler.';
