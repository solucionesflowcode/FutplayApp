import { createServerClient } from "@supabase/ssr";
<<<<<<< HEAD
import { cookies } from "next/headers";
=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";

export async function GET(request: Request) {
<<<<<<< HEAD
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() {},
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
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

<<<<<<< HEAD
    const { data: boleta } = await adminClient
        .from("boleta")
        .select("id, estado, usuario_id")
=======
    // First check if the boleta exists
    const { data: boleta } = await adminClient
        .from("boleta")
        .select("id, estado")
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
        .eq("id", boletaId)
        .single();

    if (!boleta) {
        return NextResponse.json({ error: "Boleta no encontrada" }, { status: 404 });
    }

<<<<<<< HEAD
    if (boleta.usuario_id !== user.id) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
    // If we have a real token (not the literal "{token}" that Flow failed to replace),
    // verify the payment directly with Flow API
    if (token && token !== "{token}") {
        try {
            const statusData = await getFlowPaymentStatus(token);
            if (statusData.status !== 2) {
                return NextResponse.json({ estado: "rechazado" });
            }
            if (statusData.commerceOrder && String(statusData.commerceOrder) !== boletaId) {
                console.error(`[Flow Confirm] Mismatch: boletaId=${boletaId} !== commerceOrder=${statusData.commerceOrder}`);
                return NextResponse.json({ error: "Boleta no coincide con el pago" }, { status: 403 });
            }
            if (boleta.estado !== "pagado") {
                const { data: updated } = await adminClient
                    .from("boleta")
                    .update({ estado: "pagado" })
                    .eq("id", boletaId)
                    .eq("estado", "pendiente")
                    .select("id")
                    .maybeSingle();

                if (!updated) {
                    const { data: current } = await adminClient
                        .from("boleta")
                        .select("estado")
                        .eq("id", boletaId)
                        .single();
                    return NextResponse.json({ estado: current?.estado || "pagado" });
                }
            }
            return NextResponse.json({ estado: "pagado" });
        } catch {
            // getStatus falló — continuar para verificar en Supabase
        }
    }

    if (boleta.estado === "pagado") {
        return NextResponse.json({ estado: "pagado" });
    }

    if (boleta.estado === "rechazado" || boleta.estado === "anulado") {
        return NextResponse.json({ estado: boleta.estado });
    }

    return NextResponse.json({ estado: "pendiente", message: "El pago está pendiente de confirmación." });
}
