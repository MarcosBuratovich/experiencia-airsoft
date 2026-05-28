# Flujos de pago de la plataforma — para revisión del dueño

Este documento describe **exactamente** cómo va a funcionar la plata en
la app, en español llano, para que puedas leerlo y corregir lo que
necesites antes de que toquemos código.

Si algo de acá no te cierra, decímelo y lo cambiamos. Nada está
implementado todavía.

---

## Resumen en una pantalla

La app va a manejar 5 cosas distintas:

1. **Cuota mensual de los socios**
2. **Entrada a una partida pública** (cuando no la cubre el beneficio de socio)
3. **Alquileres** (invitados que un jugador agrega bajo su nombre)
4. **Reserva de partidas privadas** (seña + saldo)
5. **Recargas durante la partida** (tracer/conv, siempre en local)

Cuatro reglas que aplican a casi todo:

| Regla | Valor (editable después) |
| --- | --- |
| Descuento por pagar en local (cash o transferencia) | **10% off** |
| Día de vencimiento de la cuota | **8 de cada mes** |
| Recargo si pagás la cuota tarde | **+10% fijo** |
| Seña de partida privada | **$5.000 por persona** |

---

## 1. Cuota mensual de socios

### A. El socio adhiere tarjeta (automático)

El socio entra a su perfil, toca "Adherir cuota automática", carga la
tarjeta una vez. **Desde ese mes y todos los meses**, el sistema le
debita la cuota el día 1 (o el día que él elija).

- Si el cobro sale bien → email "Cuota cobrada $X" + queda registrado.
- Si la tarjeta falla → el sistema reintenta automático a los 3 días y
  a los 7 días. Si falla las 3 veces, se cancela la adhesión y le
  llega un mail para que pague manual o vuelva a adherir.
- El socio puede **pausar** (no se cobra el próximo mes pero la tarjeta
  queda guardada) o **cancelar** (se borra la adhesión) desde su perfil.

**Importante:** el monto se "congela" cuando adhiere. Si el mes
siguiente subís el precio de la cuota, los que ya están adheridos
**siguen pagando el precio viejo**. Para subirles tenés que pedirles
que se den de baja y vuelvan a adherir.

### B. El socio paga manualmente cada mes

Si no adhiere, el sistema le muestra un banner en su dashboard cada vez
que entra: "Tu cuota de mayo está pendiente · $10.000". Le da botón de
pagar.

- Entre día 1 y 8: paga el precio normal.
- A partir del día 9: **paga +10% de recargo**. Por ejemplo $11.000 en
  vez de $10.000.
- Si paga meses anteriores ya vencidos, cada mes lleva su +10%.

Le mandamos mails de recordatorio:
- Día 1 — "Cuota disponible".
- Día 6 — "Te faltan 2 días para que aplique el recargo".
- Día 9 — "Cuota vencida, ahora son $11.000".
- Día 20 — Último recordatorio.

### C. El socio paga la cuota en el local

Vos en tu panel `/admin/socios` marcás el pago (efectivo o transferencia).
El sistema aplica automático el **10% de descuento** (regla general de
pago en local). Si la cuota estaba vencida, el cálculo es:
`(precio + 10% recargo) × 0.90`.

### D. Si el socio no paga

- 1 mes vencido → sigue siendo socio pero con deuda visible.
- 2+ meses vencidos → en una próxima fase decidimos: ¿le sacamos el
  beneficio? ¿le bloqueamos reservas? Por ahora solo queda registrado
  en `/admin/socios` con badge "moroso".

> **A confirmar**: en cuántos meses de mora le sacamos el status de
> socio. Default propuesto: a los 2 meses pierde beneficio (paga
> entradas como no-socio) pero no se borra de la lista.

---

## 2. Entrada a partida pública

Cuando alguien se anota a una partida del calendario, el sistema chequea:

| Quién | Modalidad | Qué se cobra |
| --- | --- | --- |
| Socio al día | BYOP (trae su equipo) | **Gratis** |
| Socio al día | Alquiler | Solo el alquiler ($X) |
| Socio con cuota vencida | BYOP | Precio entrada BYOP |
| Socio con cuota vencida | Alquiler | Entrada BYOP + alquiler |
| No socio | BYOP | Precio entrada BYOP |
| No socio | Alquiler | Entrada BYOP + alquiler |

**Cuando hay que pagar**, al jugador le aparece un banner naranja:

