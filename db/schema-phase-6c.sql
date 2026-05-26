-- =========================================================================
-- Experiencia Airsoft — Fase 6C: solicitudes pendientes por (user, clan)
-- Correr despues de schema-phase-6b.sql. Idempotente.
--
-- Cambio:
-- - El índice viejo permitía UNA sola solicitud pendiente por usuario en
--   total (cross-clan). Con multi-clan necesitamos permitir 1 pendiente
--   por (usuario, clan), así un user puede pedir entrada a 2-3 clanes a
--   la vez sin pisar la solicitud anterior.
-- =========================================================================

drop index if exists public.clan_requests_pending_user_uq;

create unique index if not exists clan_requests_pending_user_clan_uq
  on public.clan_requests(user_id, clan_id) where estado = 'pendiente';
