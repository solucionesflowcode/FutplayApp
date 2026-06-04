import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}


export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "clases";

  try {
    const admin = getAdminClient();

    if (tipo === "sedes") {
      const { data } = await admin.from("sede").select("*").order("nombre");
      return NextResponse.json(data || []);
    }

    if (tipo === "asistencia-general") {
      const { data } = await admin
        .from("clase_usuario")
        .select("id, asistencia, clase_id, usuario_id")
        .order("created_at", { ascending: false });

      const claseIds = [...new Set((data || []).map((cu) => cu.clase_id))];
      const userIds = [...new Set((data || []).map((cu) => cu.usuario_id))];

      const [clasesRes, usuariosRes] = await Promise.all([
        admin.from("clase").select("id, titulo").in("id", claseIds),
        admin.from("usuario").select("id, nombre").in("id", userIds),
      ]);

      const claseMap = new Map((clasesRes.data || []).map((c) => [c.id, c.titulo]));
      const usuarioMap = new Map((usuariosRes.data || []).map((u) => [u.id, u.nombre]));

      return NextResponse.json((data || []).map((cu) => ({
        ...cu,
        clase_titulo: claseMap.get(cu.clase_id) || "—",
        usuario_nombre: usuarioMap.get(cu.usuario_id) || "—",
      })));
    }

    if (tipo === "asistencia") {
      const claseId = searchParams.get("clase_id");
      if (!claseId) return NextResponse.json({ error: "clase_id requerido" }, { status: 400 });

      const { data: clase } = await admin.from("clase").select("*").eq("id", claseId).single();
      if (!clase) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

      const { data: horarios } = await admin.from("horario").select("*").eq("clase_id", claseId).order("fecha_hora");

      const { data: inscripciones } = await admin
        .from("clase_usuario")
        .select("id, usuario_id, asistencia")
        .eq("clase_id", claseId);

      const userIds = [...new Set((inscripciones || []).map((i) => i.usuario_id))];
      const { data: usuarios } = await admin.from("usuario").select("id, nombre").in("id", userIds);
      const usuarioMap = new Map((usuarios || []).map((u) => [u.id, u.nombre]));

      return NextResponse.json({
        clase,
        horarios: horarios || [],
        inscripciones: (inscripciones || []).map((i) => ({
          ...i,
          usuario_nombre: usuarioMap.get(i.usuario_id) || "—",
        })),
      });
    }

    const { data: clases, error } = await admin
      .from("clase")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const claseIds = (clases || []).map((c) => c.id);

    const { data: horarios } = await admin
      .from("horario")
      .select("*")
      .in("clase_id", claseIds)
      .order("fecha_hora");

    const { data: sedes } = await admin.from("sede").select("*");
    const sedeMap = new Map((sedes || []).map((s) => [s.id, s.nombre]));

    const profesorIds = [...new Set((clases || []).map((c) => c.profesor_id).filter(Boolean))];
    const { data: profesores } = profesorIds.length > 0
      ? await admin.from("usuario").select("id, nombre").in("id", profesorIds)
      : { data: [] };
    const profesorMap = new Map((profesores || []).map((p) => [p.id, p.nombre]));

    const horariosPorClase = new Map<string, any[]>();
    (horarios || []).forEach((h) => {
      const list = horariosPorClase.get(h.clase_id) || [];
      list.push(h);
      horariosPorClase.set(h.clase_id, list);
    });

    const { data: counts } = await admin
      .from("clase_usuario")
      .select("clase_id")
      .in("clase_id", claseIds);

    const inscritosPorClase = new Map<string, number>();
    (counts || []).forEach((cu) => {
      inscritosPorClase.set(cu.clase_id, (inscritosPorClase.get(cu.clase_id) || 0) + 1);
    });

    return NextResponse.json((clases || []).map((c) => ({
      ...c,
      sede_nombre: sedeMap.get(c.sede_id) || "—",
      profesor_nombre: c.profesor_id ? profesorMap.get(c.profesor_id) || "" : "",
      horarios: horariosPorClase.get(c.id) || [],
      inscritos: inscritosPorClase.get(c.id) || 0,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const body = await request.json();

    if (!body.titulo || !body.sede_id) {
      return NextResponse.json({ error: "Faltan campos: titulo, sede_id" }, { status: 400 });
    }

    const insertData: any = {
      titulo: body.titulo,
      descripcion: body.descripcion || "",
      sede_id: body.sede_id,
      cupo_maximo: body.cupo_maximo || 15,
    };
    if (body.profesor_id !== undefined) insertData.profesor_id = body.profesor_id;

    const { data: clase, error } = await admin
      .from("clase")
      .insert(insertData)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.horarios?.length > 0) {
      const horariosData = body.horarios.map((h: string) => ({
        clase_id: clase.id,
        fecha_hora: h,
      }));
      const { error: horariosError } = await admin.from("horario").insert(horariosData);
      if (horariosError) console.error("Error inserting horarios:", horariosError);
    }

    return NextResponse.json(clase);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: any = {};
    if (body.titulo !== undefined) updateData.titulo = body.titulo;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.sede_id !== undefined) updateData.sede_id = body.sede_id;
    if (body.cupo_maximo !== undefined) updateData.cupo_maximo = body.cupo_maximo;
    if (body.profesor_id !== undefined) updateData.profesor_id = body.profesor_id;

    if (Object.keys(updateData).length > 0) {
      const { error } = await admin.from("clase").update(updateData).eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.horarios !== undefined) {
      await admin.from("horario").delete().eq("clase_id", body.id);

      if (body.horarios.length > 0) {
        const horariosData = body.horarios.map((h: string) => ({
          clase_id: body.id,
          fecha_hora: h,
        }));
        const { error: horariosError } = await admin.from("horario").insert(horariosData);
        if (horariosError) console.error("Error updating horarios:", horariosError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    await admin.from("clase_usuario").delete().eq("clase_id", id);
    await admin.from("horario").delete().eq("clase_id", id);
    const { error } = await admin.from("clase").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const body = await request.json();

    if (body.accion === "registrar-asistencia") {
      const { clase_id, usuario_id, asistencia } = body;
      if (!clase_id || !usuario_id) {
        return NextResponse.json({ error: "clase_id y usuario_id requeridos" }, { status: 400 });
      }

      const estado = asistencia ? "asistio" : "no_asistio";

      const { data: existing } = await admin
        .from("clase_usuario")
        .select("id")
        .eq("clase_id", clase_id)
        .eq("usuario_id", usuario_id)
        .maybeSingle();

      if (existing) {
        await admin.from("clase_usuario").update({ asistencia: estado }).eq("id", existing.id);
      } else {
        await admin.from("clase_usuario").insert({ clase_id, usuario_id, asistencia: estado });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
