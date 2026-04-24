-- =========================================================================
-- Experiencia Airsoft — Fase 3B migration: alquiler en inscripcion + snapshot
-- Correr una sola vez en Supabase SQL Editor, despues de schema-phase-3a.sql.
-- Idempotente.
-- =========================================================================

-- ---------- inscripciones: equipo alquilado + snapshot de precios --------
alter table public.inscripciones
  add column if not exists alquila_marcadora bool not null default false,
  add column if not exists alquila_premium   bool not null default false,
  add column if not exists alquila_chaleco   bool not null default false,
  add column if not exists precio_entrada    int  not null default 0 check (precio_entrada >= 0),
  add column if not exists precio_alquiler   int  not null default 0 check (precio_alquiler >= 0);

-- precio_total como columna generada (stored) para poder ordenar / sumar
-- sin recomputar. Si la columna ya existe, skip.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inscripciones' and column_name = 'precio_total'
  ) then
    execute 'alter table public.inscripciones
      add column precio_total int generated always as (precio_entrada + precio_alquiler) stored';
  end if;
end $$;

-- regla de integridad: no pueden tildarse marcadora comun Y premium al mismo tiempo
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inscripciones_marcadora_excl_chk'
  ) then
    alter table public.inscripciones
      add constraint inscripciones_marcadora_excl_chk
      check (not (alquila_marcadora and alquila_premium));
  end if;
end $$;
