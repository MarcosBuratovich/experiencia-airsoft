-- =========================================================================
-- Experiencia Airsoft — Fase 3D migration: bandos (rojo/amarillo) en inscripciones
-- Correr una sola vez en Supabase SQL Editor, despues de schema-phase-3c.sql.
-- Idempotente.
-- =========================================================================

-- ---------- inscripciones: bando rojo/amarillo ---------------------------
alter table public.inscripciones
  add column if not exists bando text
    check (bando is null or bando in ('rojo','amarillo'));

create index if not exists inscripciones_partida_bando_idx
  on public.inscripciones(partida_id, bando);
