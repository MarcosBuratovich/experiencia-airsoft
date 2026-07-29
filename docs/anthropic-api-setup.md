# Cuenta de API de Anthropic para el asistente de mensajes

Cómo queda armada la facturación del bot y cómo se migra después a la cuenta del
cliente. La parte de Consola la hace una persona a mano: no hay forma de
automatizarla sin una Admin API key, que también se crea a mano.

## Lo primero, porque se confunde siempre

Una **suscripción de Claude** (Pro, Max, Team) es acceso a la app de Claude para
que la use una persona. **No incluye acceso a la API ni a la Consola**, y no
genera una key que un servidor pueda usar. El bot corriendo en producción se
factura aparte, por token, contra una key de `console.anthropic.com`.

Son dos medidores:

| | Qué es | De dónde sale |
|---|---|---|
| Desarrollo | Escribir el bot en Claude Code | Suscripción de Marcos |
| Producción | El bot contestando DMs solo | `ANTHROPIC_API_KEY` (Consola) |

Que el cliente comparta las credenciales de su suscripción no es una opción: va
contra los términos y, además, no serviría para nada.

## Estructura elegida (opción C)

La organización de API es de Marcos. El bot vive en un **workspace propio**, con
su key y sus topes, separado del resto.

```
Organización (Marcos)
├── Default Workspace          ← no admite límites, no se usa para esto
├── Claude Code                ← lo crea Anthropic solo, es de desarrollo
└── Experiencia Airsoft — Bot  ← key + topes del asistente
```

**Por qué un workspace aparte y no el Default:** en el Default *no se pueden
poner límites*. Sin workspace propio no hay techo de gasto, que es justamente lo
que hace aceptable dejar un bot contestando solo.

Como beneficio lateral, el consumo del bot queda separado del de Claude Code en
los reportes, así que el número que se le muestra al cliente es el del bot y
nada más.

## Paso a paso en la Consola

Requiere ser **administrador de la organización**: solo los admins pueden crear
workspaces.

1. **Crear el workspace** — `Settings > Workspaces` → **Create workspace**.
   Nombre: `Experiencia Airsoft — Bot`. Elegir un color, sirve para no
   equivocarse de workspace después. → **Create**.

2. **Poner los topes** — entrar al workspace, pestaña **Limits**. Ahí van los
   *rate limits* (por minuto) y el control de gasto.

   > **Verificar qué ofrece la Consola.** La documentación de Anthropic no es
   > consistente: la parte conceptual habla de *spend limits* (tope mensual que
   > frena), y los pasos de la Consola listan *spend notifications* (avisos por
   > umbral). Si solo hay avisos, el tope duro lo tiene que dar el bot.

   En cualquiera de los dos casos el diseño del bot **ya trae su propio tope
   diario con apagado automático**, así que el techo existe igual. El de la
   Consola es el segundo cinturón, no el único.

3. **Crear la key** — con el workspace seleccionado (selector arriba a la
   izquierda), `API keys` → crear una nueva. Nombre sugerido: `bot-produccion`.
   **Una key pertenece a un solo workspace** y solo ve los recursos de ese
   workspace.

   La key se muestra **una sola vez**. Va derecho a Vercel, no a un chat, ni a
   un mail, ni a un archivo del repo.

4. **Cargar crédito** — `Settings > Billing`. Necesita tarjeta internacional.

## Al cliente, por ahora, no lo invitamos

Suena bien darle acceso para que vea el consumo, pero sale caro en complejidad:
para sumarlo a un workspace primero tiene que ser **miembro de la organización**,
y los roles que dejan ver plata (`billing`) se heredan a **todos** los
workspaces de la organización, no solo al del bot.

Mientras la cuenta sea de Marcos, el número se le muestra y listo. Cuando pase a
tener cuenta propia (abajo) va a ver todo de forma nativa, que es el objetivo.

## La key en Vercel

Variable: `ANTHROPIC_API_KEY`. Va **solo** en los entornos de servidor —
Production y Preview— y nunca con prefijo `NEXT_PUBLIC_`, que la publicaría en
el navegador.

Al agregarla o cambiarla hay que **redeployar**: Vercel congela las variables en
el build.

## Verificar que quedó bien

```bash
pnpm verificar:anthropic
```

Manda una consulta realista contra la API y muestra la respuesta, los tokens
consumidos y el costo de esa llamada. Sirve para tres cosas: confirmar que la
key funciona, ver un costo real en lugar de una estimación, y comprobar que el
crédito está cargado.

Si falla, el error dice cuál de las tres cosas falta.

## Migrar a la cuenta del cliente

El plan es que la cuenta termine siendo del cliente. Cuando pase:

1. El cliente crea su organización en `console.anthropic.com` y carga crédito.
2. Crea el workspace y la key con los mismos pasos de arriba.
3. Se reemplaza `ANTHROPIC_API_KEY` en Vercel y se redeploya.
4. Se archiva el workspace de Marcos. **Archivar revoca las keys al instante y
   no se puede deshacer** — hacerlo recién cuando el bot ya esté andando con la
   key nueva.

Migrar es cambiar una variable de entorno. Vale decírselo al cliente: no queda
atado a nadie.

Un detalle técnico de la migración: el **caché de prompts es por workspace**. Al
cambiar de cuenta el caché arranca vacío, así que las primeras conversaciones
salen un poco más caras hasta que se vuelve a llenar. Dura minutos, no es un
problema, pero explica un pico en el primer reporte.
