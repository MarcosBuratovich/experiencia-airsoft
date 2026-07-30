# Crear la app de Meta para el asistente de mensajes

Paso a paso con los valores exactos de cada campo. Está pensado para tenerlo
al lado mientras se completa el panel de Meta.

> **Sobre los nombres de menú:** Meta reorganiza su panel seguido. Los nombres
> que están acá son los del momento de escribir esto; si algo no coincide,
> buscá la opción equivalente por lo que hace, no por cómo se llama. Cuando
> haya duda, mandá captura.

---

## Los valores que vas a necesitar, juntos

Copiá esto en un lugar a mano antes de empezar:

| Campo | Valor |
|---|---|
| URL de política de privacidad | `https://www.experienciaairsoft.com/privacidad` |
| URL de eliminación de datos | `https://www.experienciaairsoft.com/borrar-datos` |
| URL de devolución de llamada (webhook) | `https://app.experienciaairsoft.com/api/meta/webhook` |
| Token de verificación | El que generes con `openssl rand -hex 32` |
| Dominios de la app | `experienciaairsoft.com` · `app.experienciaairsoft.com` |
| Correo de contacto | El del negocio, que alguien lea |

Dos valores viajan de Meta hacia nosotros y van a **Vercel**, nunca a un chat
ni a un archivo del repo:

- **`META_APP_SECRET`** — la clave secreta de la app.
- **`META_WEBHOOK_VERIFY_TOKEN`** — el token que inventás vos; el mismo string
  va en Vercel y en el panel de Meta.

---

## Fase 1 · Cuenta de negocio (esto tarda, arrancalo primero)

Todo en `business.facebook.com`, con la cuenta del cliente.

1. **Instagram en cuenta profesional.** Si es personal, no hay API.
   Instagram → Configuración → Tipo de cuenta → Cuenta de empresa.

2. **Página de Facebook vinculada al Instagram.** Desde la configuración de
   Instagram o desde la página. Hace falta para que la API de mensajería
   funcione con Messenger y comentarios.

3. **Los tres activos bajo la misma cuenta de negocio:** la página, el
   Instagram y el píxel. En Configuración del negocio → Cuentas.

4. **Verificación del negocio.** Configuración del negocio → Centro de
   seguridad → Verificación del negocio. Pide documentación real: CUIT,
   constancia de inscripción en AFIP, y un comprobante con el nombre y
   domicilio del negocio (factura de servicio, extracto bancario).

   **Es lo que más tarda y bloquea el App Review.** Empezalo el primer día.

5. **Que te agreguen como administrador** de la cuenta de negocio, o al menos
   de la página y el Instagram.

---

## Fase 2 · Crear la app

En `developers.facebook.com` → Mis apps → Crear app.

| Campo | Qué poner |
|---|---|
| Caso de uso | El de mensajería / atención al cliente. Si ofrece "Otro", elegilo y después agregás los productos a mano. |
| Tipo de app | **Empresa** |
| Nombre de la app | `Experiencia Airsoft — Asistente` |
| Correo de contacto | El del negocio |
| Cuenta de negocio | La del cliente, la de la fase 1 |

El nombre es visible para el usuario en algunos flujos, así que conviene que
diga el negocio y no algo interno.

---

## Fase 3 · Configuración básica

Configuración → Básica. Acá van casi todas las URL.

| Campo | Valor |
|---|---|
| Nombre para mostrar | `Experiencia Airsoft` |
| Correo de contacto | El del negocio |
| **URL de la política de privacidad** | `https://www.experienciaairsoft.com/privacidad` |
| **URL de eliminación de datos** | `https://www.experienciaairsoft.com/borrar-datos` |
| URL de las condiciones del servicio | *(ver nota abajo)* |
| Icono de la app | PNG de 1024×1024, el logo del negocio |
| Categoría | Empresas y páginas / Deportes |
| Dominios de la app | `experienciaairsoft.com` y `app.experienciaairsoft.com` |

**Sobre la eliminación de datos:** Meta ofrece dos opciones, una URL de
*instrucciones* y una de *devolución de llamada*. Elegí **instrucciones** y pegá
la URL de arriba. La página ya está escrita para cumplir ese requisito.

**Sobre las condiciones del servicio:** hoy el sitio no tiene una página de
términos. Meta a veces la pide en el App Review. Si la piden, hay que
escribirla — es un trabajo aparte, corto.

**La clave secreta de la app** está en esta misma pantalla, detrás de
"Mostrar". Ese valor va a Vercel como `META_APP_SECRET`. No lo pegues en un
chat ni en un archivo del repo.

---

## Fase 4 · Agregar los productos

En el panel de la app, sección Productos:

- **Messenger** — para los mensajes de la página de Facebook.
- **Instagram** — para los DM y comentarios de Instagram.

En cada uno hay que vincular la página y la cuenta de Instagram del cliente.

---

## Fase 5 · Configurar el webhook

Esta parte **ya se puede hacer**: el endpoint existe y responde el handshake.

### Antes de tocar el panel

Poné las dos variables en **Vercel** (Production y Preview) y redeployá —
Vercel congela las variables en el build, así que sin redeploy no toman
efecto:

```
META_WEBHOOK_VERIFY_TOKEN = <el token que generaste>
META_APP_SECRET           = <la clave secreta de la app>
```

Generá el token con:

```bash
openssl rand -hex 32
```

### En el panel

Messenger → Configuración → Webhooks, y lo mismo en Instagram.

| Campo | Valor |
|---|---|
| URL de devolución de llamada | `https://app.experienciaairsoft.com/api/meta/webhook` |
| Token de verificación | El mismo string que pusiste en Vercel |

Al tocar "Verificar y guardar", Meta pega un GET a esa URL con el token. Si
coincide, queda configurado.

**Si falla:** casi siempre es que el token no coincide exactamente, o que no
redeployaste Vercel después de agregar la variable.

### Campos a suscribir

Del objeto de **página**: `messages`, `messaging_postbacks`, y `feed` si
querés que el bot vea los comentarios de Facebook.

Del objeto de **Instagram**: `messages`, `messaging_postbacks`, `comments`.

Si el panel ofrece más campos, no los suscribas: cada uno es tráfico que
llega al endpoint y hay que descartar.

---

## Fase 6 · Permisos y App Review

Los permisos de mensajería son de acceso avanzado: no se activan solos.

### Qué pedir

- `instagram_basic`
- `instagram_manage_messages`
- `pages_show_list`
- `pages_manage_metadata`
- `pages_messaging`

### Qué escribir en cada justificación

Meta rechaza las justificaciones genéricas. Lo que funciona es decir
exactamente qué hace la app con ese permiso. Un texto base, para adaptar:

> Experiencia Airsoft es un centro de airsoft en Buenos Aires. Recibimos
> consultas por Instagram y Messenger sobre precios, horarios, edad mínima y
> qué llevar. La app responde automáticamente esas preguntas frecuentes con
> información de nuestro propio sistema de reservas, y deriva a una persona
> del equipo cuando la consulta es comercial o cuando no tiene la respuesta.
>
> `instagram_manage_messages` / `pages_messaging` se usan para leer el mensaje
> entrante y enviar la respuesta en esa misma conversación. No enviamos
> mensajes no solicitados ni promociones.

Ajustá el último párrafo según el permiso que estés justificando.

### El video

Piden un screencast mostrando el flujo completo. Tiene que verse:

1. Alguien escribiéndole un mensaje a la cuenta de Instagram del negocio.
2. La respuesta automática llegando.
3. El panel de administración donde se ve la conversación y el interruptor
   para tomarla a mano.

Grabalo con una cuenta de prueba y dejá las credenciales en las instrucciones
para el revisor, con el paso a paso para reproducirlo.

### Lo que hace que rechacen

- Justificaciones genéricas del estilo "para mejorar la atención al cliente".
- Video que no muestra el permiso en uso.
- Instrucciones que el revisor no puede reproducir.
- Verificación del negocio incompleta.

Contá con una segunda vuelta. Es normal.

---

## Fase 7 · Pasar a producción

Cuando aprueben los permisos, el interruptor de la app pasa de Desarrollo a
**En vivo**. Recién ahí el bot puede hablar con gente que no tenga un rol
asignado en la app.

**Antes de encenderlo, del lado nuestro:** `bot_config.encendido` sigue en
`false`. El bot no contesta a nadie hasta que se cambie a mano, incluso con
todo Meta aprobado.

---

## Qué se puede probar antes de la aprobación

Mientras la app esté en Desarrollo, el webhook solo recibe eventos de gente
con un rol en la app. Sirve igual: agregate a vos y al cliente como
desarrolladores o testers, escribile a la cuenta desde sus Instagram, y así
se ve el flujo real con poco tráfico.

Es también la forma de grabar el video del App Review.

---

## Orden recomendado

1. Verificación del negocio (día 1, tarda semanas)
2. Cuenta profesional, página vinculada, activos en el negocio
3. Crear la app y completar la configuración básica
4. Variables en Vercel + redeploy
5. Configurar el webhook y verificar que valide
6. Agregarse como testers y probar el flujo
7. Grabar el video
8. Enviar el App Review
9. Pasar a En vivo
10. Prender el bot desde el panel