> Reservaste tu lugar para la partida del 31/05 · Pagá $X para confirmar
> online, o pagás $X menos 10% el día en el local.

El jugador puede:

- **Pagar online ahora**: paga el precio completo. Confirmado.
- **Pagar el día en local**: aplica 10% off. No paga nada hasta llegar.

> Importante: **el lugar queda reservado igual aunque no pague**. La
> diferencia es solo cuándo y cómo paga. Si no paga ni online ni el día
> (no se presenta), queda registrado como ausente sin pagar.

### Si se cancela

- **24h+ antes de la partida**: si ya pagó online, **refund total** a
  su tarjeta. Si no había pagado, simplemente se borra.
- **Menos de 24h antes**: si ya pagó online, queda como **crédito a
  favor** por 3 meses. La próxima vez que reserve algo, se descuenta
  automático. (Si no había pagado, no hay nada que devolver.)

---

## 3. Alquileres (invitados de un host)

Hoy ya existe la función: un jugador inscripto puede agregar amigos
("alquileres") bajo su nombre. Cada uno ocupa lugar en el cupo y se
cobra como alquiler.

**Cambio nuevo**: el host elige cómo paga sus guests:

- **Pagar online ahora todos juntos**: un solo cargo por la suma de
  todos. Si tiene 3 guests a $X cada uno, paga 3×X en un solo pago a
  Nave.
- **Pagar todo en el local el día**: aplica 10% off al total.

### Cómo se comporta el cupo

> El lugar de cada guest queda **bloqueado desde que el host lo agrega**,
> aunque no haya pagado. El cupo no se libera "esperando pago" —
> está reservado.

Esto significa:
- Si el host elige pagar en local, puede tener 5 amigos anotados toda
  la semana sin pagar nada. El cupo de la partida ya cuenta con ellos.
- El host puede **quitar guests** en cualquier momento (mientras no haya
  pagado). Si los pagó y los quita, aplica la política de cancelación
  (24h+ refund / -24h crédito).

### Si el host se va pero los guests quieren venir

**Los guests quedan inscriptos** aunque el host cancele. La inscripción
del host es independiente de las inscripciones de sus guests.

> Esto es nuevo y diferente al comportamiento intuitivo. La razón: si
> 5 amigos confirmaron, no queremos que el host arrastre a todos con
> él si decide no venir.

---

## 4. Partidas privadas

El flujo actual (pedir slot → admin acepta → se abre WhatsApp) **se
mantiene**. Lo nuevo es que después de aceptar, **el sistema le pide
una seña al organizador**.

### Paso a paso

1. **Usuario pide un slot** en el calendario de privadas (10+ personas).
2. **Sistema le abre WhatsApp** con el mensaje pre-armado para que
   coordinen con vos.
3. **Vos aceptás la solicitud** desde `/admin/solicitudes` como hoy.
4. **Nuevo paso**: el sistema le manda email al organizador:
   > "Tu privada del 31/05 fue aprobada · Pagá la seña de $60.000 antes
   > del 07/06 para asegurar el slot."
   El monto es `5.000 × cantidad estimada` (12 personas → $60.000).
5. **Organizador paga la seña** online. Si la paga, el slot queda
   blindado.
6. **Si no paga la seña en 7 días**: el slot se libera automático y la
   partida queda cancelada. Le llega un email avisando.
7. **El día de la partida**: vos cobrás el saldo (precio total estimado
   − seña) en efectivo o transferencia. **Aplica 10% off** al saldo
   (no a la seña, esa ya está pagada online).

### Si se cancela una privada con seña pagada

- **La seña no se devuelve.** Es la política estándar de eventos.
- **Si vos decidís reprogramar** (caso fuerza mayor o se les chocó la
  agenda), podés mantenerle la seña como crédito para la nueva fecha,
  manualmente desde el panel.

---

## 5. Recargas durante la partida

Esto no cambia respecto a hoy:
- En el check-in se le agregan recargas (tracer 100, conv 200, conv 400)
  según lo que pidan.
- Se cobran en efectivo en el momento.
- Aplica el **10% off** automático (es pago en local).

---

## Resumen — quién paga qué, dónde, con cuánto descuento

| Concepto | Online (Nave) | En local (cash/transfer) | Descuento local |
| --- | --- | --- | --- |
| Cuota socio | Sí (manual o automático) | Sí (vos lo marcás) | 10% |
| Entrada partida pública | Sí | Sí (el día) | 10% |
| Alquileres de guests | Sí (todos juntos) | Sí (el día) | 10% |
| Seña privada | **Solo online** | No | No aplica |
| Saldo privada (el día) | No | Sí | 10% |
| Recargas en partida | No | Sí (el día) | 10% |

