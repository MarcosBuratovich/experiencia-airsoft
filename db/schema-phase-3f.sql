-- =========================================================================
-- Experiencia Airsoft — Fase 3F migration: templates de partidas recurrentes
-- Correr en Supabase SQL Editor despues de schema-phase-3e.sql. Idempotente.
-- =========================================================================

create table if not exists public.partida_templates (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0=dom, 6=sab
  hora_inicio time not null,
  duracion_min int not null default 180 check (duracion_min > 0),
  modalidad text not null check (modalidad in ('dinamica','tacsim','speedsoft')),
  cupo_max int not null check (cupo_max > 0),
  activo bool not null default true,
  created_at timestamptz not null default now()
);

create index if not exists partida_templates_activo_idx on public.partida_templates(activo);

-- Seed inicial (solo si la tabla esta vacia)
insert into public.partida_templates (dia_semana, hora_inicio, duracion_min, modalidad, cupo_max)
select dia, hora::time, 240, 'dinamica', 20 from (values
  (3, '19:00'),
  (4, '19:00'),
  (6, '09:00'),
  (0, '09:00')
) as v(dia, hora)
where not exists (select 1 from public.partida_templates);

-- =========================================================================
-- RLS: solo admin / super_admin
-- =========================================================================
alter table public.partida_templates enable row level security;

drop policy if exists "templates admin all" on public.partida_templates;
create policy "templates admin all" on public.partida_templates
  for all using (public.is_admin()) with check (public.is_admin());
