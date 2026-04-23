import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PLATFORM_HOSTS = new Set(
  (process.env.NEXT_PUBLIC_PLATFORM_HOSTS ?? "app.localhost:3000,app.experiencia-airsoft.com")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const url = request.nextUrl.clone();

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
      return rewritten;
    }

    const publicPaths = new Set(["/platform", "/platform/login", "/platform/signup", "/platform/auth/callback"]);
    if (!user && !publicPaths.has(url.pathname) && !url.pathname.startsWith("/platform/auth")) {
      const loginUrl = url.clone();
      loginUrl.pathname = "/platform/login";
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (isAlreadyUnderPlatform) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|ico|txt|xml)$).*)"],
};
