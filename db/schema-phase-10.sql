-- =========================================================================
-- Experiencia Airsoft — Fase 10: jugadores pueden agregar alquileres
-- bajo su nombre.
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cambio:
-- - Hasta ahora solo admin y organizador podían insertar guests
--   (inscripciones con user_id=null). Ahora cualquier usuario inscripto
--   en la partida puede agregar guests — son sus invitados/alquileres,
--   gente que viene con él sin cuenta. agregado_por queda apuntando al
--   usuario que los incorporó.
-- - Para delete: además del dueño de la inscripción (self), organizador
--   y admin, ahora puede borrar también quien agregó el guest
--   (agregado_por = auth.uid()).
-- =========================================================================

drop policy if exists "inscripciones insert self o organizador" on public.inscripciones;
create policy "inscripciones insert self o organizador o inscripto" on public.inscripciones
  for insert with check (
    -- usuario inscribiéndose a sí mismo
    (user_id = auth.uid() and guest_nombre is null)
    -- guest agregado por admin, organizador o cualquier inscripto
    or (
      guest_nombre is not null
      and (
        public.is_admin()
        or public.es_organizador_de(partida_id)
        or public.user_inscripto_en(partida_id)
      )
    )
  );

drop policy if exists "inscripciones delete self o organizador" on public.inscripciones;
create policy "inscripciones delete self o organizador o agregado_por" on public.inscripciones
  for delete using (
    user_id = auth.uid()
    or public.is_admin()
    or public.es_organizador_de(partida_id)
    or agregado_por = auth.uid()
  );
