-- =========================================================================
-- Experiencia Airsoft — Fix post 3D: tipo_jugador pasa de profiles a inscripciones
-- Correr en Supabase SQL Editor, despues de schema-phase-3d.sql.
-- Idempotente.
-- =========================================================================

-- 1) Agregar tipo_jugador a inscripciones (default 'byop' para los existentes)
alter table public.inscripciones
  add column if not exists tipo_jugador text not null default 'byop'
    check (tipo_jugador in ('alquiler','byop'));

-- 2) Sacar tipo_jugador de profiles (ya no se usa, se decide por partida)
drop index if exists public.profiles_tipo_jugador_idx;
alter table public.profiles drop column if exists tipo_jugador;

-- 3) Restaurar trigger handle_new_user sin tipo_jugador
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, apellido, dni, celular, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', ''),
    coalesce(new.raw_user_meta_data->>'celular', ''),
    new.email
  );
  return new;
end;
$$;
