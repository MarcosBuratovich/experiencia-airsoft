-- =========================================================================
-- Experiencia Airsoft — Fase 14: redes sociales de clanes
-- =========================================================================
--
-- Permite a cada clan vincular su canal de YouTube y/o su perfil de
-- Instagram. Los links se muestran como botones en la página pública del
-- clan (/clanes/<slug>).
--
-- Seguridad:
-- - Check constraints a nivel DB que solo aceptan URLs https de los
--   dominios oficiales (youtube.com / youtu.be / instagram.com). Es
--   defensa en profundidad: la Server Action ya valida con Zod, pero el
--   constraint impide que cualquier insert/update directo (psql, RPC,
--   etc.) meta una URL maliciosa tipo javascript:alert(1).
-- - Largo máximo 300 chars: alcanza para cualquier link real y evita
--   payloads inflados.
-- =========================================================================

alter table public.clanes
  add column if not exists youtube_url text,
  add column if not exists instagram_url text;

-- Solo aceptamos https + dominio oficial. Cubrimos:
--   https://www.youtube.com/@handle
--   https://www.youtube.com/channel/UCxxx
--   https://m.youtube.com/...
--   https://youtu.be/<id>
alter table public.clanes
  drop constraint if exists clanes_youtube_url_format;
alter table public.clanes
  add constraint clanes_youtube_url_format check (
    youtube_url is null
    or youtube_url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/'
  );

-- Cubrimos:
--   https://www.instagram.com/<handle>/
--   https://instagram.com/<handle>/
alter table public.clanes
  drop constraint if exists clanes_instagram_url_format;
alter table public.clanes
  add constraint clanes_instagram_url_format check (
    instagram_url is null
    or instagram_url ~ '^https://(www\.)?instagram\.com/'
  );

alter table public.clanes
  drop constraint if exists clanes_youtube_url_len;
alter table public.clanes
  add constraint clanes_youtube_url_len check (
    youtube_url is null or char_length(youtube_url) <= 300
  );

alter table public.clanes
  drop constraint if exists clanes_instagram_url_len;
alter table public.clanes
  add constraint clanes_instagram_url_len check (
    instagram_url is null or char_length(instagram_url) <= 300
  );
