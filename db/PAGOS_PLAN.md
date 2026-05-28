# Plan de pagos — Experiencia Airsoft

> Documento de planning. NO se implementa nada todavía. El objetivo es
> dejar los flujos cerrados antes de tocar código o integrar a Nave.

Última actualización: 2026-05-28

---

## 1. Decisiones de producto (cerradas)

| Tema | Decisión |
| --- | --- |
| Proveedor de pago | **Nave** (`nave.com.ar`, fintech argentina, soporta tarjetas + recurrente) |
| Cuota socio | **Las dos opciones**: adhesión recurrente con tarjeta (auto-débito) o pago manual mes a mes |
| Cupo alquiler pendiente | **Bloquea cupo sin expiración** — la inscripción queda confirmada al instante, el pago queda pendiente. Solo se libera si el host la cancela |
| Facturación AFIP | **No en v1**. Recibo simple por mail. AFIP queda para v2 |
| Pagador del alquiler | **Host paga todo** — un solo cargo por todos sus guests |
| Seña privada | **Monto fijo por persona** (default $5.000 × cantidad estimada) |
| Interés por mora cuota | **Recargo fijo 10%** después del día 10 del mes |
| Refund inscripción pública | 24h+ antes: refund 100%; <24h: crédito a favor 3 meses |
| Refund seña privada | No reembolsable |
| Refund cuota socio | No reembolsable (mes en curso) |
| Pago en local | Siempre disponible como opción; aplica **10% descuento** |

### Defaults configurables (van en tabla `pagos_config`)

```
CUOTA_VENCIMIENTO_DIA       = 10        // día del mes después del cual aplica recargo
CUOTA_RECARGO_MORA_PCT      = 10        // % flat de recargo si pagás tarde
PRIVADA_SENA_POR_PERSONA    = 5000      // ARS por persona estimada
LOCAL_DESCUENTO_PCT         = 10        // % off pagando en local
CREDITO_VIGENCIA_MESES      = 3         // cuánto dura un crédito a favor
CANCELACION_VENTANA_HORAS   = 24        // antes de la partida = refund full; después = crédito
```

Estos valores quedan en DB para que el super_admin los pueda cambiar desde
`/admin/precios` sin redeploy.

---

## 2. Modelo de datos

### 2.1 Tablas nuevas

#### `payments`

Registro universal de todo pago, sin importar el origen (Nave, efectivo,
transferencia, admin manual). Es la fuente de verdad para reconciliación.

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,

  -- Monto y descuentos
  amount_gross integer not null,        -- ARS centavos (sin descuento)
  amount_discount integer not null default 0,
  amount_net integer generated always as (amount_gross - amount_discount) stored,
  currency text not null default 'ARS',

  -- Origen / método
  provider text not null,               -- 'nave' | 'cash' | 'transfer' | 'manual_admin'
  method text not null,                 -- 'card' | 'preapproval' | 'cash' | 'transfer' | 'qr' | 'manual'
  provider_payment_id text,             -- id externo (Nave)
  provider_metadata jsonb,              -- raw response para diagnóstico

  -- Para qué se cobró
  purpose text not null,                -- 'cuota_socio' | 'inscripcion' | 'alquiler_guests' | 'privada_sena' | 'privada_saldo' | 'recarga' | 'credito_recovery'
  linked_id uuid,                       -- id polimórfico (inscripción, solicitud, etc)
  description text not null,            -- "Cuota mayo 2026" / "Entrada partida 31/05 14hs"

  -- Status y timing
  status text not null,                 -- 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded' | 'canceled' | 'expired'
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,                  -- cuándo confirmó el provider
  expires_at timestamptz,               -- para links de pago con TTL

  -- Anti-double-charge
  idempotency_key text not null unique,

  -- Quién inició
  created_by uuid references profiles(id), -- null = self-service, else = admin que registró

  -- Auditoría
  discount_reason text                  -- 'pago_local_10' | 'anticipado' | etc
);

create index payments_user_idx on payments(user_id);
create index payments_linked_idx on payments(purpose, linked_id);
create index payments_status_idx on payments(status) where status in ('pending', 'processing');
create index payments_provider_id_idx on payments(provider_payment_id) where provider_payment_id is not null;
```

#### `subscriptions`

Adhesión recurrente con tarjeta para socios. Una sola activa por user.

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null default 'cuota_socio',

  -- Estado
  status text not null,                 -- 'pending_setup' | 'active' | 'paused' | 'canceled' | 'past_due'

  -- Provider
  provider text not null default 'nave',
  provider_subscription_id text unique,

  -- Plan
  amount integer not null,              -- ARS centavos, locked al adherir
  billing_day int not null default 1,   -- día del mes que se debita

  -- Fechas
  started_at timestamptz,
  next_billing_at timestamptz,
  canceled_at timestamptz,
  cancel_reason text,                   -- 'user_request' | 'card_declined_3x' | 'admin'

  -- Metadata
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Solo una sub activa por user
  constraint one_active_per_user
    exclude (user_id with =) where (status in ('pending_setup', 'active', 'past_due'))
);
```

