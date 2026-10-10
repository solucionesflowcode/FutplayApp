import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";


export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "clases";

  try {
    const admin = await getAdminClient();

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

      // Se listan TODAS las inscripciones, sin filtrar por estado: el detalle
      // de una clase debe mostrar también a los alumnos cancelados.
      const { data: inscripciones } = await admin
        .from("clase_usuario")
        .select("id, usuario_id, asistencia")
        .eq("clase_id", claseId);

      const userIds = [...new Set((inscripciones || []).map((i) => i.usuario_id))];
      const { data: usuarios } = await admin.from("usuario").select("id, nombre").in("id", userIds);
      const usuarioMap = new Map((usuarios || []).map((u) => [u.id, u.nombre]));

      return NextResponse.json({
        clase,
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

    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    const claseIds = (clases || []).map((c) => c.id);

    const { data: sedes } = await admin.from("sede").select("*");
    const sedeMap = new Map((sedes || []).map((s) => [s.id, s.nombre]));

    const profesorIds = [...new Set((clases || []).map((c) => c.profesor_id).filter(Boolean))];
    const { data: profesores } = profesorIds.length > 0
      ? await admin.from("usuario").select("id, nombre").in("id", profesorIds)
      : { data: [] };
    const profesorMap = new Map((profesores || []).map((p) => [p.id, p.nombre]));

    const { data: counts } = await admin
      .from("clase_usuario")
      .select("clase_id, asistencia")
      .in("clase_id", claseIds)
      .not("asistencia", "in", "('cancelado','cancelado_sin_reembolso')");

    type AsistenciaStats = { inscritos: number; presentes: number; ausentes: number; pendientes: number };
    const statsPorClase = new Map<string, AsistenciaStats>();
    (counts || []).forEach((cu) => {
      if (!statsPorClase.has(cu.clase_id)) {
        statsPorClase.set(cu.clase_id, { inscritos: 0, presentes: 0, ausentes: 0, pendientes: 0 });
      }
      const s = statsPorClase.get(cu.clase_id)!;
      s.inscritos++;
      if (cu.asistencia === "asistio") s.presentes++;
      else if (cu.asistencia === "no_asistio") s.ausentes++;
      else s.pendientes++;
    });

    return NextResponse.json((clases || []).map((c) => ({
      ...c,
      sede_nombre: sedeMap.get(c.sede_id) || "—",
      profesor_nombre: c.profesor_id ? profesorMap.get(c.profesor_id) || "" : "",
      inscritos: statsPorClase.get(c.id)?.inscritos || 0,
      presentes: statsPorClase.get(c.id)?.presentes || 0,
      ausentes: statsPorClase.get(c.id)?.ausentes || 0,
      pendientes: statsPorClase.get(c.id)?.pendientes || 0,
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (body.tipo_evento !== "partido" && (!body.titulo || !body.sede_id)) {
      return NextResponse.json({ error: "Faltan campos: titulo, sede_id" }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      tipo_evento: body.tipo_evento || "entrenamiento",
    };
    if (body.tipo_evento !== "partido") {
      insertData.titulo = body.titulo;
      insertData.descripcion = body.descripcion || "";
      insertData.sede_id = body.sede_id;
      insertData.cupo_maximo = body.cupo_maximo || 15;
      if (body.profesor_id !== undefined) insertData.profesor_id = body.profesor_id;
      if (body.fecha_hora) insertData.fecha_hora = body.fecha_hora;
    } else {
      insertData.titulo = null;
      insertData.sede_id = body.sede_id || null;
      insertData.cupo_maximo = body.cupo_maximo || 15;
      insertData.profesor_id = null;
      insertData.descripcion = body.descripcion || "";
      if (body.fecha_hora) insertData.fecha_hora = body.fecha_hora;
    }

    const { data: clase, error } = await admin
      .from("clase")
      .insert(insertData)
      .select()
      .single();

    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json(clase);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (body.tipo_evento === "partido") {
      updateData.titulo = null;
      updateData.sede_id = body.sede_id || null;
      if (body.cupo_maximo !== undefined) updateData.cupo_maximo = body.cupo_maximo;
      updateData.profesor_id = null;
    } else {
      if (body.titulo !== undefined) updateData.titulo = body.titulo;
      if (body.sede_id !== undefined) updateData.sede_id = body.sede_id;
      if (body.cupo_maximo !== undefined) updateData.cupo_maximo = body.cupo_maximo;
      if (body.profesor_id !== undefined) updateData.profesor_id = body.profesor_id;
    }
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.fecha_hora !== undefined) updateData.fecha_hora = body.fecha_hora;
    if (body.tipo_evento !== undefined) updateData.tipo_evento = body.tipo_evento;

    if (Object.keys(updateData).length > 0) {
      const { error } = await admin.from("clase").update(updateData).eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Los partidos no descuentan tokens y en una clase ya realizada los tokens
    // se consumieron: en ambos casos no se devuelve nada. Misma regla que el
    // trigger devolver_tokens_al_borrar_clase.
    const { data: claseInfo } = await admin.from("clase").select("tipo_evento, fecha_hora").eq("id", id).maybeSingle();
    const esPartido = claseInfo?.tipo_evento === "partido";
    const yaOcurrio = claseInfo?.fecha_hora ? new Date(claseInfo.fecha_hora) <= new Date() : false;
    const devuelveTokens = !esPartido && !yaOcurrio;

    // Cuántos tokens corresponde devolver (antes de borrar): solo inscripciones
    // aún activas. Antes contaba también cancelado_sin_reembolso y asistencias.
    const { count: conToken } = devuelveTokens
      ? await admin.from("clase_usuario")
          .select("id", { count: "exact", head: true })
          .eq("clase_id", id)
          .or("asistencia.is.null,asistencia.in.(sin_confirmar,pendiente,confirmado_whatsapp)")
      : { count: 0 };

    // CASCADE DELETE removes clase_usuario records; the DB trigger
    // handles returning tokens automatically — no RPC call needed.
    const { error: delError } = await admin.from("clase").delete().eq("id", id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });

    // Calcular cuántos tokens se devolvieron vs. no se pudieron devolver
    let devueltos = 0, noDevueltos = 0;
    if (devuelveTokens) {
      const { count: fallidos } = await admin.from("tokens_no_devueltos")
        .select("id", { count: "exact", head: true }).eq("clase_id", id);
      noDevueltos = fallidos ?? 0;
      devueltos = Math.max((conToken ?? 0) - noDevueltos, 0);
    }

    return NextResponse.json({ success: true, tokens_devueltos: devueltos, tokens_no_devueltos: noDevueltos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (body.accion === "registrar-asistencia") {
      const { clase_id, usuario_id, asistencia } = body;
      if (!clase_id || !usuario_id) {
        return NextResponse.json({ error: "clase_id y usuario_id requeridos" }, { status: 400 });
      }

      const estado = asistencia ? "asistio" : "no_asistio";

      const { data: existing, error: findError } = await admin
        .from("clase_usuario")
        .select("id")
        .eq("clase_id", clase_id)
        .eq("usuario_id", usuario_id)
        .maybeSingle();

      if (findError) return NextResponse.json({ error: traducirError(findError.message) }, { status: 500 });

      // Solo se marca asistencia de alumnos inscritos. Antes, si no existía la
      // inscripción, se creaba una (el trigger cobraba un token o fallaba) y
      // la respuesta era success igual.
      if (!existing) {
        return NextResponse.json({ error: "El alumno no está inscrito en esta clase" }, { status: 404 });
      }

      const { error: updateError } = await admin
        .from("clase_usuario")
        .update({ asistencia: estado })
        .eq("id", existing.id);

      if (updateError) return NextResponse.json({ error: traducirError(updateError.message) }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
