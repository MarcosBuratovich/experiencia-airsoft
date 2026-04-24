# Email templates · Experiencia Airsoft

Templates HTML para los mails transaccionales, alineados al sistema de diseño
(negro/naranja, Impact/Oswald display, mono JetBrains stencil, borde naranja
como stand-in de `clip-notch` porque los clientes de email no soportan
`clip-path`). Inline styles + tablas anidadas por compatibilidad con Outlook,
Gmail y Apple Mail.

## Los 3 mails

| Archivo | Asunto recomendado | Cuándo se envía |
|---|---|---|
| `confirm-signup.html` | Confirmá tu ingreso — Experiencia Airsoft | Al registrarse, si "Confirm email" está activo en Supabase Auth |
| `reset-password.html` | Nueva clave — Experiencia Airsoft | Cuando el user pide recuperar contraseña |
| `welcome.html` | Estás dentro — Experiencia Airsoft | Después de confirmar la cuenta (ver nota) |

## Cargar en Supabase (confirm + reset)

1. Configurar primero Resend como SMTP en **Project → Settings →
   Authentication → SMTP Settings** (host `smtp.resend.com`, port 465,
   user `resend`, pass tu API key).
2. Ir a **Authentication → Email Templates**.
3. Para "Confirm signup": pegar el contenido de
   [confirm-signup.html](confirm-signup.html). Subject sugerido:
   `Confirmá tu ingreso — Experiencia Airsoft`.
4. Para "Reset Password": pegar [reset-password.html](reset-password.html).
   Subject sugerido: `Nueva clave — Experiencia Airsoft`.
5. Las variables usadas son las estándar de Supabase:
   `{{ .ConfirmationURL }}`. No hace falta tocar nada más.

## Welcome (no es template de Supabase)

Supabase no manda un "bienvenido" por defecto. Opciones:

- **Disparar desde el server action** `signupAction` después de que
  `auth.signUp` devuelve OK. Llamamos a `https://api.resend.com/emails`
  con fetch usando `RESEND_API_KEY` (env server-only). Así el welcome
  llega aunque el user no necesite confirmar.
- **Edge Function + webhook** (más limpio, requiere deploy de una función).

Cuando el user lo pida, agregamos un helper `lib/email/send-welcome.ts`
que carga el HTML y lo renderiza con el nombre (`{{ .Data.nombre }}` en el
template se reemplaza por el valor real).

## Testing rápido

Previsualizar cada archivo abriéndolo directo en el browser. Para ver cómo se
ve en Gmail/Outlook reales, mandarlos a uno mismo con
[Litmus](https://litmus.com) o [Email on Acid](https://www.emailonacid.com)
en preview mode.

## Decisiones de diseño

- **Borde superior naranja 4px** — reemplaza `clip-notch` (clip-path no anda
  en email).
- **Fuentes en cascada** — `Impact, Oswald, 'Arial Narrow Bold', sans-serif`
  para display; `'SF Mono', Consolas, monospace` para labels militares;
  `-apple-system, Segoe UI, Arial` para body. Sin Google Fonts imports
  (los clients cristal los strippean).
- **Background con grain sutil** — `repeating-linear-gradient` diagonal,
  opacidad 4% para no competir con el contenido.
- **Outlook VML button fallback** — el CTA se renderiza como
  `<v:roundrect>` cuando el cliente es Outlook clásico, para garantizar
  que el botón se vea sólido y clickeable.
- **Opciones tácticas consistentes** — OP-00 (Alta), OP-01 (Control),
  OP-02 (Restauración) para dar continuidad con las "operaciones" del
  sistema.
