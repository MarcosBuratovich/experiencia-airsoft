-- =========================================================================
-- Experiencia Airsoft — Fase 9C: fix recursión infinita entre partidas y
-- inscripciones policies.
-- Correr despues de schema-phase-9b.sql. Idempotente.
--
-- Bug que fixea:
-- - Después de phase-9b, partidas.select policy hace EXISTS(inscripciones)
--   y inscripciones.select policy hace EXISTS(partidas). Postgres detecta
--   el ciclo y lanza "infinite recursion detected in policy for relation
--   partidas" en cualquier query a partidas o inscripciones.
--
-- Fix:
-- - Reemplazar los EXISTS cross-table por funciones SECURITY DEFINER que
--   corren con privilegios del owner (bypassean RLS al consultar la otra
--   tabla). Las funciones leakean cero info: solo confirman datos que el
--   user ya conoce sobre sí mismo (sus inscripciones, sus partidas que
--   organiza).
-- =========================================================================

-- Helper: ¿el current user es organizador de esta partida?
create or replace function public.es_organizador_de(p_partida_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.partidas
    where id = p_partida_id and organizador_id = auth.uid()
  );
$$;

-- Helper: ¿el current user está inscripto en esta partida?
create or replace function public.user_inscripto_en(p_partida_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.inscripciones
    where partida_id = p_partida_id and user_id = auth.uid()
  );
$$;

-- partidas: SELECT usando helpers (sin EXISTS directo)
drop policy if exists "partidas publicas select" on public.partidas;
create policy "partidas publicas select" on public.partidas
  for select using (
    visibilidad = 'publica'
    or public.is_admin()
    or organizador_id = auth.uid()
    or public.user_inscripto_en(id)
  );

-- inscripciones: organizador SELECT usando helper
drop policy if exists "inscripciones organizador select" on public.inscripciones;
create policy "inscripciones organizador select" on public.inscripciones
  for select using (
    public.es_organizador_de(partida_id)
  );

-- inscripciones: INSERT (guest o self) reescrito con helper
drop policy if exists "inscripciones insert self o organizador" on public.inscripciones;
create policy "inscripciones insert self o organizador" on public.inscripciones
  for insert with check (
    (user_id = auth.uid() and guest_nombre is null)
    or (
      guest_nombre is not null
      and (public.is_admin() or public.es_organizador_de(partida_id))
    )
  );

-- inscripciones: DELETE reescrito con helper
drop policy if exists "inscripciones delete self o organizador" on public.inscripciones;
create policy "inscripciones delete self o organizador" on public.inscripciones
  for delete using (
    user_id = auth.uid()
    or public.is_admin()
    or public.es_organizador_de(partida_id)
  );
