import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { filtroDesdeParams, idsPartidosDeFiltro } from "@/lib/liga-fotos";
import { ligaPublicada, listarFotos, usuarioConSesion } from "@/lib/liga-fotos-servidor";

// GET /api/ligas/fotos?liga_id=&cursor=&generales=&jornada=&fase=&equipo_id=&partido_id=
// Galería del jugador: cualquier usuario con sesión, solo ligas publicadas.
export async function GET(request: Request) {
  const user = await usuarioConSesion();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const params = new URL(request.url).searchParams;
    const ligaId = params.get("liga_id") ?? "";
    const admin = await getAdminClient();
    if (!(await ligaPublicada(admin, ligaId))) return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });

    const filtro = filtroDesdeParams(params);
    const { data: partidos, error } = await admin.from("liga_partido").select("id, fase, jornada, local_id, visita_id").eq("liga_id", ligaId);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json(await listarFotos(admin, {
      ligaId,
      usuarioId: user.id,
      cursor: params.get("cursor"),
      soloGenerales: filtro.generales,
      partidoIds: filtro.generales ? null : idsPartidosDeFiltro(partidos ?? [], filtro),
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
