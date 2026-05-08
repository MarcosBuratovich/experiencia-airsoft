-- =========================================================================
-- Experiencia Airsoft — Fase 5: precios alineados al mensaje real + recargas
-- Correr en Supabase SQL Editor despues de schema-phase-4b.sql. Idempotente.
--
-- Cambios respecto al modelo anterior:
-- - Se borra `entrada_alquiler` de precios_config: ahora todos los no-socios
--   pagan la misma entrada base ($20.000) tanto si traen su equipo como si
--   alquilan. El alquiler suma el costo de la marcadora encima.
-- - Las keys `alquiler_marcadora` y `alquiler_premium` se mantienen pero
--   representan ahora "Marcadora simple" y "Marcadora avanzada con tracer".
-- - 3 nuevas keys para recargas de munición: recarga_tracer_100,
--   recarga_conv_200 y recarga_conv_400.
-- - inscripciones gana 3 columnas counter para esas recargas (un mismo
--   jugador puede pedir varias unidades de cada).
-- =========================================================================

-- ---------- inscripciones: 3 columnas para recargas -----------------------
alter table public.inscripciones
  add column if not exists recarga_tracer_100 int not null default 0
    check (recarga_tracer_100 >= 0 and recarga_tracer_100 <= 20),
  add column if not exists recarga_conv_200 int not null default 0
    check (recarga_conv_200 >= 0 and recarga_conv_200 <= 20),
  add column if not exists recarga_conv_400 int not null default 0
    check (recarga_conv_400 >= 0 and recarga_conv_400 <= 20);

-- ---------- precios_config: limpiar y agregar nuevas keys -----------------
delete from public.precios_config where key = 'entrada_alquiler';

insert into public.precios_config (key, valor, descripcion) values
  ('recarga_tracer_100', 0, '100 bbs tracer (recarga adicional)'),
  ('recarga_conv_200',   0, '200 bbs convencional (recarga adicional)'),
  ('recarga_conv_400',   0, '400 bbs convencional (recarga adicional)')
on conflict (key) do nothing;

-- Refrescar las descripciones de las keys existentes (no toca los valores ya
-- editados por super_admin)
update public.precios_config set descripcion = 'Entrada base — jugador con equipo propio o alquiler'
  where key = 'entrada_byop';
update public.precios_config set descripcion = 'Entrada socio al día (normalmente 0)'
  where key = 'entrada_socio';
update public.precios_config set descripcion = 'Marcadora simple — incluye protección básica'
  where key = 'alquiler_marcadora';
update public.precios_config set descripcion = 'Marcadora avanzada — con trazador + bbs tracer'
  where key = 'alquiler_premium';
update public.precios_config set descripcion = 'Chaleco táctico (extra)'
  where key = 'alquiler_chaleco';
