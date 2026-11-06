import { NextResponse } from "next/server";
import { getAdminClient, verifyAdmin } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { esUuid } from "@/lib/liga-fotos";
import { usuarioConSesion } from "@/lib/liga-fotos-servidor";

// DELETE → borra un comentario: solo su autor o un admin.
export async function DELETE(_request: Request, contexto: { params: Promise<{ id: string }> }) {
  const user = await usuarioConSesion();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { id } = await contexto.params;
    if (!esUuid(id)) return NextResponse.json({ error: "Comentario no válido" }, { status: 400 });

    const admin = await getAdminClient();
    const { data: comentario } = await admin.from("liga_foto_comentario").select("usuario_id").eq("id", id).maybeSingle();
    if (!comentario) return NextResponse.json({ error: "El comentario no existe" }, { status: 404 });

    if (comentario.usuario_id !== user.id && !(await verifyAdmin())) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { error } = await admin.from("liga_foto_comentario").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
