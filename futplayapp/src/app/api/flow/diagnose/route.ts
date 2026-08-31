import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/base-url";

// GET /api/flow/diagnose
// Diagnóstico de configuración de Flow (autenticado). Devuelve SOLO datos
// no sensibles: si las keys están configuradas, su longitud y el endpoint
// al que apunta la app (sandbox vs producción). Útil para detectar el error
// "apiKey not found" (keys de sandbox pegándole a producción o al revés).
export async function GET() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const apiKey = process.env.FLOW_API_KEY || "";
  const secretKey = process.env.FLOW_SECRET_KEY || "";
  const isSandbox = process.env.NEXT_PUBLIC_FLOW_SANDBOX === "true";

  return NextResponse.json({
    sandboxactivo: isSandbox,
    apiUrl: isSandbox ? "https://sandbox.flow.cl/api" : "https://www.flow.cl/api",
    apiKeyConfigurada: apiKey.length > 0,
    apiKeyLongitud: apiKey.length,
    apiKeyPrefijo: apiKey.slice(0, 4),
    secretConfigurado: secretKey.length > 0,
    secretLongitud: secretKey.length,
    baseUrl: getBaseUrl(),
    nota:
      isSandbox
        ? "Revisa que FLOW_API_KEY/FLOW_SECRET_KEY sean las keys de SANDBOX (las de .env.local local)."
        : "Revisa que FLOW_API_KEY/FLOW_SECRET_KEY sean las keys de PRODUCCIÓN de flow.cl.",
    hint501:
      isSandbox
        ? "Si ves 501 'apiKey not found': la app está en sandbox pero las keys no son válidas para sandbox (o están mal copiadas)."
        : "Si ves 501 'apiKey not found': la app está en PRODUCCIÓN pero las keys son de SANDBOX (o la cuenta Flow no está validada). Pasa NEXT_PUBLIC_FLOW_SANDBOX=true para probar, o pon las keys de producción.",
  });
}