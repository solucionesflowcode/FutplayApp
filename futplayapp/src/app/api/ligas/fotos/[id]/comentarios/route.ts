import { NextResponse } from "next/server";
import { getAdminClient, verifyAdmin } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { errorComentario, esUuid } from "@/lib/liga-fotos";
import { COLUMNAS_COMENTARIO, comentarioVista, fotoPublicada, usuarioConSesion } from "@/lib/liga-fotos-servidor";
import { rateLimit } from "@/lib/rate-limit";

type Contexto = { params: Promise<{ id: string }> };

const MAX_COMENTARIOS_VISIBLES = 200;
const MAX_COMENTARIOS_POR_MINUTO = 10;

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

// GET → comentarios de la foto, del más antiguo al más nuevo. Un admin también los ve si la liga está en borrador.
export async function GET(_request: Request, contexto: Contexto) {
  const user = await usuarioConSesion();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { id } = await contexto.params;
    const admin = await getAdminClient();
    if (!esUuid(id) || (!(await fotoPublicada(admin, id)) && !(await verifyAdmin()))) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("liga_foto_comentario")
      .select(COLUMNAS_COMENTARIO)
      .eq("foto_id", id)
      .order("created_at", { ascending: false })
      .limit(MAX_COMENTARIOS_VISIBLES);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json((data ?? []).map((c) => comentarioVista(c, user.id)).reverse());
  } catch (err) {
    return error500(err);
  }
}

// POST { texto } → publica un comentario.
export async function POST(request: Request, contexto: Contexto) {
  const user = await usuarioConSesion();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { allowed } = rateLimit(`liga-foto-comentario:${user.id}`, MAX_COMENTARIOS_POR_MINUTO, 60000);
    if (!allowed) return NextResponse.json({ error: "Estás comentando muy rápido. Espera un momento." }, { status: 429 });

    const { id } = await contexto.params;
    const { texto } = await request.json();
    const mensaje = errorComentario(texto);
    if (mensaje) return NextResponse.json({ error: mensaje }, { status: 400 });

    const admin = await getAdminClient();
    if (!(await fotoPublicada(admin, id))) return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });

    const { data, error } = await admin
      .from("liga_foto_comentario")
      .insert({ foto_id: id, usuario_id: user.id, texto: texto.trim() })
      .select(COLUMNAS_COMENTARIO)
      .single();
    if (error || !data) return NextResponse.json({ error: traducirError(error?.message) }, { status: 500 });

    return NextResponse.json(comentarioVista(data, user.id));
  } catch (err) {
    return error500(err);
  }
}
