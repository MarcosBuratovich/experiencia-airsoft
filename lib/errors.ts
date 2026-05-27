/**
 * Traductor central de errores. Cualquier código (Server Action, route
 * handler, componente client) que muestre un error al usuario debería
 * pasarlo por friendlyError() antes. Garantiza:
 *
 * - Mensajes en español, sin códigos PG ni stacktraces.
 * - Detalle opcional cuando ayuda al usuario a resolverlo solo.
 * - Flag mostrarSoporte para los casos en los que no se puede hacer nada
 *   del lado del usuario — ahí el banner muestra CTA al WhatsApp.
 * - codigo opcional para correlacionar con logs server-side si el usuario
 *   nos escribe ("decime el código que te dio").
 *
 * El input puede ser:
 *   - Postgres/Supabase error ({ code, message, details, hint })
 *   - Supabase Auth error ({ status, message, name })
 *   - Storage API error ({ statusCode, error, message })
 *   - Error de JS (Error o subclass)
 *   - string (ya redactado por el caller) → pass-through
 *   - undefined / null → fallback genérico
 */

export type FriendlyError = {
  titulo: string;
  detalle?: string;
  /** Mostrar CTA "Escribime por WhatsApp" en el banner. */
  mostrarSoporte: boolean;
  /** Código corto interno, útil si el user nos escribe ("código X"). */
  codigo?: string;
};

type AnyErrorish = {
  code?: string | number;
  message?: string;
  status?: number;
  statusCode?: number;
  details?: string | null;
  hint?: string | null;
  name?: string;
};

/**
 * Postgres codes que aparecen en la app. Reference:
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_CODE_MAP: Record<string, (err: AnyErrorish) => FriendlyError> = {
  // unique_violation: depende del constraint, pero por defecto le
  // decimos al usuario que el valor ya existe.
  "23505": (err) => {
    const msg = err.message ?? "";
    const detail = err.details ?? "";
    if (/email/i.test(msg + detail)) {
      return {
        titulo: "Ese email ya está registrado",
        detalle: "Probá iniciar sesión o recuperar tu contraseña.",
        mostrarSoporte: false,
      };
    }
    if (/dni/i.test(msg + detail)) {
      return {
        titulo: "Ese DNI ya está registrado",
        detalle:
          "Si es tu DNI y no recordás la cuenta, escribime por WhatsApp.",
        mostrarSoporte: true,
      };
    }
    if (/player_number/i.test(msg + detail)) {
      return {
        titulo: "Ese número de jugador ya está en uso",
        detalle: "Elegí otro número de 6 dígitos.",
        mostrarSoporte: false,
      };
    }
    if (/nombre/i.test(msg + detail)) {
      return {
        titulo: "Ya existe algo con ese nombre",
        detalle: "Elegí otro nombre.",
        mostrarSoporte: false,
      };
    }
    if (/alias/i.test(msg + detail)) {
      return {
        titulo: "Ese alias ya está en uso",
        detalle: "Elegí otro alias.",
        mostrarSoporte: false,
      };
    }
    return {
      titulo: "Ese valor ya existe",
      detalle: "Probá con otro distinto.",
      mostrarSoporte: false,
    };
  },

  // foreign_key_violation: típicamente referencia a algo que ya no existe.
  "23503": () => ({
    titulo: "Esa referencia ya no existe",
    detalle:
      "Puede que haya sido eliminada. Recargá la página y volvé a intentar.",
    mostrarSoporte: true,
    codigo: "PG-23503",
  }),

  // check_violation: violó un check constraint (formato, rango).
  "23514": (err) => {
    const msg = err.message ?? "";
    if (/youtube|instagram/i.test(msg)) {
      return {
        titulo: "Ese link no es válido",
        detalle:
          "Solo aceptamos URLs https oficiales de youtube.com, youtu.be o instagram.com.",
        mostrarSoporte: false,
      };
    }
    if (/flair/i.test(msg)) {
      return {
        titulo: "No podés cambiar ese campo",
        mostrarSoporte: false,
      };
    }
    return {
      titulo: "El dato ingresado no tiene un formato válido",
      detalle: "Revisá los campos marcados y volvé a intentar.",
      mostrarSoporte: false,
    };
  },

  // not_null_violation
  "23502": () => ({
    titulo: "Falta completar un campo obligatorio",
    detalle: "Revisá el formulario y completá los campos marcados.",
    mostrarSoporte: false,
  }),

  // insufficient_privilege (RLS o GRANT)
  "42501": () => ({
    titulo: "No tenés permiso para hacer esa acción",
    detalle:
      "Si pensás que sí deberías poder, escribime por WhatsApp con lo que estabas intentando.",
    mostrarSoporte: true,
    codigo: "PG-42501",
  }),

  // raise_exception genérica (suele venir de nuestros triggers)
  P0001: (err) => {
    const msg = (err.message ?? "").replace(/^.*:\s*/, "").trim();
    // Nuestros triggers tiran mensajes ya en español (ej: "No autorizado
    // a cambiar flair"). Los pasamos tal cual si parecen amigables.
    if (msg && msg.length < 200 && !/^[A-Z_]+:/.test(msg)) {
      return { titulo: msg, mostrarSoporte: false };
    }
    return {
      titulo: "No se pudo completar la acción",
      detalle: "La base de datos rechazó la operación.",
      mostrarSoporte: true,
      codigo: "PG-P0001",
    };
  },

  // serialization_failure (raro en este stack pero por las dudas)
  "40001": () => ({
    titulo: "Hubo una colisión temporal",
    detalle: "Volvé a intentar en unos segundos.",
    mostrarSoporte: false,
  }),

  // statement_timeout
  "57014": () => ({
    titulo: "La operación tardó demasiado",
    detalle: "Reintentá. Si sigue, escribime por WhatsApp.",
    mostrarSoporte: true,
    codigo: "PG-57014",
  }),
};

