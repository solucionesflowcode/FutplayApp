import { createServerClient } from "@supabase/ssr";

import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";
import { crearMembresiaPorBoleta } from "@/lib/membresia-pago";

async function crearMembresiaSiAplica(adminClient: ReturnType<typeof createServerClient>, boletaId: string) {
  try {
    const { data: boletaInfo } = await adminClient
      .from("boleta")
      .select("usuario_id")
      .eq("id", boletaId)
      .single();

    if (!boletaInfo?.usuario_id) return;

    const res = await crearMembresiaPorBoleta(adminClient, boletaId, boletaInfo.usuario_id);
    if (res.creada) {
      console.log(`[Flow Confirm] Membresía ${res.liga ? "liga (inactiva) " : ""}creada para boleta ${boletaId}`);
    } else if (res.motivo === "error") {
      console.error(`[Flow Confirm] Error al crear membresía: ${res.error}`);
    }
  } catch (err) {
    console.error(`[Flow Confirm] Error inesperado al crear membresía:`, err);
  }
}

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
            if (statusData.status === 3 || statusData.status === 4) {
                return NextResponse.json({ estado: "rechazado" });
            }
            if (statusData.status !== 2) {
                return NextResponse.json({ estado: "pendiente", message: "El pago está pendiente de confirmación." });
            }
            if (statusData.commerceOrder && String(statusData.commerceOrder) !== boletaId) {
                console.error(`[Flow Confirm] Mismatch: boletaId=${boletaId} !== commerceOrder=${statusData.commerceOrder}`);
                return NextResponse.json({ error: "Boleta no coincide con el pago" }, { status: 403 });
            }
            // Flow confirmó el pago: es la fuente de verdad, así que la boleta
            // queda pagada aunque el frontend la haya anulado antes.
            if (boleta.estado !== "pagado") {
                await adminClient
                    .from("boleta")
                    .update({ estado: "pagado" })
                    .eq("id", boletaId)
                    .neq("estado", "pagado");
            }
            // Siempre (idempotente): repara la membresía si el webhook marcó la
            // boleta como pagada pero falló al crearla.
            await crearMembresiaSiAplica(adminClient, boletaId);
            return NextResponse.json({ estado: "pagado" });
        } catch {
            // Sandbox: si getStatus falla, asumimos éxito
            const isSandbox = process.env.NEXT_PUBLIC_FLOW_SANDBOX === "true";
            if (isSandbox && boleta.estado !== "pagado") {
                const { data: updated } = await adminClient
                    .from("boleta")
                    .update({ estado: "pagado" })
                    .eq("id", boletaId)
                    .eq("estado", "pendiente")
                    .select("id")
                    .maybeSingle();
                if (updated) {
                    await crearMembresiaSiAplica(adminClient, boletaId);
                }
                return NextResponse.json({ estado: "pagado" });
            }
            // Producción: continuar para verificar estado en Supabase
        }
    } else {
        // Sin token real (sandbox: Flow no reemplazó {token})
        const isSandbox = process.env.NEXT_PUBLIC_FLOW_SANDBOX === "true";
        if (isSandbox && boleta.estado !== "pagado") {
            const { data: updated } = await adminClient
                .from("boleta")
                .update({ estado: "pagado" })
                .eq("id", boletaId)
                .eq("estado", "pendiente")
                .select("id")
                .maybeSingle();
            if (updated) {
                await crearMembresiaSiAplica(adminClient, boletaId);
            }
            return NextResponse.json({ estado: "pagado" });
        }
    }

    if (boleta.estado === "pagado") {
        await crearMembresiaSiAplica(adminClient, boletaId);
        return NextResponse.json({ estado: "pagado" });
    }

    if (boleta.estado === "rechazado" || boleta.estado === "anulado") {
        return NextResponse.json({ estado: boleta.estado });
    }

    return NextResponse.json({ estado: "pendiente", message: "El pago está pendiente de confirmación." });
}
