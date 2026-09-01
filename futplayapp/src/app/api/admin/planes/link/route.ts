import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { getBaseUrl } from "@/lib/base-url";
import { traducirError } from "@/lib/errores";

export const dynamic = "force-dynamic";

// POST /api/admin/planes/link  { id }
// Genera (o regenera) el codigo_acceso de un plan familiar y devuelve
// la URL de acceso completa. Regenerar invalida el link anterior.
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const { data: plan, error: planError } = await admin
      .from("plan")
      .select("id, nombre, tipo_plan")
      .eq("id", body.id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    if (plan.tipo_plan !== "familiar") {
      return NextResponse.json(
        { error: "Solo los planes familiares tienen link de acceso" },
        { status: 400 }
      );
    }

    const token = randomUUID();

    const { error: updateError } = await admin
      .from("plan")
      .update({ codigo_acceso: token })
      .eq("id", plan.id);

    if (updateError) {
      return NextResponse.json({ error: traducirError(updateError.message) }, { status: 500 });
    }

    // Link canónico: futplay.cl si NEXT_PUBLIC_BASE_URL está bien configurada,
    // o el dominio real por el que el admin está navegando.
    const baseUrl = getBaseUrl(request);
    const url = `${baseUrl}/planes/familiar/${token}`;

    return NextResponse.json({ token, url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
