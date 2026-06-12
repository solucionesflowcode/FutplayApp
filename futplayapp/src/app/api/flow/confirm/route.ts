import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const boletaId = searchParams.get("boletaId");

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

    // First check if the boleta exists
    const { data: boleta } = await adminClient
        .from("boleta")
        .select("id, estado")
        .eq("id", boletaId)
        .single();

    if (!boleta) {
        return NextResponse.json({ error: "Boleta no encontrada" }, { status: 404 });
    }

    // If we have a real token (not the literal "{token}" that Flow failed to replace),
    // verify the payment directly with Flow API
    if (token && token !== "{token}") {
        try {
            const statusData = await getFlowPaymentStatus(token);
            if (statusData.status !== 2) {
                return NextResponse.json({ estado: "rechazado" });
            }
            if (statusData.commerceOrder && statusData.commerceOrder !== boletaId) {
                console.error(`[Flow Confirm] Mismatch: boletaId=${boletaId} !== commerceOrder=${statusData.commerceOrder}`);
                return NextResponse.json({ error: "Boleta no coincide con el pago" }, { status: 403 });
            }
            if (boleta.estado !== "pagado") {
                await adminClient.from("boleta").update({ estado: "pagado" }).eq("id", boletaId);
            }
            return NextResponse.json({ estado: "pagado" });
        } catch {
            // getStatus falló — continuar para verificar en Supabase
        }
    }

    if (boleta.estado === "pagado") {
        return NextResponse.json({ estado: "pagado" });
    }

    return NextResponse.json({ estado: "pendiente", message: "El pago está pendiente de confirmación." });
}
