-- =========================================================================
-- Experiencia Airsoft — Fase 18: conversiones offline de Google Ads
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- PROBLEMA QUE RESUELVE
-- Una privada nace en la web (la solicitud) pero se cierra a mano por
-- WhatsApp. Google Ads solo ve "alguien pidió presupuesto" y optimiza las
-- campañas hacia gente que consulta, no hacia gente que contrata. Para que
-- aprenda de las ventas reales hay que devolverle la conversión cerrada, y
-- para eso Google necesita el `gclid`: el identificador del clic en el
-- anuncio que trajo a esa persona.
--
-- CÓMO FUNCIONA
-- El tag de Google guarda el gclid en la cookie `_gcl_aw` del navegador
-- (dominio raíz, así que sobrevive el salto www → app). Al enviarse la
-- solicitud lo copiamos acá; cuando el admin la aprueba y la partida se
-- juega, se exporta un CSV a Google Ads con gclid + monto real.
--
-- `valor_cerrado` permite corregir a mano el monto antes de exportar (el
-- estimado sale de cupo × precio de entrada).
-- =========================================================================

alter table public.solicitudes_privada
  -- Identificador del clic en el anuncio (cookie _gcl_aw). Null = la persona
  -- no vino de un anuncio, o vino antes de que existiera esta captura.
  add column if not exists gclid text,
  -- Cuándo se capturó, para descartar clics vencidos (Ads acepta hasta 90
  -- días desde el clic).
  add column if not exists gclid_at timestamptz,
  -- Monto real cobrado, en pesos. Null = usar el estimado (cupo × entrada).
  add column if not exists valor_cerrado int,
  -- Marca de exportación, para no subir la misma conversión dos veces.
  add column if not exists conversion_exportada_at timestamptz;

-- Solo se exportan las que tienen gclid; el índice acompaña esa consulta.
create index if not exists solicitudes_privada_gclid_idx
  on public.solicitudes_privada(gclid)
  where gclid is not null;
