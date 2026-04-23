-- =========================================================================
-- Experiencia Airsoft — Fase 2 migration: socios + cuota mensual
-- Correr una sola vez en Supabase SQL Editor después de `schema.sql`.
-- =========================================================================

-- ---------- profiles: campos de socio ------------------------------------
alter table public.profiles
  add column if not exists socio boolean not null default false,
  add column if not exists socio_desde date,
  add column if not exists cuota_mensual int not null default 0;

create index if not exists profiles_socio_idx on public.profiles(socio) where socio = true;

-- ---------- socio_pagos --------------------------------------------------
create table if not exists public.socio_pagos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  periodo text not null check (periodo ~ '^\d{4}-\d{2}$'),  -- ej. "2026-04"
  monto int not null,
  metodo text not null check (metodo in ('efectivo','transferencia')),
  fecha_pago date not null default current_date,
  registrado_por uuid not null references public.profiles(id),
  nota text,
  created_at timestamptz not null default now(),
  unique(user_id, periodo)
);

create index if not exists socio_pagos_periodo_idx on public.socio_pagos(periodo);
create index if not exists socio_pagos_user_idx on public.socio_pagos(user_id);

alter table public.socio_pagos enable row level security;

drop policy if exists "socio_pagos admin all" on public.socio_pagos;
create policy "socio_pagos admin all" on public.socio_pagos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "socio_pagos self read" on public.socio_pagos;
create policy "socio_pagos self read" on public.socio_pagos
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------- helper: periodos a mostrar (3 últimos) -----------------------
-- (no hace falta guardar esto, lo calcula la UI — dejamos el schema limpio)
