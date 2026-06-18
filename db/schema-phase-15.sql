-- =========================================================================
-- Experiencia Airsoft — Fase 15: DNI obligatorio en carga manual de guests
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Cuando el organizador (o cualquier inscripto desde "Mis alquileres") carga
-- a mano gente que no tiene cuenta, ahora pedimos nombre completo + DNI. El
-- DNI se guarda en inscripciones.guest_dni para tenerlo a mano en el check-in
-- (DNI obligatorio en el ingreso).
--
-- La columna es NULLABLE: las filas viejas y los inscriptos con cuenta
-- (user_id, el DNI vive en profiles) la dejan en null. La obligatoriedad la
-- impone la app en el alta de guests, no la DB, para no romper datos previos.
-- =========================================================================

alter table public.inscripciones
  add column if not exists guest_dni text;

comment on column public.inscripciones.guest_dni is
  'DNI del guest cargado a mano (sin cuenta). Null para inscriptos con user_id.';