/**
 * Mensajes literales de Supabase Auth que aparecen en respuestas. Los
 * matcheamos case-insensitive contra el message.
 */
const AUTH_MESSAGE_MAP: { match: RegExp; build: () => FriendlyError }[] = [
  {
    match: /invalid login credentials/i,
    build: () => ({
      titulo: "Email o contraseña incorrectos",
      detalle: "Si olvidaste tu contraseña, podés recuperarla.",
      mostrarSoporte: false,
    }),
  },
  {
    match: /user already registered|already been registered/i,
    build: () => ({
      titulo: "Ese email ya está registrado",
      detalle: "Probá iniciar sesión o recuperar tu contraseña.",
      mostrarSoporte: false,
    }),
  },
  {
    match: /email not confirmed/i,
    build: () => ({
      titulo: "Falta confirmar tu email",
      detalle:
        "Revisá tu casilla (también spam) y tocá el link del mail de verificación.",
      mostrarSoporte: true,
    }),
  },
  {
    match: /email rate limit|rate limit exceeded|too many requests/i,
    build: () => ({
      titulo: "Demasiados intentos en poco tiempo",
      detalle:
        "Esperá unos minutos antes de reintentar. Si es urgente, escribime por WhatsApp.",
      mostrarSoporte: true,
    }),
  },
  {
    match: /password should be at least|weak.?password/i,
    build: () => ({
      titulo: "La contraseña es muy corta o débil",
      detalle: "Usá al menos 8 caracteres, mezclando letras y números.",
      mostrarSoporte: false,
    }),
  },
  {
    match: /token has expired|jwt expired|session.*expired/i,
    build: () => ({
      titulo: "Tu sesión expiró",
      detalle: "Iniciá sesión de nuevo para continuar.",
      mostrarSoporte: false,
    }),
  },
  {
    match: /invalid.*token|token.*invalid|invalid.*link/i,
    build: () => ({
      titulo: "El link ya no es válido",
      detalle:
        "Pudo haber expirado o haberse usado. Pedí uno nuevo desde la pantalla de recuperar contraseña.",
      mostrarSoporte: false,
    }),
  },
  {
    match: /signups? (not allowed|disabled)/i,
    build: () => ({
      titulo: "El registro está temporalmente cerrado",
      detalle: "Escribime por WhatsApp para que te demos acceso.",
      mostrarSoporte: true,
    }),
  },
  {
    match: /user not found/i,
    build: () => ({
      titulo: "No encontramos esa cuenta",
      detalle: "Verificá que el email sea correcto.",
      mostrarSoporte: false,
    }),
  },
];

/**
 * Errores de Supabase Storage (subida de archivos).
 */
function storageError(err: AnyErrorish): FriendlyError | null {
  const status = err.statusCode ?? err.status;
  const msg = (err.message ?? "").toLowerCase();
  if (status === 413 || msg.includes("payload too large")) {
    return {
      titulo: "La imagen pesa demasiado",
      detalle: "Tiene que pesar menos de 2 MB. Probá recortarla o comprimirla.",
      mostrarSoporte: false,
    };
  }
  if (msg.includes("invalid_mime_type") || msg.includes("mime")) {
    return {
      titulo: "Formato de imagen no soportado",
      detalle: "Subí un PNG, JPG o WebP.",
      mostrarSoporte: false,
    };
  }
  if (status === 401 || status === 403) {
    return {
      titulo: "No tenés permiso para subir esa imagen",
      mostrarSoporte: true,
      codigo: `STORAGE-${status}`,
    };
  }
  return null;
}

/**
 * Errores de red / fetch genéricos.
 */
