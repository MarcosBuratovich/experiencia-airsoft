-- =========================================================================
-- Experiencia Airsoft — Fase 9B: RLS para organizador de privadas
-- Correr despues de schema-phase-9.sql. Idempotente.
--
-- Bug que fixea: el organizador de una privada se comía un 404 al
-- entrar a /partidas/[id]. La RLS de partidas solo permitía select si
-- visibilidad='publica', is_admin() o si el user tenía inscripcion. El
-- organizador no estaba inscripto, por lo tanto Postgres devolvía 0
-- filas y Next renderizaba notFound().
-- =========================================================================

-- partidas: ahora el organizador también puede leer su partida.
drop policy if exists "partidas publicas select" on public.partidas;
create policy "partidas publicas select" on public.partidas
  for select using (
    visibilidad = 'publica'
    or public.is_admin()
    or organizador_id = auth.uid()
    or exists (
      select 1 from public.inscripciones i
      where i.partida_id = partidas.id and i.user_id = auth.uid()
    )
  );

-- inscripciones: el organizador puede ver todas las inscripciones de
-- las partidas que organiza (para poder gestionar el roster en /partidas/[id]).
-- La policy existente "self select" se mantiene para users normales en
-- partidas públicas; esta es aditiva.
drop policy if exists "inscripciones organizador select" on public.inscripciones;
create policy "inscripciones organizador select" on public.inscripciones
  for select using (
    exists (
      select 1 from public.partidas pa
      where pa.id = inscripciones.partida_id
        and pa.organizador_id = auth.uid()
    )
  );
