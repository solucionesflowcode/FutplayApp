import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";
import { crearMembresiaPorBoleta } from "@/lib/membresia-pago";

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[Flow Webhook] Falta SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Config error" }, { status: 500 });
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  const boletaId = new URL(request.url).searchParams.get("boletaId");

  const contentType = request.headers.get("content-type") || "";
  let token = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    token = params.get("token") || "";
  } else if (contentType.includes("application/json")) {
    const body = await request.json();
    token = body.token || "";
  } else {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  try {
    let statusData;
    try {
      statusData = await getFlowPaymentStatus(token);
    } catch {
      const isSandbox = process.env.NEXT_PUBLIC_FLOW_SANDBOX === "true";
      if (!isSandbox) {
        console.error(`[Flow Webhook] getStatus falló en producción — devolviendo 502 para reintento`);
        return NextResponse.json({ error: "Error al verificar pago con Flow" }, { status: 502 });
      }
      if (!boletaId) {
        console.error(`[Flow Webhook] getStatus falló en sandbox y no hay boletaId en URL`);
        return NextResponse.json({ message: "OK" });
      }
      console.log(`[Flow Webhook] Sandbox: getStatus falló, usando boletaId=${boletaId} de URL (generada por servidor)`);
      statusData = { status: 2, commerceOrder: boletaId };
    }

    const orderId = statusData.commerceOrder;

    if (statusData.status === 2) {
      const { data: boleta, error: findError } = await adminClient
        .from("boleta")
        .select("id, estado, recurrencia_id, usuario_id")
        .eq("id", orderId)
        .single();

      if (findError || !boleta) {
        console.error(`[Flow Webhook] Boleta no encontrada: ${orderId}`);
        return NextResponse.json({ error: "Boleta no encontrada" }, { status: 404 });
      }

      // Los cobros recurrentes no están soportados: una notificación repetida
      // de una boleta ya pagada NO genera boletas ni membresías nuevas (antes
      // cualquiera podía reenviar el webhook con su token y sumar membresías).
      if (boleta.recurrencia_id) {
        console.warn(`[Flow Webhook] Boleta ${boleta.id} tiene recurrencia ${boleta.recurrencia_id}: cobros recurrentes no soportados, se procesa como pago único`);
      }

      // Flow (getStatus) es la fuente de verdad: si confirma el pago, la boleta
      // queda pagada aunque el frontend la haya anulado antes (el alumno pagó
      // pero no volvió por urlReturn y /planes canceló la boleta "huérfana").
      if (boleta.estado !== "pagado") {
        const { data: updated, error: updateError } = await adminClient
          .from("boleta")
          .update({ estado: "pagado" })
          .eq("id", boleta.id)
          .neq("estado", "pagado")
          .select("id")
          .maybeSingle();

        if (updateError) {
          console.error(`[Flow Webhook] Error al actualizar boleta:`, updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        if (updated) {
          console.log(`[Flow Webhook] Boleta ${boleta.id} marcada como pagada (estado anterior: ${boleta.estado})`);
        }
      }

      // Asegurar la membresía en cada notificación (idempotente por boleta_id):
      // si un intento anterior falló al crearla, este la repara. Si falla,
      // se responde 500 para que Flow reintente la notificación.
      const res = await crearMembresiaPorBoleta(adminClient, boleta.id, boleta.usuario_id);
      if (res.creada) {
        console.log(`[Flow Webhook] Membresía ${res.liga ? "liga (inactiva) " : ""}creada para usuario ${boleta.usuario_id}`);
      } else if (res.motivo === "ya_existe") {
        console.log(`[Flow Webhook] Membresía ya existe para boleta ${boleta.id}`);
      } else if (res.motivo === "error") {
        console.error(`[Flow Webhook] Error al crear membresía para boleta ${boleta.id}: ${res.error}`);
        return NextResponse.json({ error: "Error al crear membresía" }, { status: 500 });
      } else {
        console.error(`[Flow Webhook] Boleta ${boleta.id} pagada sin membresía: ${res.motivo}`);
      }
    } else if (statusData.status === 3 || statusData.status === 4) {
      const { data: boleta, error: findError } = await adminClient
        .from("boleta")
        .select("id, recurrencia_id, usuario_id")
        .eq("id", orderId)
        .single();

      if (findError || !boleta) {
        console.error(`[Flow Webhook] Boleta para rechazar no encontrada: ${orderId}`);
        return NextResponse.json({ message: "OK" });
      }

      const { error: updateError } = await adminClient
        .from("boleta")
        .update({ estado: "rechazado" })
        .eq("id", boleta.id)
        .eq("estado", "pendiente");

      if (updateError) {
        console.error(`[Flow Webhook] Error al rechazar boleta:`, updateError);
      }

      if (boleta.recurrencia_id) {
        await adminClient
          .from("recurrencia")
          .update({ activa: false })
          .eq("id", boleta.recurrencia_id)
          .eq("activa", true);
        console.error(
          `[Flow Webhook] ALERTA: Cobro recurrente falló para usuario ${boleta.usuario_id}, recurrencia ${boleta.recurrencia_id} desactivada (status ${statusData.status})`
        );
      } else {
        console.log(`[Flow Webhook] Boleta ${boleta.id} marcada como rechazada (status ${statusData.status})`);
      }
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[Flow Webhook] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
