-- =========================================================================
-- Experiencia Airsoft — Fase 8: privadas con slots fijos
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cambios:
-- - Las solicitudes de privada ahora usan slots fijos de 4 horas (9-13,
--   14-18, 19-23). Un slot se bloquea apenas hay 1 solicitud pendiente
--   en (fecha, hora) — así dos usuarios no pueden pedir el mismo slot.
-- - Se relaja el unique viejo de "1 pendiente por user" para que un
--   usuario pueda pedir varios slots distintos en paralelo. La defensa
--   contra spam queda en el slot-uniqueness.
-- - duracion_min pasa a default 240 (4hs) — alineado con el modelo de
--   slots fijos. Los registros viejos no se tocan.
-- =========================================================================

-- Sacamos el unique cross-slot por usuario; lo reemplaza el slot-unique.
drop index if exists public.solicitudes_privada_pending_user_uq;

-- Un slot puede tener solo 1 solicitud pendiente.
create unique index if not exists solicitudes_privada_pending_slot_uq
  on public.solicitudes_privada(fecha_propuesta, hora_inicio)
  where estado = 'pendiente';

-- Default de duración a 4hs.
alter table public.solicitudes_privada
  alter column duracion_min set default 240;