#### `creditos`

Saldo a favor de un user (por cancelación <24h). Se descuenta automático
en la próxima inscripción.

```sql
create table creditos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  amount integer not null,              -- centavos ARS
  reason text not null,                 -- 'cancelacion_tardia' | 'cortesia' | 'reembolso_manual'
  origin_payment_id uuid references payments(id),

  -- Vigencia
  created_at timestamptz default now(),
  expires_at timestamptz not null,      -- created_at + CREDITO_VIGENCIA_MESES
  consumed_at timestamptz,
  consumed_by_payment_id uuid references payments(id),

  -- Notas
  notes text,
  created_by uuid references profiles(id)
);

create index creditos_active_idx on creditos(user_id)
  where consumed_at is null and expires_at > now();
```

#### `refunds`

Auditoría de devoluciones (operación reversa de un payment exitoso).

```sql
create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  amount integer not null,              -- puede ser parcial
  reason text not null,
  status text not null,                 -- 'pending' | 'succeeded' | 'failed'
  provider_refund_id text,
  created_at timestamptz default now(),
  completed_at timestamptz,
  created_by uuid references profiles(id)
);
```

#### `pagos_config`

Tabla de un solo registro con los defaults configurables (similar a
`precios_config`).

```sql
create table pagos_config (
  key text primary key,
  valor integer not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id)
);

insert into pagos_config (key, valor) values
  ('cuota_vencimiento_dia', 10),
  ('cuota_recargo_mora_pct', 10),
  ('privada_sena_por_persona', 5000),
  ('local_descuento_pct', 10),
  ('credito_vigencia_meses', 3),
  ('cancelacion_ventana_horas', 24);
```

### 2.2 Cambios a tablas existentes

#### `socio_pagos` — extender

```sql
alter table socio_pagos
  add column payment_id uuid references payments(id),
  add column subscription_id uuid references subscriptions(id),
  add column recargo_mora integer default 0,    -- centavos
  add column descuento_local integer default 0; -- centavos
```

#### `inscripciones` — extender

```sql
alter table inscripciones
  add column payment_status text not null default 'no_aplica',
    -- 'no_aplica' (socio al día) | 'pendiente' | 'pagado' | 'cobrado_local'
  add column payment_id uuid references payments(id),
  add column es_alquiler_guest boolean not null default false,
    -- si true, esta fila es un guest de algún host (agregado_por != null)
  add column monto_total integer;
    -- snapshot del monto a cobrar al momento de inscribirse (centavos)
```

Nota: cuando un host tiene 3 guests, hay 3 filas en `inscripciones`. El
pago de los 3 va en un solo `payment` que las cubre via `linked_id` =
id del host (el "lote"). Ver flujo §4.3.

Para soportar lotes de alquiler, agregamos una columna que agrupe:

```sql
alter table inscripciones
  add column lote_id uuid;
create index inscripciones_lote_idx on inscripciones(lote_id) where lote_id is not null;
```

Todas las inscripciones de guests agregados al mismo tiempo por el mismo
host comparten un `lote_id` que es el `linked_id` del payment.

#### `solicitudes_privada` — extender

```sql
alter table solicitudes_privada
  add column sena_status text not null default 'no_aplica',
    -- 'no_aplica' (pendiente o rechazada) | 'pendiente' | 'pagada'
  add column sena_payment_id uuid references payments(id),
  add column sena_monto integer,           -- centavos
  add column sena_vence_at timestamptz;    -- si no paga en X días tras aprobación, se cae
```

#### `partidas` (privadas aprobadas) — extender

```sql
alter table partidas
  add column saldo_pagado_at timestamptz,
  add column saldo_payment_id uuid references payments(id);
```

---

## 3. Arquitectura del provider abstraction

### 3.1 Interface

El resto de la app NO importa nada de Nave directamente. Se habla con
un `PaymentProvider` genérico. Esto nos permite cambiar a Mercado Pago
o agregar un segundo provider sin romper el resto.

