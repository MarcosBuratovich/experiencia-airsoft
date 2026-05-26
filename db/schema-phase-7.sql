-- =========================================================================
-- Experiencia Airsoft — Fase 7: alias en profiles
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cambio:
-- - profiles.alias: nombre alternativo que el propio jugador edita en
--   /perfil. Si está seteado, es lo que aparece en la lista pública de
--   inscriptos en vez de "nombre apellido". Las vistas admin siguen
--   mostrando el nombre real para identificación.
-- - Max 30 chars, acepta cualquier texto (emojis incluidos).
-- - Sin unicidad — pueden existir dos players con el mismo alias.
-- =========================================================================

alter table public.profiles
  add column if not exists alias text
    check (alias is null or char_length(alias) between 1 and 30);
