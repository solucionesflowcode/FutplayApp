import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";

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
  let commerceOrder = "";
  let flowStatus = 0;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    console.log(`[Flow Webhook] Raw body: ${text}`);
    const params = new URLSearchParams(text);
    token = params.get("token") || "";
    commerceOrder = params.get("commerceOrder") || "";
    flowStatus = parseInt(params.get("status") || "0", 10);
  } else if (contentType.includes("application/json")) {
    const body = await request.json();
    console.log(`[Flow Webhook] JSON body: ${JSON.stringify(body)}`);
    token = body.token || "";
    commerceOrder = body.commerceOrder || "";
    flowStatus = parseInt(body.status || "0", 10);
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
      if (flowStatus && commerceOrder) {
        statusData = { status: flowStatus, commerceOrder };
      } else if (boletaId) {
        const isSandbox = process.env.NEXT_PUBLIC_FLOW_SANDBOX !== "false";
        console.log(`[Flow Webhook] getStatus falló — usando boletaId de URL (sandbox=${isSandbox})`);
        if (isSandbox) {
          statusData = { status: 2, commerceOrder: boletaId };
        } else {
          console.error(`[Flow Webhook] getStatus falló en producción para boleta ${boletaId}`);
          return NextResponse.json({ message: "OK" });
        }
      } else {
        console.error(`[Flow Webhook] getStatus falló y no hay datos en POST`);
        return NextResponse.json({ message: "OK" });
      }
    }

    const orderId = statusData.commerceOrder || commerceOrder;

    if (statusData.status === 2) {
      const { data: boleta, error: findError } = await adminClient
        .from("boleta")
        .select("id, estado, recurrencia_id, usuario_id")
        .eq("id", orderId)
        .single();

      if (findError || !boleta) {
        // Puede ser un cobro recurrente donde la boleta original fue eliminada
        console.error(`[Flow Webhook] Boleta no encontrada: ${orderId}`);
        return NextResponse.json({ error: "Boleta no encontrada" }, { status: 404 });
      }

      // ── Cobro recurrente: boleta ya pagada y tiene recurrencia ──
      if (boleta.estado === "pagado" && boleta.recurrencia_id) {
        const { data: recurrencia } = await adminClient
          .from("recurrencia")
          .select("usuario_id, plan_id, activa")
          .eq("id", boleta.recurrencia_id)
          .single();

        if (recurrencia?.activa) {
          const { data: plan } = await adminClient
            .from("plan")
            .select("precio")
            .eq("id", recurrencia.plan_id)
            .single();

          if (plan) {
            const { data: newBoleta } = await adminClient
              .from("boleta")
              .insert({
                usuario_id: recurrencia.usuario_id,
                estado: "pendiente",
                total: plan.precio,
                recurrencia_id: boleta.recurrencia_id,
              })
              .select("id")
              .single();

            if (newBoleta) {
              await adminClient.from("boleta_item").insert({
                boleta_id: newBoleta.id,
                plan_id: recurrencia.plan_id,
                cantidad: 1,
                precio: plan.precio,
                total: plan.precio,
              });

              await adminClient
                .from("boleta")
                .update({ estado: "pagado" })
                .eq("id", newBoleta.id);

              console.log(`[Flow Webhook] Cobro recurrente: nueva boleta ${newBoleta.id} creada y pagada`);
            }
          }
        }
        return NextResponse.json({ message: "OK" });
      }

      if (boleta.estado === "pagado") {
        return NextResponse.json({ message: "Ya procesado" });
      }

      const { error: updateError } = await adminClient
        .from("boleta")
        .update({ estado: "pagado" })
        .eq("id", boleta.id);

      if (updateError) {
        console.error(`[Flow Webhook] Error al actualizar boleta:`, updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log(`[Flow Webhook] Boleta ${boleta.id} marcada como pagada`);
    } else if (statusData.status === 3 || statusData.status === 4) {
      const { error: updateError } = await adminClient
        .from("boleta")
        .update({ estado: "rechazado" })
        .eq("id", orderId);

      if (updateError) {
        console.error(`[Flow Webhook] Error al rechazar boleta:`, updateError);
      }
      console.log(`[Flow Webhook] Boleta ${orderId} marcada como rechazada (status ${statusData.status})`);
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[Flow Webhook] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
