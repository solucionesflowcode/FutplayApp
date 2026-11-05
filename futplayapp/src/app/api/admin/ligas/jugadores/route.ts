import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

/** número de camiseta: vacío → null; fuera de 0-99 → error. */
function numeroCamiseta(valor: unknown): number | null | "invalido" {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : "invalido";
}

async function equipoDeLiga(admin: AdminClient, equipoId: string, ligaId: string) {
  const { data } = await admin.from("liga_equipo").select("id").eq("id", equipoId).eq("liga_id", ligaId).maybeSingle();
  return !!data;
}

async function respuestaYaInscrito(admin: AdminClient, ligaId: string, usuarioId: string) {
  const { data } = await admin
    .from("liga_jugador")
    // La FK a liga_equipo es compuesta (equipo_id, liga_id): se embebe por nombre de tabla.
    .select("equipo:liga_equipo (nombre)")
    .eq("liga_id", ligaId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const equipo = (data?.equipo as { nombre?: string } | null)?.nombre;
  return NextResponse.json(
    { error: equipo ? `El jugador ya está en el equipo "${equipo}" de esta liga` : "El jugador ya está inscrito en esta liga" },
    { status: 409 }
  );
}

// GET ?buscar=<texto>&liga_id=<id> → jugadores (rol jugador) por nombre o email.
// Marca con equipo_id a los que ya están en la liga.
export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    // Sin caracteres que rompan el filtro .or() de PostgREST.
    const texto = (searchParams.get("buscar") || "").replace(/[,()*%\\]/g, " ").trim();
    const ligaId = searchParams.get("liga_id");
    if (texto.length < 2) return NextResponse.json({ error: "Ingresa al menos 2 caracteres" }, { status: 400 });

    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("usuario")
      .select("id, nombre, email, foto_url, posicion")
      .eq("rol", "jugador")
      .or(`nombre.ilike.%${texto}%,email.ilike.%${texto}%`)
      .order("nombre")
      .limit(15);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    let inscritos = new Map<string, string>();
    if (ligaId && data?.length) {
      const { data: filas } = await admin
        .from("liga_jugador")
        .select("usuario_id, equipo_id")
        .eq("liga_id", ligaId)
        .in("usuario_id", data.map((u) => u.id));
      inscritos = new Map((filas || []).map((f) => [f.usuario_id, f.equipo_id]));
    }

    return NextResponse.json((data || []).map((u) => ({ ...u, equipo_id: inscritos.get(u.id) ?? null })));
  } catch (err) {
    return error500(err);
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.liga_id || !body.equipo_id || !body.usuario_id) {
      return NextResponse.json({ error: "Faltan campos: liga_id, equipo_id, usuario_id" }, { status: 400 });
    }
    const numero = numeroCamiseta(body.numero);
    if (numero === "invalido") return NextResponse.json({ error: "El número debe estar entre 0 y 99" }, { status: 400 });

    const admin = await getAdminClient();
    if (!(await equipoDeLiga(admin, body.equipo_id, body.liga_id))) {
      return NextResponse.json({ error: "El equipo no pertenece a esta liga" }, { status: 400 });
    }

    const { data: usuario } = await admin.from("usuario").select("rol").eq("id", body.usuario_id).maybeSingle();
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (usuario.rol !== "jugador") return NextResponse.json({ error: "Solo se pueden inscribir usuarios con rol jugador" }, { status: 400 });

    const { data, error } = await admin
      .from("liga_jugador")
      .insert({ liga_id: body.liga_id, equipo_id: body.equipo_id, usuario_id: body.usuario_id, numero })
      .select()
      .single();
    if (error) {
      if (/duplicate key|unique constraint/i.test(error.message)) return respuestaYaInscrito(admin, body.liga_id, body.usuario_id);
      return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return error500(err);
  }
}

// Cambia el número o mueve al jugador a otro equipo de la misma liga.
export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { data: fila } = await admin.from("liga_jugador").select("liga_id").eq("id", body.id).maybeSingle();
    if (!fila) return NextResponse.json({ error: "Jugador no encontrado en la liga" }, { status: 404 });

    const datos: Record<string, unknown> = {};
    if (body.numero !== undefined) {
      const numero = numeroCamiseta(body.numero);
      if (numero === "invalido") return NextResponse.json({ error: "El número debe estar entre 0 y 99" }, { status: 400 });
      datos.numero = numero;
    }
    if (body.equipo_id !== undefined) {
      if (!(await equipoDeLiga(admin, body.equipo_id, fila.liga_id))) {
        return NextResponse.json({ error: "El equipo no pertenece a esta liga" }, { status: 400 });
      }
      datos.equipo_id = body.equipo_id;
    }
    if (Object.keys(datos).length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    const { error } = await admin.from("liga_jugador").update(datos).eq("id", body.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { error } = await admin.from("liga_jugador").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}
