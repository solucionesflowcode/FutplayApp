import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const boletaId = searchParams.get("boletaId");

    if (!token || !boletaId) {
        return NextResponse.json({ error: "token y boletaId requeridos" }, { status: 400 });
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

    // Verificar pago con Flow API
    try {
        const statusData = await getFlowPaymentStatus(token);
        if (statusData.status !== 2) {
            return NextResponse.json({ estado: "rechazado" });
        }
    } catch {
        // getStatus falló (sandbox code 105 o token inválido).
        // Verificar si el webhook ya procesó la boleta.
        const { data: boleta } = await adminClient
            .from("boleta")
            .select("estado")
            .eq("id", boletaId)
            .single();

        if (boleta?.estado === "pagado") {
            return NextResponse.json({ estado: "pagado" });
        }
        return NextResponse.json({ estado: "pendiente", message: "No se pudo verificar el pago. Se confirmará automáticamente." });
    }

    const { data: boleta } = await adminClient
        .from("boleta")
        .select("id, estado")
        .eq("id", boletaId)
        .single();

    if (!boleta) {
        return NextResponse.json({ error: "Boleta no encontrada" }, { status: 404 });
    }

    if (boleta.estado === "pagado") {
        return NextResponse.json({ estado: "pagado", message: "Ya procesado" });
    }

    const { error: updateError } = await adminClient
        .from("boleta")
        .update({ estado: "pagado" })
        .eq("id", boleta.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ estado: "pagado" });
}
