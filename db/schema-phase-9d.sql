-- =========================================================================
-- Experiencia Airsoft — Fase 9D: roster visible para todos los usuarios
-- que pueden ver la partida.
-- Correr despues de schema-phase-9c.sql. Idempotente.
--
-- Bug que fixea:
-- - La policy "inscripciones self select" (user_id = auth.uid()) solo
--   permite ver tu propia inscripción. Un jugador que NO está anotado
--   en una pública abre el detalle y ve "Nadie anotado", aunque haya
--   otros confirmados. La lista de roster es info pública del evento.
--
-- Fix:
-- - Nueva policy aditiva: cualquier autenticado puede ver inscripciones
--   de una partida que él pueda visitar (publica, organiza, está
--   inscripto, o admin). Implementada con un helper SECURITY DEFINER
--   `puede_ver_partida` para evitar recursión cruzada con partidas RLS.
-- - La policy vieja "self select" se mantiene como red de seguridad.
-- =========================================================================

create or replace function public.puede_ver_partida(p_partida_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.partidas pa
    where pa.id = p_partida_id
      and (
        pa.visibilidad = 'publica'
        or pa.organizador_id = auth.uid()
        or exists (
          select 1 from public.inscripciones i
          where i.partida_id = p_partida_id and i.user_id = auth.uid()
        )
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','super_admin')
        )
      )
  );
$$;

-- Roster: cualquier autenticado ve las inscripciones de partidas que
-- puede visitar. Esta policy es ADITIVA con las existentes (self select,
-- organizador select) — todas se OR-ean.
drop policy if exists "inscripciones roster via partida visible" on public.inscripciones;
create policy "inscripciones roster via partida visible" on public.inscripciones
  for select using (
    public.puede_ver_partida(partida_id)
  );
