import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { borrarArchivosDocumentos } from "@/lib/limpieza-capsula";

export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const capsula_id = searchParams.get("capsula_id");

  if (!capsula_id) {
    return NextResponse.json({ error: "capsula_id requerido" }, { status: 400 });
  }

  try {
    const admin = await getAdminClient();
    const { data, error } = await admin
      .from("documento")
      .select("*")
      .eq("capsula_id", capsula_id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();
    const { capsula_id, nombre, url_archivo } = body;

    if (!capsula_id || !nombre || !url_archivo) {
      return NextResponse.json({ error: "capsula_id, nombre y url_archivo son requeridos" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("documento")
      .insert({ capsula_id, nombre, url_archivo })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  try {
    const admin = await getAdminClient();
    const { data: doc } = await admin.from("documento").select("url_archivo").eq("id", id).maybeSingle();
    const { error } = await admin.from("documento").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // CAP-05: también el archivo; si falla, el documento ya no se muestra y solo se avisa.
    const aviso = doc ? await borrarArchivosDocumentos(admin, [doc.url_archivo as string]) : null;
    return NextResponse.json({ success: true, avisos: aviso ? [aviso] : [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
