# Setup de plataforma

## 1. Crear proyecto Supabase
1. https://supabase.com → New project → plan Free.
2. Copiar `Project URL` y `anon public key` a `.env.local` como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Agregar las mismas vars en Vercel → Project Settings → Environment Variables.

## 2. Correr schema
- Abrir **SQL Editor** de Supabase → pegar el contenido de [`schema.sql`](./schema.sql) → Run.
- Crea tablas `profiles / partidas / inscripciones / checkins`, activa RLS, y trigger que completa `profiles` al registrarse.

## 3. Crear primer admin
Después del primer signup vía la app, correr en SQL Editor:

```sql
update public.profiles set role = 'super_admin' where email = 'tu-email@example.com';
```

## 4. Dev local con subdominio
- Agregar a `/etc/hosts`: `127.0.0.1 app.localhost` (normalmente ya está).
- Landing: http://localhost:3000 · Plataforma: http://app.localhost:3000.
- Las rutas `/platform/*` **solo** son accesibles vía `app.*`. El proxy reescribe URLs root en `app.*` a `/platform/*`.

## 5. Dominio de producción
- Cloudflare Registrar → comprar `experiencia-airsoft.com` (~USD 10/año).
- Vercel → Domains → agregar `experiencia-airsoft.com` **y** `app.experiencia-airsoft.com` al mismo proyecto.
- Confirmar que `NEXT_PUBLIC_PLATFORM_HOSTS` incluye el host del subdominio.

## 6. Auth > email
- Supabase → Auth → Email → desactivar "Confirm email" solo si querés signup inmediato sin verificación (no recomendado).
- Si se deja activo, el usuario recibe mail de confirmación antes de poder loguearse.