```typescript
// lib/payments/types.ts

export type CreatePaymentInput = {
  amount: number;              // centavos ARS
  description: string;
  metadata: Record<string, string>;
  callbackUrl: string;         // /pagos/return después del pago
  idempotencyKey: string;
};

export type CreatePaymentResult = {
  providerPaymentId: string;
  payUrl: string;              // a dónde mandar al user
  expiresAt: Date;
};

export type CreateSubscriptionInput = {
  userId: string;
  amount: number;
  description: string;
  billingDay: number;
  setupCallbackUrl: string;
};

export type WebhookEvent =
  | { type: 'payment.succeeded'; providerPaymentId: string; amount: number; paidAt: Date }
  | { type: 'payment.failed'; providerPaymentId: string; reason: string }
  | { type: 'subscription.charged'; providerSubscriptionId: string; amount: number; paidAt: Date; chargeId: string }
  | { type: 'subscription.failed'; providerSubscriptionId: string; reason: string }
  | { type: 'subscription.canceled'; providerSubscriptionId: string };

export interface PaymentProvider {
  name: string;                 // 'nave'
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<{ providerSubscriptionId: string; setupUrl: string }>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<{ providerRefundId: string }>;
  verifyWebhook(headers: Headers, body: string): Promise<WebhookEvent>;
}
```

### 3.2 Implementaciones

- `lib/payments/nave.ts` — implementa `PaymentProvider` contra la API de Nave
- `lib/payments/manual.ts` — implementación dummy para registros manuales
  (admin marca un cobro en efectivo). Mete directo en `payments` con
  `status='succeeded'`, sin hablar con ningún provider.

### 3.3 Factory

```typescript
// lib/payments/index.ts
import { NaveProvider } from './nave';

export function getProvider(): PaymentProvider {
  return new NaveProvider({
    apiKey: process.env.NAVE_API_KEY!,
    webhookSecret: process.env.NAVE_WEBHOOK_SECRET!,
  });
}
```

Variables de entorno nuevas:

```
NAVE_API_KEY=
NAVE_WEBHOOK_SECRET=
NAVE_PUBLIC_KEY=     # para el SDK del cliente si hace falta
NEXT_PUBLIC_PAGOS_HABILITADO=false  # feature flag
```

---

## 4. Flujos en detalle

### 4.1 Cuota de socio

Dos modos a elección del socio: **adhesión recurrente** o **manual**.
Pueden coexistir (alguien adhiere y después la pausa y vuelve a manual).

#### 4.1.1 Adhesión recurrente

```
[Socio en /perfil]
  ↓ click "Adherir cuota automática"
[modal con monto, frecuencia, fecha de débito]
  ↓ confirma
[Server Action: crear subscription en 'pending_setup' + redirigir a setupUrl de Nave]
  ↓ user adhiere tarjeta en Nave
[Webhook subscription.setup_completed]
  ↓ subscription.status = 'active'
  ↓ start_at = hoy, next_billing_at = próximo billing_day
[Mes 1, día billing_day]
  ↓ Nave cobra
[Webhook subscription.charged]
  ↓ insertar payment(status=succeeded, purpose=cuota_socio, subscription_id)
  ↓ insertar socio_pagos(periodo=YYYY-MM, payment_id, subscription_id)
  ↓ avanzar next_billing_at
  ↓ enviar email "Cuota cobrada"
```

**Falla de cobro recurrente**:
- `subscription.failed` → status pasa a `past_due`
- Se reintenta 3 días después, otra vez 7 días después
- Tras 3 fallos: `status='canceled'`, `cancel_reason='card_declined_3x'`
- Email al user en cada paso

**Pausar / cancelar**:
- User puede pausar (status=`paused`) o cancelar (`canceled`) desde
  `/perfil → suscripción`
- Pausar = no se cobra el próximo mes pero la tarjeta queda guardada
- Cancelar = se borra la subscription en Nave también

#### 4.1.2 Pago manual mes a mes

Cuando el user NO tiene subscription activa:

```
[Socio en /perfil o /dashboard]
  ↓ ve "Tu cuota de mayo está pendiente · $10.000"
  ↓ click "Pagar cuota"
[Server Action: calcula monto = base + recargo_mora]
  ↓ crea payment(status=pending, idempotency_key)
  ↓ providerPayment = nave.createPayment(...)
  ↓ redirige a payUrl
[User paga en Nave]
[Webhook payment.succeeded]
  ↓ payment.status = succeeded
  ↓ insertar socio_pagos(periodo, payment_id)
  ↓ email confirmación
```

**Recargo por mora (10% flat)**:
- Hoy = día X del mes Y
- Si pagás cuota del mes Y entre día 1 y día 10: monto = `cuota_mensual`
- Si pagás del 11 en adelante: monto = `cuota_mensual * 1.10`
- Si pagás cuotas atrasadas (meses anteriores): cada una con recargo
  10% (ya están vencidas)

**Pago en local de cuota**:
- Admin abre `/admin/socios`, ya existe la grilla de pagos
- Al marcar pagado en efectivo/transferencia el día X:
  - Si está dentro del mes vigente y antes del día 10: monto base × 0.90
  - Si está vencida: (monto base + 10% mora) × 0.90
  - Crea `payment` con `provider='cash'` o `'transfer'`,
    `created_by=admin_id`, `discount_reason='pago_local_10'`

