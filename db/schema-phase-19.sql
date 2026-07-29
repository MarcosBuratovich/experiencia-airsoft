-- =========================================================================
-- Experiencia Airsoft — Fase 19: asistente de mensajes
-- Correr en SQL Editor de Supabase. Idempotente.
--
-- PROBLEMA QUE RESUELVE
-- Toda la conversión del negocio pasa por mensajería y hoy la contesta una
-- persona cuando puede. Estas tablas sostienen un asistente que responde lo
-- repetitivo y escala lo comercial.
--
-- POR QUÉ SE PERSISTE EL HISTORIAL
-- Meta entrega mensajes sueltos, sin hilo. Sin guardar la conversación de
-- nuestro lado el bot no tiene memoria dentro de una misma charla — que es
-- la causa principal de que los bots suenen repetitivos (vuelven a saludar
-- en el cuarto mensaje).
--
-- PRIVACIDAD
-- Todo es solo para administradores. Ni un jugador autenticado puede leer
-- conversaciones de otro. Retención: 12 meses.
-- =========================================================================

-- --- Conversaciones ------------------------------------------------------
create table if not exists public.bot_conversaciones (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('instagram','messenger','comentario','prueba')),
  -- Identificador de la persona con alcance de página (PSID). Instagram y
  -- Messenger no dan teléfono ni email: esto es todo lo que hay.
  externo_id text not null,
  nombre text,
  -- 'bot' = contesta el asistente. 'humano' = lo tomó una persona y el bot
  -- enmudece. 'cerrada' = terminada.
  estado text not null default 'bot' check (estado in ('bot','humano','cerrada')),
  motivo_escalado text,
  resumen_escalado text,

  -- Segmentación: la emite el modelo con cada respuesta y se sobreescribe.
  -- La del último turno es la buena.
  intencion text check (intencion in
    ('partida_abierta','privada_cumple','privada_corp','tienda','socio','otro')),
  grupo_tam int check (grupo_tam is null or (grupo_tam between 1 and 500)),
  fecha_tentativa date,
  duda_principal text check (duda_principal in
    ('precio','dolor','edad','ubicacion','equipo','clima','pago','otro')),
  primera_vez text check (primera_vez in ('si','no','desconocido')),
  -- 'se_anoto' NO lo decide el modelo: se cruza contra inscripciones y
  -- solicitudes_privada. El bot no tiene forma de saberlo.
  desenlace text check (desenlace in ('link_enviado','se_anoto','frio','escalada')),

  created_at timestamptz not null default now(),
  ultimo_mensaje_at timestamptz not null default now(),
  unique (canal, externo_id)
);

create index if not exists bot_conversaciones_estado_idx
  on public.bot_conversaciones(estado, ultimo_mensaje_at desc);

-- --- Mensajes ------------------------------------------------------------
create table if not exists public.bot_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null
    references public.bot_conversaciones(id) on delete cascade,
  rol text not null check (rol in ('usuario','bot','humano')),
  texto text not null,
  -- Id del mensaje en Meta. UNIQUE porque Meta reintenta entregas: sin esto
  -- el bot contesta el mismo mensaje varias veces, y cada vuelta cuesta.
  externo_mid text unique,
  tokens_entrada int,
  tokens_salida int,
  costo_usd numeric(10,6),
  created_at timestamptz not null default now()
);

create index if not exists bot_mensajes_conversacion_idx
  on public.bot_mensajes(conversacion_id, created_at);
create index if not exists bot_mensajes_costo_idx
  on public.bot_mensajes(created_at) where costo_usd is not null;

-- --- Base de conocimiento ------------------------------------------------
-- Lo que está en la cabeza del dueño: si duele, qué llevar, edad mínima.
-- Se inyecta en el prompt (con caché), no se consulta por herramienta.
create table if not exists public.bot_conocimiento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bot_conocimiento_activo_idx
  on public.bot_conocimiento(activo, orden);

-- --- Preguntas que no supo responder -------------------------------------
create table if not exists public.bot_pendientes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid references public.bot_conversaciones(id) on delete set null,
  pregunta text not null,
  estado text not null default 'abierta' check (estado in ('abierta','resuelta','descartada')),
  created_at timestamptz not null default now()
);

-- --- Configuración (fila única) ------------------------------------------
create table if not exists public.bot_config (
  id boolean primary key default true check (id),
  encendido boolean not null default false,
  modelo text not null default 'claude-sonnet-5',
  -- Tope de gasto diario en USD. Al alcanzarlo el bot se apaga solo.
  tope_diario_usd numeric(10,2) not null default 3.00,
  -- Mensajes del bot en una conversación antes de escalar por las dudas.
  -- Corta loops y charlas eternas.
  max_mensajes_conversacion int not null default 8,
  updated_at timestamptz not null default now()
);

insert into public.bot_config (id) values (true) on conflict (id) do nothing;

-- --- RLS -----------------------------------------------------------------
-- Todo es sensible: nombres de clientes y el contenido de sus consultas.
alter table public.bot_conversaciones enable row level security;
alter table public.bot_mensajes       enable row level security;
alter table public.bot_conocimiento   enable row level security;
alter table public.bot_pendientes     enable row level security;
alter table public.bot_config         enable row level security;

drop policy if exists bot_conversaciones_admin on public.bot_conversaciones;
create policy bot_conversaciones_admin on public.bot_conversaciones
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bot_mensajes_admin on public.bot_mensajes;
create policy bot_mensajes_admin on public.bot_mensajes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bot_conocimiento_admin on public.bot_conocimiento;
create policy bot_conocimiento_admin on public.bot_conocimiento
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bot_pendientes_admin on public.bot_pendientes;
create policy bot_pendientes_admin on public.bot_pendientes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bot_config_admin on public.bot_config;
create policy bot_config_admin on public.bot_config
  for all using (public.is_admin()) with check (public.is_admin());

-- El webhook corre con service role (bypassa RLS): no necesita policy propia.
