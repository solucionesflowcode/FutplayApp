import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

function nombreDuplicado(message: string) {
  return /duplicate key|unique constraint/i.test(message)
    ? NextResponse.json({ error: "Ya existe un equipo con ese nombre en la liga" }, { status: 409 })
    : null;
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!body.liga_id || !nombre) return NextResponse.json({ error: "Faltan campos: liga_id, nombre" }, { status: 400 });

    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("liga_equipo")
      .insert({ liga_id: body.liga_id, nombre, logo_url: body.logo_url || null })
      .select()
      .single();
    if (error) return nombreDuplicado(error.message) ?? NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
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

    const datos: Record<string, unknown> = {};
    if (body.nombre !== undefined) {
      const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
      if (!nombre) return NextResponse.json({ error: "El nombre del equipo es obligatorio" }, { status: 400 });
      datos.nombre = nombre;
    }
    // null o "" quita el logo.
    if (body.logo_url !== undefined) datos.logo_url = body.logo_url || null;
    if (Object.keys(datos).length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    const admin = await getAdminClient();
    const { error } = await admin.from("liga_equipo").update(datos).eq("id", body.id);
    if (error) return nombreDuplicado(error.message) ?? NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}

// Un equipo con partidos no se borra: el cascade se llevaría resultados de otros equipos.
export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get("id");
    // Se valida el formato: el id va dentro del filtro .or() de PostgREST.
    if (!id || !UUID.test(id)) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { count } = await admin
      .from("liga_partido")
      .select("*", { count: "exact", head: true })
      .or(`local_id.eq.${id},visita_id.eq.${id}`);
    if (count) {
      return NextResponse.json(
        { error: `No se puede eliminar: el equipo tiene ${count} partido(s). Elimínalos primero del fixture.` },
        { status: 409 }
      );
    }

    const { error } = await admin.from("liga_equipo").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}