#### 4.1.3 Mensajes y recordatorios

- **Día 1 del mes**: email "Cuota de mayo disponible · $10.000 hasta el día 10".
- **Día 8**: si no pagó y no tiene sub activa → email recordatorio "Falta 2 días para que aplique el recargo".
- **Día 11**: si no pagó → email "Cuota vencida, ahora son $11.000".
- **Día 20**: último recordatorio.
- **Día 1 del mes siguiente**: si sigue sin pagar, queda "deudor 1 mes".

Cron diario en Vercel (`/api/cron/socios-reminders`) que corre estos
checks. Reusa la infra existente de Resend.

---

### 4.2 Inscripción a partida pública

3 casos:

| Caso | Estado inscripción | payment_status | Cargo |
| --- | --- | --- | --- |
| Socio al día, BYOP | confirmado | no_aplica | $0 |
| Socio al día, alquiler | confirmado | pendiente | precio_alquiler |
| Socio no al día / no socio, BYOP | confirmado | pendiente | entrada_byop |
| Socio no al día / no socio, alquiler | confirmado | pendiente | entrada_byop + alquiler |

Flujo:

```
[User en /partidas/[id]]
  ↓ click "Anotarme"
  ↓ elige BYOP o alquiler
[Server Action: anotarmeAction]
  ↓ crea inscripción (estado=confirmado, payment_status=pendiente o no_aplica)
  ↓ snapshot monto_total
[Si payment_status=pendiente]
  ↓ aparece banner naranja: "Reservaste tu lugar · Pagá $X"
  ↓ user puede:
      A) Pagar ahora online (descuento 0%)
      B) Pagar en local el día (descuento 10%)
      C) Dejar pendiente (el lugar queda igual confirmado)
```

**Flujo A: Pagar ahora**:
```
  ↓ click "Pagar ahora"
[Server Action: crearPagoInscripcion]
  ↓ Si tiene crédito vigente: descontar del crédito (puede cubrir total o parcial)
  ↓ Si queda saldo: payment(amount=saldo, provider=nave)
  ↓ Si crédito cubre todo: payment(amount=0 con discount=monto, provider=manual, status=succeeded)
[Webhook succeeded]
  ↓ inscripción.payment_status = 'pagado'
  ↓ email confirmación con QR/comprobante
```

**Flujo B: Pagar en local**:
- No se hace nada en sistema hasta el check-in.
- Admin en `/admin/partidas/[id]/checkin` marca pagado el día. El sistema:
  - calcula monto con 10% off
  - crea `payment(provider='cash'|'transfer', discount_reason='pago_local_10')`
  - inscripción.payment_status = 'cobrado_local'
  - actualiza el `checkin` existente

**Flujo C: Dejar pendiente y nunca pagar**:
- Si el user no se presenta y no pagó: en el check-in queda como ausente
  con `payment_status='pendiente'` para siempre. Histórico.
- Política: si pasa repetido, admin puede deshabilitar la cuenta
  (out of scope de este plan).

**Cancelación**:
```
[User click "Desanotarme" en /partidas/[id]]
  ↓ calcula horas hasta inicio de partida
  ↓ Si >= 24hs Y tiene payment.succeeded:
      ↓ refund total via Nave
      ↓ payment.status = refunded
      ↓ borrar inscripción
  ↓ Si < 24hs Y tiene payment.succeeded:
      ↓ crear credito(amount=monto, expires_at=+3meses, reason='cancelacion_tardia')
      ↓ payment.status queda succeeded (no se reembolsa)
      ↓ borrar inscripción
      ↓ email "Te queda crédito $X vigente hasta DD/MM"
  ↓ Si payment_status=pendiente:
      ↓ borrar inscripción directo (nada que devolver)
```

---

### 4.3 Alquiler de guests por el host

**Comportamiento del cupo**: el guest cuenta al cupo desde que el host lo
agrega. El payment queda pendiente, pero el lugar está reservado.

```
[Host inscripto en partida abre /partidas/[id]]
  ↓ "Tus alquileres" panel
  ↓ agrega "Juan García", "Pedro López"
[Server Action: agregarAlquilerAction]
  ↓ por cada guest: inscripción(es_alquiler_guest=true, estado=confirmado,
                                 agregado_por=host_id, payment_status=pendiente,
                                 lote_id=<nuevo o existente>)
  ↓ aparece en lista del host con badge "Pendiente de pago · $X"
```

**Pago en lote**:
```
[Host: "Pagar 2 entradas · $50.000"]
[Server Action: pagarLoteAlquilerAction]
  ↓ payment(amount=suma, purpose='alquiler_guests', linked_id=lote_id)
  ↓ user va a Nave, paga
[Webhook succeeded]
  ↓ payment.status=succeeded
  ↓ todas las inscripciones del lote.payment_status = 'pagado'
  ↓ email "Confirmamos 2 alquileres para la partida del 31/05"
```