---

## Refunds y créditos

| Caso | Qué hace el sistema |
| --- | --- |
| Cuota socio cancelada | Mes en curso no se devuelve. Próximo mes no se cobra. |
| Inscripción cancelada 24h+ antes | Refund 100% a la tarjeta |
| Inscripción cancelada -24h | Crédito a favor del usuario, vigencia 3 meses |
| Seña privada cancelada | No se devuelve. Reprogramación queda a tu criterio |
| Crédito acumulado | Se descuenta automático en la próxima inscripción online |

---

## Lo que vos como dueño ves en el panel

(Funcionalidades nuevas — algunas ya existen, otras se agregan.)

### `/admin/socios` (ya existe, se extiende)
- Quién pagó la cuota del mes y quién no.
- Quién tiene adhesión automática vs paga manual.
- Botón para marcar pago manual en local (aplica 10% off automático).

### `/admin/partidas/[id]/checkin` (ya existe, se extiende)
- Por cada inscripto, badge de estado de pago (pagado online / pendiente
  / pagado en local).
- Para alquileres en lote: un solo botón "Cobrar 3 guests · $X (con
  10% off)".

### `/admin/pagos` (nuevo)
- Lista de todos los pagos hechos, con filtros por fecha, usuario, tipo.
- Botón refund por pago.
- Export CSV para tu contador.

### `/admin/solicitudes` (ya existe, se extiende)
- Para privadas aprobadas: estado de seña (pendiente / pagada / vencida).

---

## Comprobantes

Cada vez que un pago se confirma (online o local), el sistema le manda
al usuario un email tipo recibo:
- Concepto (qué pagó)
- Monto, descuento aplicado, monto final
- Método (tarjeta últimos 4 / efectivo / transferencia)
- Fecha
- Número de referencia

> **No** generamos factura electrónica AFIP automática. Por ahora es un
> recibo simple por email. Si alguien pide factura formal, se la
> generás aparte. AFIP queda para una segunda fase.

---

## Cosas que necesito que revises y corrijas

Lee la lista y respondeme con cambios:

1. ¿Está OK que un socio con 1 mes de cuota vencida siga reservando
   normal (pero aparezca como "deudor 1 mes") y a los 2 meses pierda
   beneficio? ¿O ya al 1er mes vencido le sacás el beneficio?

2. Si un jugador no se presenta a una partida que pagó online (no-show):
   - ¿Pierde la plata sin más?
   - ¿O le damos crédito a favor igual?

3. El descuento del 10% por pago en local, ¿también aplica a la **cuota
   de socio**? Lo asumí que sí (misma regla universal).

4. Cuando el host **cancela toda su inscripción** y los guests quedan
   anotados sin él, ¿quién los recibe el día? ¿Vos los anotás bajo
   un "host por defecto" o quedan como pertenencia "huérfana"?
   Sugerencia técnica: quedan visibles en la lista igual, con tag
   "ex-guest de Juan Pérez", y se cobran como inscriptos normales.

5. ¿Querés que cada pago exitoso te llegue por mail? ¿Solo los grandes
   (>$X)? ¿Solo los refunds?

6. **Tarjeta para suscripciones**: cuando Nave nos confirme si soporta
   débito + crédito o solo crédito, decidimos. Si solo crédito, vamos
   con eso (la mayoría de la gente tiene). ¿OK?

7. **Si Nave no tiene suscripciones**, el "modo automático" queda
   inhabilitado en v1 y todos pagan manual con recordatorios. ¿OK
   arrancar así si pasa eso?

---

## Próximos pasos

1. Vos revisás este doc y me decís cambios.
2. Contactás a Nave (comercial/soporte) con la lista de preguntas que
   te paso aparte para conseguir credenciales de sandbox y entender qué
   soporta exactamente.
3. Empezamos a implementar de cero, en fases. La primera fase no toca
   el front del jugador — solo agrega la infraestructura (tablas
   nuevas, código stub). Después conectamos un flujo a la vez y lo
   probamos.

> Documento gemelo técnico: `PAGOS_PLAN.md` (con esquema de tablas,
> endpoints, edge cases). Es para devs, no hace falta que lo leas.
