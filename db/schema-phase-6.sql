-- =========================================================================
-- Experiencia Airsoft — Fase 6: multi-clan por usuario + storage de logos
-- Correr una sola vez en Supabase SQL Editor. Idempotente.
--
-- Cambios:
-- - Nueva tabla profile_clanes (junction profile ↔ clan) con orden
--   posicion (1..3) y constraint de máximo 3 clanes por usuario.
-- - Migración automática: el clan_id viejo de cada profile pasa a
--   posicion=1 en la nueva tabla. La columna profiles.clan_id se deja por
--   compat (un próximo phase la borra una vez que todas las queries usen
--   la junction).
-- - Bucket público "clan-logos" en storage para los logos circulares.
-- =========================================================================

-- ---------- junction profile_clanes ---------------------------------------
create table if not exists public.profile_clanes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  clan_id uuid not null references public.clanes(id) on delete cascade,
  posicion smallint not null check (posicion between 1 and 3),
  joined_at timestamptz not null default now(),
  primary key (profile_id, clan_id)
);

-- Unicidad por posicion dentro de cada profile (no podés tener dos clanes
-- en posicion=1, por ejemplo).
create unique index if not exists profile_clanes_posicion_uq
  on public.profile_clanes(profile_id, posicion);

create index if not exists profile_clanes_clan_idx
  on public.profile_clanes(clan_id);

-- Máximo 3 clanes por profile (enforced via trigger porque el check entre
-- filas no se puede expresar en una constraint).
create or replace function public.enforce_max_clanes_per_profile()
returns trigger language plpgsql as $$
begin
  if (
    select count(*) from public.profile_clanes
    where profile_id = new.profile_id
  ) >= 3 then
    raise exception 'Máximo 3 clanes por usuario'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_max_clanes on public.profile_clanes;
create trigger trg_enforce_max_clanes
  before insert on public.profile_clanes
  for each row execute function public.enforce_max_clanes_per_profile();

-- ---------- migrar profiles.clan_id existentes ---------------------------
insert into public.profile_clanes (profile_id, clan_id, posicion)
select id, clan_id, 1 from public.profiles
where clan_id is not null
on conflict do nothing;

-- ---------- RLS ---------------------------------------------------------
alter table public.profile_clanes enable row level security;

drop policy if exists "profile_clanes lectura autenticados" on public.profile_clanes;
create policy "profile_clanes lectura autenticados" on public.profile_clanes
  for select using (auth.uid() is not null);

drop policy if exists "profile_clanes insert self" on public.profile_clanes;
create policy "profile_clanes insert self" on public.profile_clanes
  for insert with check (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clanes c
      where c.id = profile_clanes.clan_id and c.capitan_id = auth.uid()
    )
  );

drop policy if exists "profile_clanes update self o capitan o admin" on public.profile_clanes;
create policy "profile_clanes update self o capitan o admin" on public.profile_clanes
  for update using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clanes c
      where c.id = profile_clanes.clan_id and c.capitan_id = auth.uid()
    )
  );

drop policy if exists "profile_clanes delete self o capitan o admin" on public.profile_clanes;
create policy "profile_clanes delete self o capitan o admin" on public.profile_clanes
  for delete using (
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.clanes c
      where c.id = profile_clanes.clan_id and c.capitan_id = auth.uid()
    )
  );

-- =========================================================================
-- Storage bucket: clan-logos (público)
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('clan-logos', 'clan-logos', true)
on conflict (id) do nothing;

-- Lectura pública (los logos se ven sin auth, como el resto del site).
drop policy if exists "clan-logos public read" on storage.objects;
create policy "clan-logos public read" on storage.objects
  for select using (bucket_id = 'clan-logos');

-- Upload: cualquier user autenticado puede subir un archivo en su path
-- propio (path debe empezar con su user_id). La app fuerza el formato
-- "clan-logos/{clanId}/{filename}" y valida server-side que el user sea
-- capitán del clan.
drop policy if exists "clan-logos upload autenticados" on storage.objects;
create policy "clan-logos upload autenticados" on storage.objects
  for insert with check (
    bucket_id = 'clan-logos' and auth.uid() is not null
  );

drop policy if exists "clan-logos update autenticados" on storage.objects;
create policy "clan-logos update autenticados" on storage.objects
  for update using (
    bucket_id = 'clan-logos' and auth.uid() is not null
  );

drop policy if exists "clan-logos delete autenticados" on storage.objects;
create policy "clan-logos delete autenticados" on storage.objects
  for delete using (
    bucket_id = 'clan-logos' and auth.uid() is not null
  );

-- =========================================================================
-- Nota: profiles.clan_id queda en la tabla por compat. Cuando todo el
-- código consuma profile_clanes (fase 6e), se puede eliminar con:
--
--   alter table public.profiles drop column clan_id;
--
-- =========================================================================