**Pago en local**:
- Mismo que entrada: admin en check-in marca todos los guests del lote
  como cobrado_local en bloque, calcula 10% off.
- UI del checkin agrupa visualmente los guests bajo el host con un solo
  botón "Cobrar lote (2 guests) en efectivo · $45.000".

**Agregar más guests después**:
- Si el host agrega un guest nuevo después de pagar el lote anterior,
  ese guest nuevo va en otro `lote_id`. Cada lote es atómico.

**Quitar un guest no pagado**:
- Host puede quitar libremente mientras `payment_status=pendiente`.
- Se borra la inscripción. El cupo se libera al instante.

**Quitar un guest pagado**:
- Si está pagado online y faltan >=24h: refund total al host (como
  cualquier cancelación). El guest queda fuera, el host pierde el lugar.
- Si está pagado online y <24h: crédito al host.
- Si está pagado en local (cobrado_local): es plata cash que ya está
  en caja. Solo el admin puede revertir desde `/admin/partidas/[id]/checkin`.

---

### 4.4 Privadas

El flujo actual NO cambia para la fase de **solicitud → admin acepta**.
Cuando el admin acepta, se agrega un paso de **pago de seña** antes de
considerar la privada confirmada definitivamente.

```
[User en /privada/solicitar pide slot]
  ↓ flow actual: insert solicitudes_privada, abre WhatsApp
[Admin acepta vía /admin/solicitudes]
  ↓ flow actual: insert partidas, marca solicitud como aprobada
  ↓ NUEVO: calcula sena_monto = PRIVADA_SENA_POR_PERSONA × cupo_estimado
  ↓ NUEVO: solicitud.sena_status='pendiente', sena_vence_at=now()+7d
  ↓ NUEVO: email al user "Tu privada fue aprobada · Pagá la seña $60.000 antes del DD/MM para asegurar el slot"
[User clickea link del email o entra a /mis-solicitudes]
  ↓ ve "Privada aprobada · Pagá $60.000 de seña hasta DD/MM"
  ↓ click "Pagar seña"
[Server Action: pagarSenaAction]
  ↓ payment(purpose='privada_sena', amount=sena_monto, linked_id=solicitud_id)
  ↓ va a Nave, paga
[Webhook succeeded]
  ↓ solicitud.sena_status='pagada'
  ↓ partida.estado queda confirmada
  ↓ email "Seña pagada, te esperamos el DD/MM. Saldo $X se paga el día"
```

**Si no paga la seña en 7 días**:
- Cron diario revisa `sena_vence_at < now() AND sena_status='pendiente'`.
- Pone `solicitud.estado='cancelada_por_no_pago'`, libera el slot de
  privada, borra la partida creada en `partidas`.
- Email al user notificando.

**Saldo en local**:
- El día de la partida, admin en `/admin/partidas/[id]/checkin`:
  - Calcula `saldo = costo_total_estimado − sena_pagada`
  - Aplica 10% off sobre el saldo (NO sobre la seña porque ya está
    pagada online)
  - Crea `payment(provider='cash'|'transfer', purpose='privada_saldo',
    linked_id=partida_id, discount_reason='pago_local_10')`
  - `partida.saldo_pagado_at=now()`

**No reembolso de seña**:
- Si la privada se cancela: seña perdida.
- Si admin la reprograma (caso fuerza mayor): la seña se mantiene
  vigente para la nueva fecha. Admin lo hace manualmente desde el panel.

---

### 4.5 Recargas en partida

Las recargas (tracer 100, conv 200, conv 400) hoy se cargan en el check-in.
Siguen igual:
- Admin agrega cantidad de cada recarga durante el check-in
- El monto se suma al total a cobrar
- Aplica 10% off (es pago en local siempre)

No requiere nuevo flujo de pago online — las recargas son siempre cash
en el momento porque dependen de qué consume el jugador.

---

### 4.6 Pago en local con 10% off

Regla universal: **cualquier pago hecho cash o transferencia en el local
aplica 10% de descuento sobre el monto base**.

Aplica a:
- Cuota socio
- Entrada de partida pública
- Alquiler de guests
- Saldo de privada
- Recargas

NO aplica a:
- Seña de privada (se paga online o no se confirma la reserva)
- Pago de cuota recurrente con tarjeta (es online por definición)
- Refunds (no son pagos)

**Cálculo**: `amount_net = amount_gross × 0.90`. Se guarda
`amount_discount = amount_gross × 0.10` y `discount_reason='pago_local_10'`
para auditoría.

---

## 5. State machines

### 5.1 `payments.status`