function networkError(err: AnyErrorish): FriendlyError | null {
  const msg = (err.message ?? "").toLowerCase();
  if (
    err.name === "AbortError" ||
    msg.includes("aborted") ||
    msg.includes("the operation was aborted")
  ) {
    return {
      titulo: "La acción se canceló",
      mostrarSoporte: false,
    };
  }
  if (
    err.name === "TypeError" &&
    (msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("load failed"))
  ) {
    return {
      titulo: "Sin conexión",
      detalle: "Revisá tu internet y volvé a intentar.",
      mostrarSoporte: false,
    };
  }
  return null;
}

/** Resultado por defecto cuando no podemos clasificar el error. */
const FALLBACK: FriendlyError = {
  titulo: "Algo salió mal",
  detalle:
    "Intentá de nuevo en unos segundos. Si vuelve a pasar, escribime por WhatsApp para que lo veamos juntos.",
  mostrarSoporte: true,
  codigo: "UNKNOWN",
};

/**
 * Convierte cualquier error en un mensaje amigable para mostrar al
 * usuario. Garantiza que nunca se filtre un stacktrace o mensaje crudo.
 */
export function friendlyError(input: unknown): FriendlyError {
  if (input == null) return FALLBACK;

  // Pass-through si ya es FriendlyError (por shape).
  if (
    typeof input === "object" &&
    "titulo" in (input as object) &&
    typeof (input as FriendlyError).titulo === "string"
  ) {
    return input as FriendlyError;
  }

  // Pass-through de strings ya redactados por el caller.
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return FALLBACK;
    return { titulo: sanitizeString(s), mostrarSoporte: false };
  }

  const err = input as AnyErrorish;

  // Postgres code match.
  const codeStr = err.code != null ? String(err.code) : "";
  const pgHandler = PG_CODE_MAP[codeStr];
  if (pgHandler) return pgHandler(err);

  // Auth message match.
  const message = err.message ?? "";
  for (const { match, build } of AUTH_MESSAGE_MAP) {
    if (match.test(message)) return build();
  }

  // Storage.
  const st = storageError(err);
  if (st) return st;

  // Network.
  const net = networkError(err);
  if (net) return net;

  // Último intento: si el message parece amigable (corto, español, sin
  // jargon ni código), pass-through. Si no, fallback.
  if (message && isLikelyFriendlyMessage(message)) {
    return { titulo: sanitizeString(message), mostrarSoporte: false };
  }

  // Loguear server-side para diagnóstico (no afecta al usuario).
  if (typeof console !== "undefined") {
    console.warn("[friendlyError] unmapped error:", {
      code: err.code,
      status: err.status,
      name: err.name,
      message: err.message,
    });
  }
  return FALLBACK;
}

/**
 * Wrapper común para Server Actions: produce el shape que esperan los
 * forms con useActionState. El detalle adicional `formErrors` es para
 * cuando además queremos pintar errores por campo (zod field errors).
 */
export type ActionErrorState = {
  error: FriendlyError;
  formErrors?: Record<string, string[]>;
};

export function actionError(
  input: unknown,
  formErrors?: Record<string, string[]>,
): ActionErrorState {
  return { error: friendlyError(input), ...(formErrors ? { formErrors } : {}) };
}

/**
 * Helper para forms con useActionState que mezclan validación zod + errores
 * de runtime. Cuando hay field errors, el banner principal muestra "Revisá
 * los campos marcados" y la lista de field errors va abajo.
 */
export function actionFieldErrors(
  fieldErrors: Record<string, string[]>,
): ActionErrorState {
  return {
    error: {
      titulo: "Revisá los campos marcados",
      detalle:
        "Algunos datos no son válidos. Corregilos abajo y reintentá.",
      mostrarSoporte: false,
    },
    formErrors: fieldErrors,
  };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Saca cosas que el usuario no debería ver: prefijos tipo "PostgresError:",
 * URLs, paths internos, IDs UUID, stacks.
 */
function sanitizeString(s: string): string {
  return s
    .replace(/^[A-Za-z_]+Error:\s*/, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Heurística: un mensaje en español sin tecnicismos puede salir tal cual.
 * Esto cubre los mensajes que tipean los devs en `throw new Error("...")`
 * o `return { error: "..." }` dentro de actions ya redactadas.
 */
function isLikelyFriendlyMessage(msg: string): boolean {
  if (msg.length > 200) return false;
  // Si tiene caracteres muy técnicos, no es amigable.
  if (/[<>{}[\]`$]/.test(msg)) return false;
  if (/^[A-Z_]+:/.test(msg)) return false;
  if (/(syntax error|undefined|null reference|stack trace|cannot read)/i.test(msg)) {
    return false;
  }
  return true;
}
