import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { esClasificados } from "@/lib/liga-playoffs";

const ESTADOS = ["borrador", "en_curso", "finalizada"];

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

/** Valida y normaliza los campos editables de una liga. Devuelve un string si hay error. */
function camposLiga(body: Record<string, unknown>, parcial: boolean): Record<string, unknown> | string {
  const datos: Record<string, unknown> = {};
  if (body.nombre !== undefined || !parcial) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) return "El nombre de la liga es obligatorio";
    datos.nombre = nombre;
  }
  if (body.temporada !== undefined) datos.temporada = typeof body.temporada === "string" && body.temporada.trim() ? body.temporada.trim() : null;
  if (body.sede_id !== undefined) datos.sede_id = body.sede_id || null;
  if (body.estado !== undefined) {
    if (!ESTADOS.includes(body.estado as string)) return "Estado inválido";
    datos.estado = body.estado;
  }
  if (body.clasificados_playoff !== undefined) {
    if (body.clasificados_playoff !== null && !esClasificados(body.clasificados_playoff)) return "Los clasificados a playoffs deben ser 2, 4 u 8";
    datos.clasificados_playoff = body.clasificados_playoff;
  }
  return datos;
}

// GET            → listado de ligas con conteo de equipos y partidos.
// GET ?id=<liga> → liga completa: equipos, jugadores (con nombre/email) y partidos.
export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      const [{ data: ligas, error }, { data: equipos }, { data: partidos }] = await Promise.all([
        admin.from("liga").select("*").order("created_at", { ascending: false }),
        admin.from("liga_equipo").select("liga_id"),
        admin.from("liga_partido").select("liga_id, estado"),
      ]);
      if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
      return NextResponse.json((ligas || []).map((l) => ({
        ...l,
        total_equipos: (equipos || []).filter((e) => e.liga_id === l.id).length,
        total_partidos: (partidos || []).filter((p) => p.liga_id === l.id).length,
        partidos_jugados: (partidos || []).filter((p) => p.liga_id === l.id && p.estado === "jugado").length,
      })));
    }

    const { data: liga } = await admin.from("liga").select("*").eq("id", id).maybeSingle();
    if (!liga) return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });

    const [{ data: equipos }, { data: jugadores }, { data: partidos }] = await Promise.all([
      admin.from("liga_equipo").select("*").eq("liga_id", id).order("nombre"),
      admin.from("liga_jugador").select("id, equipo_id, usuario_id, numero, usuario:usuario_id (nombre, email, foto_url, posicion)").eq("liga_id", id),
      admin.from("liga_partido").select("*").eq("liga_id", id).order("jornada").order("fecha_hora"),
    ]);

    return NextResponse.json({ liga, equipos: equipos || [], jugadores: jugadores || [], partidos: partidos || [] });
  } catch (err) {
    return error500(err);
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const datos = camposLiga(await request.json(), false);
    if (typeof datos === "string") return NextResponse.json({ error: datos }, { status: 400 });

    const admin = await getAdminClient();
    const { data, error } = await admin.from("liga").insert(datos).select().single();
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return error500(err);
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const datos = camposLiga(body, true);
    if (typeof datos === "string") return NextResponse.json({ error: datos }, { status: 400 });
    if (Object.keys(datos).length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    const admin = await getAdminClient();
    const { error } = await admin.from("liga").update(datos).eq("id", body.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}

// Borra la liga con sus equipos, planteles y partidos (cascade).
export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { error } = await admin.from("liga").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}
