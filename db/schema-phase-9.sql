-- =========================================================================
-- Experiencia Airsoft — Fase 9: guests + organizador en privadas
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cambios en inscripciones:
-- - user_id pasa a NULLABLE para soportar guests (nombres cargados a
--   mano por el organizador, sin cuenta en la app).
-- - Nueva columna guest_nombre (text) y agregado_por (uuid).
-- - Constraint XOR: cada fila tiene user_id o guest_nombre, no ambos.
--
-- Cambios en partidas:
-- - Nueva columna organizador_id que apunta al user "dueño" de una
--   partida privada (la persona que pidió la solicitud aprobada, o
--   quien el admin asigne). Tiene permisos para agregar/quitar guests
--   y ver la lista completa.
--
-- Backfill:
-- - organizador_id se setea automáticamente para todas las privadas
--   existentes a partir de solicitudes_privada.user_id donde
--   partida_id matchea.
-- =========================================================================

-- 1) inscripciones: nullable user_id + guest fields
alter table public.inscripciones
  alter column user_id drop not null;

alter table public.inscripciones
  add column if not exists guest_nombre text;

alter table public.inscripciones
  add column if not exists agregado_por uuid references public.profiles(id);

-- Constraint XOR: o user_id o guest_nombre, exactamente uno.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inscripciones_user_or_guest'
      and conrelid = 'public.inscripciones'::regclass
  ) then
    alter table public.inscripciones
      add constraint inscripciones_user_or_guest
      check ((user_id is not null) <> (guest_nombre is not null));
  end if;
end$$;

-- 2) partidas: organizador_id
alter table public.partidas
  add column if not exists organizador_id uuid
    references public.profiles(id) on delete set null;

create index if not exists partidas_organizador_idx
  on public.partidas(organizador_id) where organizador_id is not null;

-- 3) Backfill: organizador_id desde solicitudes_privada aprobadas.
update public.partidas pa
set organizador_id = sp.user_id
from public.solicitudes_privada sp
where sp.partida_id = pa.id
  and sp.estado = 'aprobada'
  and pa.organizador_id is null;

-- 4) RLS para guests: el organizador y admin pueden insertar guests.
--    Los users normales solo se inscriben a sí mismos (existing policy).
--    Vamos a ampliar el insert policy para incluir guests por organizador.
drop policy if exists "inscripciones insert self o organizador" on public.inscripciones;
create policy "inscripciones insert self o organizador" on public.inscripciones
  for insert with check (
    -- usuario inscribiéndose a sí mismo (caso normal)
    (user_id = auth.uid() and guest_nombre is null)
    -- organizador o admin agregando un guest
    or (
      guest_nombre is not null
      and (
        public.is_admin()
        or exists (
          select 1 from public.partidas pa
          where pa.id = inscripciones.partida_id
            and pa.organizador_id = auth.uid()
        )
      )
    )
  );

-- Delete: organizador puede borrar cualquier inscripción de su partida.
drop policy if exists "inscripciones delete self o organizador" on public.inscripciones;
create policy "inscripciones delete self o organizador" on public.inscripciones
  for delete using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.partidas pa
      where pa.id = inscripciones.partida_id
        and pa.organizador_id = auth.uid()
    )
  );
