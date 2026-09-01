/**
 * Traducción de errores técnicos a mensajes cotidianos en español.
 *
 * Los errores que llegan desde Supabase/Postgres/Flow/Bunny traen mensajes
 * técnicos (ej: `duplicate key value violates unique constraint "usuario_telefono_key"`)
 * que NO deben mostrarse crudos al usuario final. Este helper los convierte a
 * textos comprensibles.
 */

type TraducirEntrada = string | { message?: string } | null | undefined;

/**
 * Intenta extraer un mensaje amigable a partir de un error/objeto/string.
 * Si no reconoce el patrón, devuelve un mensaje genérico (nunca el crudo).
 */
export function traducirError(
  entrada: TraducirEntrada,
  fallback = "Ocurrió un error inesperado. Inténtalo nuevamente.",
): string {
  if (entrada == null || entrada === "") return fallback;

  const mensaje = typeof entrada === "string" ? entrada : entrada.message ?? "";

  return traducirMensajeCRUDO(mensaje, fallback);
}

/** Traduce un string de error crudo (message de Supabase/Postgres/red). */
export function traducirMensajeCRUDO(mensaje: string, fallback: string): string {
  if (!mensaje) return fallback;

  const m = mensaje.toLowerCase();

  // Duplicados (unique constraint)
  if (
    m.includes("duplicate key") ||
    m.includes("unique constraint") ||
    m.includes("already exist") ||
    m.includes("ya existe") ||
    m.includes("ya registrado") ||
    m.includes("ya en uso")
  ) {
    if (m.includes("telefono") || m.includes("phone")) {
      return "Ese número de teléfono ya está registrado con otro usuario.";
    }
    if (m.includes("email") || m.includes("correo")) {
      return "Ese correo ya está registrado con otro usuario.";
    }
    if (m.includes("rut")) {
      return "Ese RUT ya está registrado con otro usuario.";
    }
    if (m.includes("_key") || m.includes("constraint")) {
      const nombre = extraerConstraint(mensaje);
      if (nombre.includes("email") || nombre.includes("correo")) {
        return "Ese correo ya está registrado.";
      }
      if (nombre.includes("telefono") || nombre.includes("phone")) {
        return "Ese número de teléfono ya está registrado.";
      }
      if (nombre.includes("rut")) {
        return "Ese RUT ya está registrado.";
      }
    }
    return "Ese dato ya está registrado en el sistema. Revísalo e inténtalo nuevamente.";
  }

  // Autenticación (Supabase Auth)
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Ya existe una cuenta con ese correo.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Todavía no confirmas tu correo. Revisa tu bandeja de entrada.";
  }
  if (m.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  }
  if (m.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  // Violaciones de FK / borrar en uso
  if (m.includes("foreign key") || m.includes("violates foreign key")) {
    return "No se puede completar la acción porque está vinculada a otros datos. Revísalo e inténtalo nuevamente.";
  }

  // Validación NOT NULL / check
  if (m.includes("not null") || m.includes("null value") || m.includes("check constraint")) {
    return "Faltan datos obligatorios. Completa todos los campos requeridos.";
  }

  // Valor fuera de rango / formato
  if (m.includes("out of range") || m.includes("invalid input")) {
    return "Uno de los valores ingresados no es válido. Revísalo e inténtalo nuevamente.";
  }

  // Estructura de RUT inválida (mensajes comunes)
  if (m.includes("rut") && (m.includes("invalid") || m.includes("válido") || m.includes("valido"))) {
    return "El RUT ingresado no es válido. Revísalo e inténtalo nuevamente.";
  }

  // Teléfono con formato
  if (m.includes("telefono") || m.includes("phone")) {
    if (m.includes("invalid") || m.includes("válido") || m.includes("valido") || m.includes("formato") || m.includes("length")) {
      return "El número de teléfono no es válido. Verifica que tenga el formato correcto.";
    }
  }

  // Red / sin conexión (frente a fallos genéricos de fetch)
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network error") ||
    m.includes("fetch failed") ||
    m.includes("load failed") ||
    m.includes("socket") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("aborted") ||
    m.includes("service unavailable") ||
    m.includes("no services available")
  ) {
    return "Tuvimos un problema de conexión. Revisa tu internet e inténtalo nuevamente.";
  }

  // Errores HTTP conocidos
  if (m.includes("too many requests") || m.includes("429")) {
    return "Estás haciendo demasiadas solicitudes. Espera un minuto y vuelve a intentarlo.";
  }
  if (m.includes("401") || m.includes("unauthorized") || m.includes("forbidden")) {
    return "Tu sesión venció o no tienes permisos para hacer esto. Vuelve a iniciar sesión.";
  }
  if (m.includes("403")) {
    return "No tienes permiso para realizar esta acción.";
  }
  if (m.includes("not found") || m.includes("404")) {
    return "No encontramos lo que buscas. Puede que ya no esté disponible.";
  }
  if (m.includes("500") || m.includes("internal")) {
    return "Tuvimos un problema en nuestro servidor. Inténtalo nuevamente en unos segundos.";
  }

  // Texto que ya está en español (clean) — dejarlo pasar si parece amigable
  if (esMensajeAmigable(mensaje)) {
    return mensaje;
  }

  return fallback;
}

/** Devuelve el nombre de la constraint (ej: usuario_telefono_key) si está en el mensaje. */
function extraerConstraint(mensaje: string): string {
  const match = mensaje.match(/constraint\s+"?([^"\s)]+)"?/i);
  return match ? match[1] : "";
}

/** Reconoce mensajes que ya están redactados para el usuario (no técnicos). */
function esMensajeAmigable(mensaje: string): boolean {
  const m = mensaje.toLowerCase();
  // Sin guiones bajos, ni código de 5 dígitos entre <<>>, ni "violates", ni "key", ni "error:"
  if (m.includes("_key") || m.includes("violates") || m.includes("duplicate key")) return false;
  if (/^\s*(18\d|user|worker|procesos)/.test(m)) return false;
  // Mensajes que empiezan con letra mayúscula normal y tienen buena longitud
  return !/^\s*(?:error|failed|invalid|duplicate|could|unable|postgrest|supabase|fetch)/i.test(m);
}
