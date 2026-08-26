-- =========================================================================
-- Experiencia Airsoft — Fase 20: atribución del funnel de reserva
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- PROBLEMA QUE RESUELVE
-- Hoy no se puede responder qué canal trae gente que efectivamente reserva.
-- GA4 tiene los clicks pero no las reservas; Supabase tiene las reservas y
-- la plata pero no sabe de dónde vino nadie. `solicitudes_privada` guarda
-- `gclid` desde la fase 18, pero solo para privadas y solo para Google Ads.
--
-- CÓMO FUNCIONA
-- Un componente cliente escribe la cookie `ea_attr` en el primer pageview,
-- en el dominio raíz (.experienciaairsoft.com) para que sobreviva el salto
-- www → app. Es first-touch: si la cookie ya existe, no se toca. Al
-- anotarse o al registrarse, el server la lee y copia el origen acá.
--
-- Todas las columnas son nullable a propósito: una inscripción cargada por
-- un admin (walk-in, o alguien que arregló por WhatsApp) no tiene navegador
-- de origen y debe quedar en NULL. NULL significa "no sabemos", que es la
-- verdad, y no hay que confundirlo con "vino directo".
--
-- `atribucion_first_seen_at` guarda cuándo la persona llegó al sitio por
-- primera vez, NO cuándo se escribió la fila. Restado contra `created_at`
-- da cuánto tarda alguien desde que descubre el sitio hasta que reserva.
-- =========================================================================

alter table public.inscripciones
  -- Campaña: de dónde vino (instagram, google), qué tipo de tráfico
  -- (social, cpc, organic) y qué campaña puntual.
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  -- Identificador del clic en un anuncio de Meta.
  add column if not exists fbclid       text,
  -- SOLO el host del referrer (instagram.com), nunca la URL completa: no
  -- queremos guardar por qué páginas navegó la persona.
  add column if not exists referrer_host text,
  -- Primera página del sitio que vio.
  add column if not exists landing_path  text,
  -- Cuándo llegó por primera vez (de la cookie, no del insert).
  add column if not exists atribucion_first_seen_at timestamptz;

alter table public.profiles
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists fbclid       text,
  add column if not exists referrer_host text,
  add column if not exists landing_path  text,
  add column if not exists atribucion_first_seen_at timestamptz;

-- Índices parciales: los reportes agrupan por canal y la enorme mayoría de
-- las filas viejas tienen NULL, no tiene sentido indexarlas.
create index if not exists inscripciones_utm_source_idx
  on public.inscripciones(utm_source)
  where utm_source is not null;

create index if not exists profiles_utm_source_idx
  on public.profiles(utm_source)
  where utm_source is not null;

-- =========================================================================
-- Trigger handle_new_user: sumar la atribución que manda signupAction.
--
-- CUIDADO: esta función está en el camino crítico del registro. Si tira,
-- nadie se puede registrar. Por eso:
--   - `nullif(..., '')` en vez de `coalesce(..., '')`: acá un string vacío
--     tiene que quedar NULL ("no sabemos"), al revés de nombre/apellido que
--     son obligatorios y usan coalesce.
--   - El cast a timestamptz va con regex de validación previa: si llega
--     basura, queda NULL en vez de abortar el registro.
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_seen text := new.raw_user_meta_data->>'first_seen_at';
begin
  insert into public.profiles (
    id, nombre, apellido, dni, celular, email, player_number,
    utm_source, utm_medium, utm_campaign, fbclid,
    referrer_host, landing_path, atribucion_first_seen_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', ''),
    coalesce(new.raw_user_meta_data->>'apellido', ''),
    coalesce(new.raw_user_meta_data->>'dni', ''),
    coalesce(new.raw_user_meta_data->>'celular', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'player_number', ''),
    nullif(new.raw_user_meta_data->>'utm_source', ''),
    nullif(new.raw_user_meta_data->>'utm_medium', ''),
    nullif(new.raw_user_meta_data->>'utm_campaign', ''),
    nullif(new.raw_user_meta_data->>'fbclid', ''),
    nullif(new.raw_user_meta_data->>'referrer_host', ''),
    nullif(new.raw_user_meta_data->>'landing_path', ''),
    -- Solo casteamos si tiene pinta de ISO-8601. Cualquier otra cosa → NULL.
    case
      when v_first_seen ~ '^\d{4}-\d{2}-\d{2}T'
      then v_first_seen::timestamptz
      else null
    end
  );
  return new;
end;
$$;
