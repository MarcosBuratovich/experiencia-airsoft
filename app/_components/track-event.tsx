"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/ga";

/**
 * Dispara un evento GA4 una sola vez al montar. Para estados de éxito
 * server-rendered (p. ej. /login?signup=ok tras el redirect de la action,
 * donde ningún client component ve el éxito).
 *
 * `once`: clave de sessionStorage que evita re-disparar en reloads de la
 * misma pestaña (los redirects con query param quedan en la URL).
 */
export function TrackEvent({
  event,
  params,
  once,
}: {
  event: string;
  params?: Record<string, unknown>;
  once?: string;
}) {
  const serialized = JSON.stringify(params ?? null);

  useEffect(() => {
    if (once) {
      const key = `ga_once:${once}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // sessionStorage bloqueado (modo incógnito estricto): trackear igual.
      }
    }
    track(event, params);
    // Deps por valor: en navegaciones SPA entre dos páginas que renderizan
    // este componente en la misma posición React NO remonta — sin esto el
    // segundo view_item se perdería. params se compara serializado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, once, serialized]);

  return null;
}

/**
 * Dispara un evento GA4 cuando la URL trae un query param marcador puesto
 * por una server action que redirige (login=ok, creado=1...), y lo limpia
 * con router.replace para que un reload no re-cuente. Montar dentro de un
 * límite de Suspense (useSearchParams).
 */
export function ParamEventTracker({
  param,
  event,
  params,
}: {
  param: string;
  event: string;
  params?: Record<string, unknown>;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get(param) === null) return;
    track(event, params);
    const limpio = new URLSearchParams(searchParams.toString());
    limpio.delete(param);
    const qs = limpio.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // params es un objeto literal estable en los callsites.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, param, event, router]);

  return null;
}

/**
 * Setea el user_id de GA4 (UUID de Supabase, sin PII) para todas las
 * sesiones logueadas: unifica cross-device y habilita audiencias de
 * usuarios registrados. Montar en el layout de la plataforma.
 */
export function GaUserId({ userId }: { userId: string }) {
  useEffect(() => {
    window.gtag?.("set", { user_id: userId });
    // Al desloguear el componente se desmonta: sin esto, gtag seguiría
    // atribuyendo la navegación anónima (o de otra persona en un dispositivo
    // compartido) al usuario anterior.
    return () => {
      window.gtag?.("set", { user_id: undefined });
    };
  }, [userId]);

  return null;
}
