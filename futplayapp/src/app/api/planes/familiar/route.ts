import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/planes/familiar?token=XXXX
// Endpoint público: valida el codigo_acceso de un plan familiar y
// devuelve sus datos para la página /planes/familiar/[token].
// Nunca devuelve el propio codigo_acceso.
export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed } = rateLimit(`planes-familiar:${ip}`, 30, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local" },
      { status: 500 }
    );
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );

  const { data: plan, error } = await adminClient
    .from("plan")
    .select("id, nombre, precio, tokens_mensuales, dias_vigencia, tipo_plan")
    .eq("codigo_acceso", token)
    .eq("tipo_plan", "familiar")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Error al validar el link" }, { status: 500 });
  }

  if (!plan) {
    return NextResponse.json({ error: "Link inválido" }, { status: 404 });
  }

  return NextResponse.json(plan);
}
