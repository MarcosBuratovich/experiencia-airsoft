import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { esHostProduccion } from "@/lib/ga";
import {
  armarDatosAtribucion,
  COOKIE_ATRIBUCION,
  COOKIE_MAX_AGE,
  superaTopeCookie,
} from "@/lib/atribucion-cookie";

const PLATFORM_HOSTS = new Set(
  (process.env.NEXT_PUBLIC_PLATFORM_HOSTS ?? "app.localhost:3000,app.experienciaairsoft.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Quita el `:puerto` de un host, si lo tiene.
 *
 * `esHostProduccion()` (`lib/ga.ts`) se escribió pensando en
 * `location.hostname` del browser, que nunca trae puerto. Acá recibe el
 * header `Host` del request, que sí puede traerlo (`www.dominio.com:443`,
 * o cualquier puerto en local/previews). Hoy no rompe nada porque
 * producción no manda puerto, pero si algún día lo mandara, apagaría la
 * atribución en silencio —el regex de `esHostProduccion()` no matchea con
 * un `:` colgando al final—. No se toca `lib/ga.ts`: tiene otros
 * consumidores que sí pasan `location.hostname` tal cual.
 */
function sinPuerto(host: string): string {
  return host.split(":")[0] ?? host;
}

/**
 * Arma el valor de la cookie `ea_attr` para este request, o `null` si no
 * corresponde escribir nada. Se calcula UNA sola vez por request —antes de
 * la rama que distingue host de plataforma de host de marketing— para no
 * repetir la decisión en cada una de las salidas del proxy.
 *
 * Escribir la cookie acá (no en un componente cliente con
 * `document.cookie`) es lo que la saca de los topes de Safari ITP y
 * Firefox para cookies escritas por JS: 7 días, o apenas 24hs cuando el
 * aterrizaje trae link decoration de un dominio clasificado como tracker
 * —exactamente el caso de un `?fbclid=...` viniendo de Instagram—. Una
 * cookie de servidor (`Set-Cookie`) no está sujeta a esos límites.
 *
 * Nunca puede tirar: el proxy corre en CADA request, así que un error acá
 * rompería el sitio entero.
 */
function construirCookieAtribucion(request: NextRequest, host: string): string | null {
  try {
    // First-touch: si ya existe, no se toca. Es lo más importante de toda
    // esta función.
    if (request.cookies.get(COOKIE_ATRIBUCION)) return null;

    // Solo en hosts de producción: localhost y previews quedan sin
    // atribución, igual que los hits internos de GA.
    if (!esHostProduccion(sinPuerto(host))) return null;

    const datos = armarDatosAtribucion({
      searchParams: request.nextUrl.searchParams,
      refererHeader: request.headers.get("referer"),
      pathname: request.nextUrl.pathname,
    });
    const valor = JSON.stringify(datos);

    // Preferible no atribuir a escribir una cookie que el browser va a
    // descartar entera y en silencio por superar el límite de tamaño de
    // Set-Cookie (ver superaTopeCookie en lib/atribucion-cookie.ts).
    if (superaTopeCookie(valor)) return null;

    return valor;
  } catch {
    return null;
  }
}

/** Aplica la cookie de atribución (si corresponde) a la respuesta que se va a devolver. */
function aplicarCookieAtribucion(response: NextResponse, valor: string | null): void {
  if (!valor) return;
  try {
    response.cookies.set(COOKIE_ATRIBUCION, valor, {
      domain: ".experienciaairsoft.com",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: true,
      // Nadie en el cliente la lee: el Client Component que la leía se
      // eliminó (ahora la escribe el proxy) y no hay ningún otro
      // consumidor JS. httpOnly evita que un tag de terceros pueda
      // leerla o pisarla.
      httpOnly: true,
    });
  } catch {
    // Analytics jamás puede romper la página.
  }
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const url = request.nextUrl.clone();

  const cookieAtribucion = construirCookieAtribucion(request, host);

  const isPlatformHost = PLATFORM_HOSTS.has(host);
  const isAlreadyUnderPlatform = url.pathname.startsWith("/platform");

  if (isPlatformHost) {
    const { response, user } = await updateSession(request);

    if (!isAlreadyUnderPlatform) {
      const rewriteUrl = url.clone();
      rewriteUrl.pathname = `/platform${url.pathname === "/" ? "" : url.pathname}`;
      const rewritten = NextResponse.rewrite(rewriteUrl, { request });
      response.cookies.getAll().forEach((c) =>
        rewritten.cookies.set(c.name, c.value, c),
      );
      aplicarCookieAtribucion(rewritten, cookieAtribucion);
      return rewritten;
    }

    const publicPaths = new Set(["/platform", "/platform/login", "/platform/signup", "/platform/auth/callback"]);
    if (!user && !publicPaths.has(url.pathname) && !url.pathname.startsWith("/platform/auth")) {
      const loginUrl = url.clone();
      loginUrl.pathname = "/platform/login";
      const redirectResponse = NextResponse.redirect(loginUrl);
      // `response` (de updateSession) puede traer Set-Cookie de
      // @supabase/ssr —p.ej. limpiando una sesión con refresh token
      // vencido—. Si no se copian acá, se pierden al descartar `response`
      // y el browser queda con cookies stale hasta que expiren. Mismo
      // patrón que el camino de rewrite unas líneas más arriba.
      response.cookies.getAll().forEach((c) =>
        redirectResponse.cookies.set(c.name, c.value, c),
      );
      aplicarCookieAtribucion(redirectResponse, cookieAtribucion);
      return redirectResponse;
    }

    aplicarCookieAtribucion(response, cookieAtribucion);
    return response;
  }

  if (isAlreadyUnderPlatform) {
    const notFound = new NextResponse("Not Found", { status: 404 });
    aplicarCookieAtribucion(notFound, cookieAtribucion);
    return notFound;
  }

  const next = NextResponse.next();
  aplicarCookieAtribucion(next, cookieAtribucion);
  return next;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|ico|txt|xml)$).*)"],
};
