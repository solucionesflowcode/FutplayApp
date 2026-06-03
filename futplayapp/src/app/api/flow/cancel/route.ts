import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { boletaId } = await request.json();

    if (!boletaId) {
        return NextResponse.json({ error: "boletaId requerido" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        return NextResponse.json({ error: "Config error" }, { status: 500 });
    }

    const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { cookies: { getAll() { return []; }, setAll() {} } }
    );

    const { data: boleta } = await adminClient
        .from("boleta")
        .select("id, estado")
        .eq("id", boletaId)
        .single();

    if (!boleta) {
        return NextResponse.json({ error: "Boleta no encontrada" }, { status: 404 });
    }

    if (boleta.estado !== "pendiente") {
        return NextResponse.json({ estado: boleta.estado, message: "No requiere cancelación" });
    }

    const { error: updateError } = await adminClient
        .from("boleta")
        .update({ estado: "anulado" })
        .eq("id", boleta.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ estado: "anulado" });
}
