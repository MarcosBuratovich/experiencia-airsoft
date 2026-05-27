-- =========================================================================
-- Experiencia Airsoft — Fase 13: flair de perfil (glitch para Marcos)
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Agrega un campo `flair` opcional al profile, hoy usado solo por
-- "glitch" (efecto visual en el nombre cuando aparece en partidas y
-- listas de clanes). Solo admins pueden setearlo — el trigger
-- prevent_self_priv_escalation (phase-11) lo bloquea para no-admins.
-- El user objetivo lo activa por SQL acá abajo.
-- =========================================================================

-- 1) Nueva columna con check list-limitado (extensible si en el
--    futuro queremos más efectos).
alter table public.profiles
  add column if not exists flair text
    check (flair is null or flair in ('glitch'));

-- 2) Exponer en la vista pública (es safe — es solo un flag visual).
create or replace view public.profiles_publicos
with (security_invoker = false)
as
select
  id,
  nombre,
  apellido,
  alias,
  player_number,
  socio,
  flair
from public.profiles;

grant select on public.profiles_publicos to authenticated, anon;

-- 3) Extender el trigger anti-escalación para que flair también requiera
--    admin (defense in depth — además de que el campo no aparece en
--    actualizarPerfilAction, esto cubre cualquier llamada directa).
create or replace function public.prevent_self_priv_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.role is distinct from new.role then
    raise exception 'No autorizado a cambiar role';
  end if;
  if old.socio is distinct from new.socio then
    raise exception 'No autorizado a cambiar socio';
  end if;
  if old.socio_desde is distinct from new.socio_desde then
    raise exception 'No autorizado a cambiar socio_desde';
  end if;
  if old.cuota_mensual is distinct from new.cuota_mensual then
    raise exception 'No autorizado a cambiar cuota_mensual';
  end if;
  if old.flair is distinct from new.flair then
    raise exception 'No autorizado a cambiar flair';
  end if;

  return new;
end$$;

-- 4) Activar glitch para Marcos (cambiar el email si querés que sea otro).
update public.profiles
set flair = 'glitch'
where email = 'marcos.buratovich@creamos.com';
