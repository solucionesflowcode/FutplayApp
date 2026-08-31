// Construye la URL base canónica para links/QR/callbacks de Flow.
//
// Orden de preferencia:
//   1. NEXT_PUBLIC_BASE_URL si está configurada y NO es un dominio .vercel.app
//      (en Vercel puede quedar obsoleta apuntando al dominio "futplay-vercel.vercel.app").
//   2. El origen real de la request (el dominio por el que el usuario navega, ej. https://futplay.cl).
export function getBaseUrl(request?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes(".vercel.app")) {
    return envUrl.replace(/\/+$/, "");
  }
  if (request) {
    return new URL(request.url).origin;
  }
  return envUrl || "http://localhost:3000";
}