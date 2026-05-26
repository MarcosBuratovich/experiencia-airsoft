-- =========================================================================
-- Experiencia Airsoft — Fase 8B: overrides de slots reservados
-- Correr despues de schema-phase-8.sql. Idempotente.
--
-- Permite a un admin "liberar" un slot fijo reservado para públicas
-- (Mié/Jue 19h, Sáb/Dom 9h) sin tener que crear ya la partida. Cuando
-- hay un override habilitado, el slot pasa a "disponible" y un usuario
-- puede pedirlo como privada.
-- =========================================================================

create table if not exists public.slots_privada_overrides (
  fecha date not null,
  hora_inicio time not null,
  habilitado boolean not null default true,
  creado_por uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (fecha, hora_inicio)
);

create index if not exists slots_overrides_fecha_idx
  on public.slots_privada_overrides(fecha);

alter table public.slots_privada_overrides enable row level security;

drop policy if exists "slots_overrides lectura autenticados"
  on public.slots_privada_overrides;
create policy "slots_overrides lectura autenticados"
  on public.slots_privada_overrides
  for select using (auth.uid() is not null);

drop policy if exists "slots_overrides admin write"
  on public.slots_privada_overrides;
create policy "slots_overrides admin write"
  on public.slots_privada_overrides
  for all using (public.is_admin())
  with check (public.is_admin());