```
                 ┌───────────────────┐
                 │     pending       │ ← creado, esperando pago
                 └─────────┬─────────┘
                           │
              ┌────────────┴────────────┐
              ↓                         ↓
       ┌────────────┐            ┌────────────┐
       │ processing │            │  expired   │  (TTL del link)
       └─────┬──────┘            └────────────┘
             │
   ┌─────────┴─────────┐
   ↓                   ↓
┌──────────┐    ┌──────────┐
│succeeded │    │  failed  │
└────┬─────┘    └──────────┘
     │
     │ admin/user dispara refund
     ↓
┌────────────────────────┐
│ refunded / partially   │
│      refunded          │
└────────────────────────┘
```

### 5.2 `subscriptions.status`

```
pending_setup → active ←→ paused
                  ↓ ↑          ↓
                past_due       canceled
                  ↓
                canceled
```

### 5.3 `inscripciones.payment_status`

```
no_aplica   (socio al día, no debe nada)

pendiente ────→ pagado          (vía Nave)
    │
    └────────→ cobrado_local   (admin marca en checkin)
```

### 5.4 `solicitudes_privada` (combinando estado existente + nuevo sena_status)

```
[solicitud creada] estado=pendiente, sena_status=no_aplica
        ↓ admin rechaza
[estado=rechazada]
        ↓ admin acepta
[estado=aprobada, sena_status=pendiente, sena_vence_at=+7d]
        ↓ user paga seña
[sena_status=pagada]
        ↓ día partida, admin cobra saldo
[partida.saldo_pagado_at=now]

Path alternativo de no-pago:
[aprobada, sena_status=pendiente] → 7d sin pago → [estado=cancelada_por_no_pago]
```

---

## 6. Webhooks e idempotencia

### 6.1 Endpoint

`/api/webhooks/nave` — POST

- Valida HMAC signature con `NAVE_WEBHOOK_SECRET`.
- Si falla validación: 401, no procesa.
- Parsea evento, ve si ya lo procesamos antes (`provider_payment_id` +
  `event_type` como key idempotente).
- Si ya procesado: 200, no hace nada.
- Si nuevo: ejecuta lógica de update (cambiar status, insertar
  socio_pagos, etc.) en transacción.
- Devuelve 200 siempre que la firma sea válida (incluso si el evento es
  desconocido — no queremos que Nave reintente para siempre).

### 6.2 Idempotencia de creación

Cuando el user clickea "Pagar":
1. Genera `idempotency_key = hash(user_id + purpose + linked_id + timeBucket(60s))`
2. `INSERT INTO payments (..., idempotency_key) ON CONFLICT DO NOTHING`
3. Si conflict: select el existente y devolver su `pay_url`.

Esto cubre: doble-click, network retry, back/forward del browser.

### 6.3 Reconciliación

Cron horario `/api/cron/reconcile-payments`:
- Lista todos los `payments` con `status in ('pending', 'processing')`
  más viejos de 1 hora.
- Por cada uno, llama `nave.getPayment(providerPaymentId)`.
- Si el provider dice succeeded/failed pero nuestro DB sigue pending →
  significa que perdimos el webhook. Aplica la lógica como si fuera
  webhook nuevo.

Esto nos salva si Nave caen webhooks o si tenemos downtime.

---

## 7. Comprobantes por mail

Una plantilla nueva en `lib/emails/`:
- `recibo-pago.tsx` — para cualquier `payment.status='succeeded'`

Contenido:
- Logo + branding
- Concepto (description del payment)
- Detalle: monto bruto, descuento si aplica, monto neto
- Método: tarjeta últimos 4 / efectivo / transferencia
- Fecha
- ID del pago (referencia interna)
- Footer estándar con WhatsApp del dueño (no soporte)

Trigger: en `/api/webhooks/nave` cuando un payment pasa a succeeded.
Para pagos manuales (admin marca cash en check-in), trigger desde la
action que crea el payment.

---

## 8. UI / pantallas nuevas o cambios

### 8.1 `/perfil` → sección "Cuota"

- Si tiene sub activa:
  - "Cuota automática · próximo cargo el DD/MM por $X"
  - Botones: "Pausar" / "Cancelar adhesión"
- Si no tiene sub y debe cuota:
  - Banner naranja con monto + botón "Pagar" o "Adherir cuota automática"
- Histórico de pagos (ya existe `socio_pagos` displayed)

### 8.2 `/perfil` → sección "Crédito a favor"

- Si tiene `creditos` no consumidos:
  - "Saldo a favor: $X · vence el DD/MM"
  - Se aplica automático en próxima inscripción

### 8.3 `/partidas/[id]` → bloque de pago

Después del botón "Anotarme":
- Si payment_status=pendiente:
  - Card naranja "Lugar reservado · Pagá $X para confirmar online o pagás $X×0.9 el día"
  - Botón "Pagar ahora ($X)"

