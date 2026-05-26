-- =========================================================================
-- Experiencia Airsoft — Fase 9E: vista pública de profiles
-- Correr despues de schema-phase-9d.sql. Idempotente.
--
-- Bug que fixea:
-- - Un jugador entra al detalle de una partida y NO ve el alias/nombre
--   del admin anotado, solo el logo del clan. La RLS de profiles limita
--   SELECT a (id = auth.uid() OR is_admin()), entonces el embedded join
--   profiles(nombre, apellido, alias) devuelve NULL para perfiles ajenos.
--
-- Fix:
-- - Vista `profiles_publicos` con SOLO los campos visibles para todos
--   (id, nombre, apellido, alias, player_number, socio). Marcada con
--   security_invoker = false para que corra como owner y bypasee la
--   RLS de la tabla — pero como solo expone columnas seguras, los
--   campos sensibles (dni, celular, email) siguen privados.
-- =========================================================================

create or replace view public.profiles_publicos
with (security_invoker = false)
as
select
  id,
  nombre,
  apellido,
  alias,
  player_number,
  socio
from public.profiles;

grant select on public.profiles_publicos to authenticated, anon;
