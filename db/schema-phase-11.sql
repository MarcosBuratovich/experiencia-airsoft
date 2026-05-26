-- =========================================================================
-- Experiencia Airsoft — Fase 11: hardening de profiles (anti-escalación)
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- Bug que cubre (defense-in-depth):
-- - La policy de UPDATE de profiles es (id = auth.uid() OR is_admin()),
--   lo que es correcto para que un user pueda editar su propio celular,
--   alias, etc. PERO también dejaba que se updatee campos sensibles
--   (role, socio, cuota_mensual, player_number) sobre su propia fila.
-- - Server actions de /admin/usuarios ahora chequean is_admin antes de
--   mutar, pero un atacante que llame las actions directamente y
--   bypassee el chequeo (por bug futuro) llegaría a la DB. Este trigger
--   es la última línea de defensa: rechaza UPDATEs a campos sensibles
--   hechos por usuarios no-admin.
-- =========================================================================

create or replace function public.prevent_self_priv_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si el caller es admin, no chequeamos nada.
  if public.is_admin() then
    return new;
  end if;

  -- Para no-admins, ninguno de estos campos puede cambiar.
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

  -- player_number sí se puede cambiar (el user puede editarlo en /perfil),
  -- pero el unique index ya cubre colisiones.

  return new;
end$$;

drop trigger if exists trg_prevent_self_priv_escalation on public.profiles;
create trigger trg_prevent_self_priv_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_priv_escalation();
