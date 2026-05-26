-- =========================================================================
-- Experiencia Airsoft — Fase 6B: alias y display_mode en clanes
-- Correr despues de schema-phase-6.sql. Idempotente.
--
-- Cambios:
-- - clanes.alias: texto corto (≤10 chars, acepta emojis) que aparece al
--   lado del nombre del jugador en cada inscripción. Ejemplo: [WOLF] Juan.
-- - clanes.display_mode: 'alias' (muestra el texto) o 'logo' (muestra el
--   logo circular al lado del nombre).
-- - El alias es obligatorio si display_mode = 'alias' (lo valida la app).
-- =========================================================================

alter table public.clanes
  add column if not exists alias text
    check (alias is null or char_length(alias) between 1 and 10);

alter table public.clanes
  add column if not exists display_mode text not null default 'alias'
    check (display_mode in ('alias', 'logo'));

-- Backfill: para clanes existentes generamos un alias por defecto a partir
-- de las primeras 4 letras del nombre, en mayúsculas, si no tiene ninguno.
update public.clanes
set alias = upper(substring(regexp_replace(nombre, '[^A-Za-z0-9]', '', 'g') from 1 for 4))
where alias is null
  and length(regexp_replace(nombre, '[^A-Za-z0-9]', '', 'g')) > 0;