### 8.4 `/mis-solicitudes` → bloque seña

- Para solicitudes con `sena_status='pendiente'`:
  - Banner "Pagá $X de seña antes del DD/MM" + botón "Pagar"

### 8.5 `/admin/partidas/[id]/checkin` — extender

- Por cada inscripción mostrar `payment_status` (badge)
- Si pendiente: botones "Cobrar en efectivo (10% off)" / "Cobrar transferencia (10% off)" / "Marcar pagado online"
- Para lotes de alquiler: botón único "Cobrar lote (N guests)"

### 8.6 `/admin/pagos` — pantalla nueva

- Listado de todos los `payments` (filtros por status, fecha, user, purpose)
- Botón refund por payment exitoso
- Export CSV

### 8.7 `/pagos/return` — landing post-pago

- Página a la que Nave devuelve al user tras pagar
- Lee query `?payment_id=X`
- Muestra spinner "Confirmando pago..."
- Polleea `GET /api/payments/:id` cada 2s hasta status final
- Cuando succeeded: "✓ Pagado" + link a partida / dashboard
- Cuando failed: explicación + botón reintentar

---

## 9. Edge cases / invariantes

1. **Doble cobro**: idempotency_key garantiza que no se crean dos
   payments para la misma intención dentro de 60s.

2. **Refund de payment ya refunded**: action chequea status antes.
   Si ya refunded → error friendly "Este pago ya fue devuelto".

3. **Crédito que expira durante el flujo de pago**: snapshot del crédito
   se hace al crear el payment. Si el user tarda 1h en pagar y el crédito
   expiró en el medio, igual se aplica (ya estaba "reservado").

4. **Subscription se cobra mientras el user está cancelando**: si llega
   el webhook `subscription.charged` después de un `cancelSubscription`
   pero antes del confirm del provider: aceptamos el pago, lo asociamos
   al período, y la sub queda cancelada igual (no se cobra el próximo).

5. **Guest pagado, host cancela toda su inscripción**: 
   - Si pagó online y >=24h antes: refund al host de todos los guests.
   - Si pagó online y <24h: crédito al host por el total.
   - Cuestión: ¿el guest sigue inscripto si el host cancela? Probable que
     NO — si el host se va, los guests se van con él. Las inscripciones
     se borran. **Pendiente confirmar con dueño.**

6. **Cuota pagada via sub y manual el mismo mes**: race condition entre
   webhook de Nave (sub cobra el día 1) y user que paga manual el día 1.
   Solución: `socio_pagos.periodo` tiene unique constraint en
   `(user_id, periodo)`. Si llega el segundo intento: error de DB. La
   primera ganancia. Refund del cobro perdedor automático.

7. **Partida cancelada por admin con users que ya pagaron**: refund
   automático a todos. Job en background, notifica por mail.

8. **Cambio de cuota mensual mientras hay sub activa**: el monto está
   "locked" en `subscriptions.amount` al adherir. Si el admin sube el
   precio en `precios_config`, los socios con sub vieja siguen pagando
   el monto viejo hasta que cancelen y vuelvan a adherir. **Pendiente
   confirmar política.**

9. **Crédito mayor que el monto a pagar**: se consume solo el monto
   necesario. El resto queda como `creditos` con `amount` reducido
   (split row). O alternativa: usar el crédito completo y el resto
   queda como crédito nuevo. **Decisión simple**: split.

10. **Pago en local sin haber pagado online**: el admin marca pagado
    en check-in con descuento. Si el user no estaba en `payment_status=
    pendiente` (porque era socio al día sin alquiler), no se crea
    payment porque no debe nada. Solo se registra `checkin` como
    `socio_presente`.

---

## 10. Plan de implementación por fases

Para que no sea big-bang. Cada fase es un PR/commit grupo.

### Fase A — Infraestructura (sin tocar UX)

1. Migración SQL: tablas `payments`, `subscriptions`, `creditos`,
   `refunds`, `pagos_config`. Columnas nuevas en `socio_pagos`,
   `inscripciones`, `solicitudes_privada`, `partidas`.
