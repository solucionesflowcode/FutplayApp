import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: usuario } = await supabase.from("usuario").select("rol").eq("id", user.id).single();
  return usuario?.rol === "administrador" ? user : null;
}

export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "capsulas";

  try {
    const admin = getAdminClient();

    if (tipo === "modulos") {
      const { data } = await admin.from("modulo").select("id, nombre").order("nombre");
      return NextResponse.json(data || []);
    }

    let capsulas: any[];
    let capsulasError: any;

    const result = await admin
      .from("capsula")
      .select("id, titulo, imagen, creado, duracion, modulo_id, bunny_video_id, order_index, profesor_id")
      .order("order_index");

    if (result.error) {
      const fallback = await admin
        .from("capsula")
        .select("id, titulo, imagen, creado, duracion, modulo_id, bunny_video_id, order_index")
        .order("order_index");
      capsulas = fallback.data || [];
      capsulasError = fallback.error;
    } else {
      capsulas = result.data || [];
    }

    if (capsulasError) return NextResponse.json({ error: capsulasError.message }, { status: 500 });

    const moduloIds = [...new Set(capsulas.map((c) => c.modulo_id).filter(Boolean))];
    const profesorIds = [...new Set(capsulas.map((c) => c.profesor_id).filter(Boolean))];

    const [{ data: modulos }, { data: profesores }] = await Promise.all([
      moduloIds.length > 0
        ? admin.from("modulo").select("id, nombre").in("id", moduloIds)
        : Promise.resolve({ data: [] }),
      profesorIds.length > 0
        ? admin.from("usuario").select("id, nombre").in("id", profesorIds)
        : Promise.resolve({ data: [] }),
    ]);

    const moduloMap = new Map((modulos || []).map((m) => [m.id, m.nombre]));
    const profesorMap = new Map((profesores || []).map((p) => [p.id, p.nombre]));

    return NextResponse.json(capsulas.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      imagen: c.imagen || "",
      creado: c.creado || "",
      duracion: c.duracion,
      modulo_id: c.modulo_id,
      modulo_nombre: c.modulo_id ? moduloMap.get(c.modulo_id) || "" : "",
      profesor_id: c.profesor_id ?? null,
      profesor_nombre: c.profesor_id ? profesorMap.get(c.profesor_id) || "" : "",
      bunny_video_id: c.bunny_video_id,
      order_index: c.order_index,
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

    if (!body.titulo) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const insertData: any = {
      titulo: body.titulo,
      imagen: body.imagen || null,
      creado: body.creado || null,
      duracion: body.duracion || null,
      modulo_id: body.modulo_id || null,
      bunny_video_id: body.bunny_video_id || null,
      order_index: body.order_index ?? null,
    };
    if (body.profesor_id !== undefined) insertData.profesor_id = body.profesor_id;

    const { data, error } = await admin
      .from("capsula")
      .insert(insertData)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
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
    if (body.imagen !== undefined) updateData.imagen = body.imagen;
    if (body.creado !== undefined) updateData.creado = body.creado;
    if (body.duracion !== undefined) updateData.duracion = body.duracion;
    if (body.modulo_id !== undefined) updateData.modulo_id = body.modulo_id;
    if (body.bunny_video_id !== undefined) updateData.bunny_video_id = body.bunny_video_id;
    if (body.order_index !== undefined) updateData.order_index = body.order_index;
    if (body.profesor_id !== undefined) updateData.profesor_id = body.profesor_id;

    const { error } = await admin.from("capsula").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

    const { error } = await admin.from("capsula").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
