-- =========================================================================
-- Experiencia Airsoft — Fase 3E migration: solicitudes de partida privada
-- Correr en Supabase SQL Editor, despues de schema-phase-3e-fix.sql.
-- Idempotente.
-- =========================================================================

create table if not exists public.solicitudes_privada (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fecha_propuesta date not null,
  hora_inicio time not null,
  duracion_min int not null default 180 check (duracion_min between 60 and 480),
  cupo_estimado int not null check (cupo_estimado between 2 and 60),
  modalidad text not null default 'dinamica'
    check (modalidad in ('dinamica','tacsim','speedsoft')),
  notas text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','aprobada','rechazada','cancelada')),
  partida_id uuid references public.partidas(id) on delete set null,
  respuesta_admin text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists solicitudes_privada_user_idx
  on public.solicitudes_privada(user_id);
create index if not exists solicitudes_privada_estado_idx
  on public.solicitudes_privada(estado);
create index if not exists solicitudes_privada_fecha_idx
  on public.solicitudes_privada(fecha_propuesta);

-- Solo una solicitud pendiente simultanea por usuario (evita spam)
create unique index if not exists solicitudes_privada_pending_user_uq
  on public.solicitudes_privada(user_id) where estado = 'pendiente';

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.solicitudes_privada enable row level security;

-- El usuario ve las suyas; admin ve todas
drop policy if exists "solicitudes_privada select self o admin" on public.solicitudes_privada;
create policy "solicitudes_privada select self o admin" on public.solicitudes_privada
  for select using (user_id = auth.uid() or public.is_admin());

-- Cualquier user crea su propia solicitud
drop policy if exists "solicitudes_privada insert self" on public.solicitudes_privada;
create policy "solicitudes_privada insert self" on public.solicitudes_privada
  for insert with check (user_id = auth.uid());

-- El user puede cancelar la suya; admin puede actualizar cualquiera
drop policy if exists "solicitudes_privada update" on public.solicitudes_privada;
create policy "solicitudes_privada update" on public.solicitudes_privada
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