2. `lib/payments/types.ts` con la interface `PaymentProvider`.
3. `lib/payments/manual.ts` (stub para usar mientras no integramos Nave).
4. `lib/payments/nave.ts` esqueleto (todas las methods throw "not
   implemented") + investigación de docs de Nave.
5. Endpoint `/api/webhooks/nave` con validación de firma + stub.
6. Cron `/api/cron/reconcile-payments` con stub.
7. Plantilla `recibo-pago.tsx` (sin trigger aún).

**Resultado**: nada cambia para el user. Backend listo para empezar
a meter providers.

### Fase B — Integración real con Nave (single endpoint)

8. Implementar Nave provider para `createPayment` único (sin
   suscripciones).
9. Test end-to-end con un pago de $1 en sandbox.
10. Conectar webhook real.
11. Trigger del email de recibo.

**Resultado**: podemos cobrar pagos únicos via Nave (técnico, sin UI).

### Fase C — Inscripciones públicas (BYOP no-socio)

12. UI: banner "Pagá $X para confirmar online" en `/partidas/[id]`.
13. Server Action `crearPagoInscripcion`.
14. Manejo de crédito a favor (si hay).
15. Update check-in admin con badges + botones de cobro local.
16. Política de cancelación con refund/crédito.

**Resultado**: el flujo más simple end-to-end andando. Probamos con users
reales.

### Fase D — Alquileres de guests

17. Lote de inscripciones (`lote_id`).
18. UI "Pagar 3 entradas" en `/partidas/[id]`.
19. Confirmar lote desde check-in admin.

### Fase E — Cuota socio manual

20. UI en `/perfil` y dashboard "Pagar cuota de mayo $X".
21. Cálculo de recargo por mora.
22. Adapter de `socio_pagos` para que se cree desde payment succeeded.
23. Cron de recordatorios.

### Fase F — Cuota socio recurrente

24. Adhesión de tarjeta vía Nave Preapproval (o equivalente).
25. Webhook `subscription.charged`.
26. UI pausar / cancelar.
27. Reintentos automáticos de cobro fallido.

### Fase G — Privadas

28. Cálculo de seña al aprobar.
29. Email + landing de pago de seña.
30. Cron de vencimiento de seña.
31. Cobro de saldo en check-in.

### Fase H — Admin / observabilidad

32. `/admin/pagos` con listado + filtros + refund.
33. Export CSV.
34. Métricas básicas (ingresos por mes, breakdown por purpose).

---

## 11. Pendientes a confirmar con el dueño

Antes de empezar la fase A, dejo estos puntos abiertos para confirmar:

1. **Edge case §9.5**: Si el host cancela su inscripción, ¿los guests
   que él agregó se cancelan automáticamente o quedan inscriptos
   "huérfanos"? Default propuesto: se cancelan con él (los guests
   "vienen con" el host).

2. **Edge case §9.8**: Si subimos el precio de la cuota socio,
   ¿los que ya tienen sub activa siguen pagando el viejo precio?
   Default propuesto: sí, el monto está locked. Para subirles, hay que
   notificarles y pedirles que re-adhieran.

3. **Monto exacto de la seña por persona**: el default es $5.000.
   ¿Confirmás o cambiás?

4. **Día de vencimiento de cuota**: default día 10. ¿Confirmás?

5. **¿La cuota socio aplica también 10% off pagando en local?**
   Asumido: sí. (Es coherente con la regla "cualquier pago local
   tiene 10% off".)

6. **Notificaciones de pago al admin**: ¿querés que cada pago exitoso
   te llegue por email? ¿Solo los grandes (>$X)? ¿Solo refunds?

7. **Modo "ver toda la plata pendiente"**: ¿querés un dashboard en
   `/admin` con "te deben $X" agregado de todos los `payment_status=
   pendiente`? Default: sí, parte de Fase H.

8. **Manejo de invitados sin cuenta cuando ya pagaron**: si llega el
   día y el guest no tiene cuenta (vino con el host), ¿se le hace
   check-in bajo el nombre del host? Default: sí, el check-in es por
   inscripción no por user.

9. **Subscripción adherida con tarjeta de débito vs crédito**: Nave
   probablemente soporte ambas. ¿Querés permitir las dos o solo
   crédito? Default: ambas, mejor cobertura.

10. **Si Nave rechaza la suscripción 3 veces**: ¿el user pierde el
    status de socio inmediatamente o le damos un mes de gracia?
    Default: 1 mes de gracia con email "tu cuota lleva X días vencida,
    pagá manual o vas a perder el beneficio".

---

## 12. Riesgos / atención

- **Nave es menos popular que Mercado Pago**: si la documentación o el
  SDK son flojos, el provider abstraction nos da la opción de migrar a
  MP sin romper nada del resto del sistema.
- **AFIP en v2**: cuando se agregue, las facturas se generan desde
  `payments` ya finalizados. No hay que cambiar el flujo, solo agregar
  un nuevo trigger.
- **Webhooks perdidos**: la reconciliación horaria es el backup. Si
  Nave nunca manda webhooks, la app sigue funcionando con polling.
- **Idempotencia es crítica**: cualquier bug acá puede generar doble
  cobro. Tests específicos en Fase A.
- **Crédito vs refund decisión**: separar bien la lógica para que no se
  confundan. Refund toca dinero real (Nave revierte), crédito toca
  solo nuestra DB.
