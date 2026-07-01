-- =========================================================================
-- Experiencia Airsoft — Fase 16: aviso in-app de solicitud de privada resuelta
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cuando el admin aprueba o rechaza una solicitud de privada, el jugador no
-- se enteraba dentro de la app. Agregamos una marca `resuelto_visto`: se pone
-- en false al resolver y vuelve a true cuando el usuario abre "Mis solicitudes".
-- Alimenta un badge en el nav del jugador.
--
-- Default true: las filas viejas quedan como "ya vistas" (no disparan badge).
-- =========================================================================

alter table public.solicitudes_privada
  add column if not exists resuelto_visto boolean not null default true;

comment on column public.solicitudes_privada.resuelto_visto is
  'false cuando el admin resolvió (aprobó/rechazó) y el usuario aún no lo vio.';
