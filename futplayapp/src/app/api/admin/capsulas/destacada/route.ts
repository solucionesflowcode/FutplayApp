import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";
import { setCapsulaDestacadaId } from "@/lib/capsula-destacada";

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    const capsulaId: string | null = body.capsula_id ?? null;

    const ok = await setCapsulaDestacadaId(capsulaId);
    if (!ok) return NextResponse.json({ error: "Error al guardar" }, { status: 500 });

    return NextResponse.json({ success: true, capsula_id: capsulaId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
