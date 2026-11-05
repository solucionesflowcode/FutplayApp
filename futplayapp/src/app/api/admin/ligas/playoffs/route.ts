import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { calcularTabla, FASES_PLAYOFF, type LigaPartido } from "@/lib/liga-tabla";
import { esClasificados, generarPrimeraRonda, generarSiguienteRonda, rondaActual, type CruceNuevo } from "@/lib/liga-playoffs";

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

// POST { liga_id, accion }
//   "generar"   + clasificados (2|4|8): primera ronda desde la tabla actual.
//   "siguiente": cruza a los ganadores de la ronda más avanzada.
//   "reiniciar": borra todos los partidos de playoffs.
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    const ligaId = body.liga_id;
    if (!ligaId) return NextResponse.json({ error: "liga_id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { data: liga } = await admin.from("liga").select("id").eq("id", ligaId).maybeSingle();
    if (!liga) return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });

    if (body.accion === "reiniciar") {
      const { error } = await admin.from("liga_partido").delete().eq("liga_id", ligaId).in("fase", FASES_PLAYOFF);
      if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    const { data: partidos } = await admin.from("liga_partido").select("*").eq("liga_id", ligaId);
    const todos = (partidos || []) as LigaPartido[];
    const ronda = rondaActual(todos);

    let cruces: CruceNuevo[];
    if (body.accion === "generar") {
      if (!esClasificados(body.clasificados)) return NextResponse.json({ error: "Los clasificados deben ser 2, 4 u 8" }, { status: 400 });
      if (ronda) return NextResponse.json({ error: "Los playoffs ya están generados. Reinícialos para volver a armarlos." }, { status: 409 });

      const { data: equipos } = await admin.from("liga_equipo").select("id, nombre").eq("liga_id", ligaId);
      try {
        cruces = generarPrimeraRonda(calcularTabla(equipos || [], todos), body.clasificados);
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
      }
      await admin.from("liga").update({ clasificados_playoff: body.clasificados }).eq("id", ligaId);
    } else if (body.accion === "siguiente") {
      if (!ronda) return NextResponse.json({ error: "Primero genera los playoffs" }, { status: 400 });
      try {
        cruces = generarSiguienteRonda(todos.filter((p) => p.fase === ronda));
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("liga_partido")
      .insert(cruces.map((c) => ({ ...c, liga_id: ligaId })))
      .select();
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return error500(err);
  }
}
