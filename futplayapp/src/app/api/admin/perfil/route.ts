import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.nombre) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const admin = await getAdminClient();
    const { error } = await admin
      .from("usuario")
      .update({ nombre: body.nombre })
      .eq("id", user.id);

    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json({ success: true, nombre: body.nombre });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
