import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { fotoPublicada, usuarioConSesion } from "@/lib/liga-fotos-servidor";

type Contexto = { params: Promise<{ id: string }> };

// POST da el "me gusta" y DELETE lo quita. Repetir cualquiera de los dos no cambia el resultado.
async function cambiar(contexto: Contexto, meGusta: boolean) {
  const user = await usuarioConSesion();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { id } = await contexto.params;
    const admin = await getAdminClient();
    if (!(await fotoPublicada(admin, id))) return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });

    const tabla = admin.from("liga_foto_reaccion");
    const { error } = meGusta
      ? await tabla.upsert({ foto_id: id, usuario_id: user.id }, { onConflict: "foto_id,usuario_id", ignoreDuplicates: true })
      : await tabla.delete().eq("foto_id", id).eq("usuario_id", user.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    const { count } = await admin.from("liga_foto_reaccion").select("*", { count: "exact", head: true }).eq("foto_id", id);
    return NextResponse.json({ me_gusta: meGusta, total: count ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}

export async function POST(_request: Request, contexto: Contexto) {
  return cambiar(contexto, true);
}

export async function DELETE(_request: Request, contexto: Contexto) {
  return cambiar(contexto, false);
}
