import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createFlowOrder } from "@/lib/flow";
import { rateLimit } from "@/lib/rate-limit";
import { getBaseUrl } from "@/lib/base-url";
import { traducirError } from "@/lib/errores";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { allowed, remaining } = rateLimit(`create-order:${user.id}`, 5, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 }
    );
  }

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, email")
    .eq("id", user.id)
    .single();

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const body = await request.json();
  // `recurrencia` se ignora a propósito: los cobros recurrentes no están
  // soportados (el webhook no los procesa). Antes se aceptaba desde el body
  // y abría una vía para generar membresías reenviando el webhook.
  const { planId, acceso: tokenAcceso } = body;

  if (!planId) {
    return NextResponse.json({ error: "planId es requerido" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local" },
      { status: 500 }
    );
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );

  const { data: plan, error: planError } = await adminClient
    .from("plan")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  // Plan Liga: pago único, comprable aunque haya membresía vigente.
  const esLiga = plan.tipo_plan === "liga";

  // Los planes familiares y liga solo se pueden comprar con el link del admin:
  // exigir el codigo_acceso correcto (verificación server-side).
  if (plan.tipo_plan === "familiar" || esLiga) {
    if (!tokenAcceso || tokenAcceso !== plan.codigo_acceso) {
      return NextResponse.json(
        { error: "Este plan solo puede comprarse con un link de acceso válido." },
        { status: 403 }
      );
    }
  }

  // Regla centralizada: la misma función que usa el trigger.
  // Falla cerrado — si la consulta falla, NO se permite comprar.
  if (!esLiga) {
    const { data: tieneVigente, error: vigError } = await adminClient
      .rpc("usuario_tiene_membresia_vigente", { p_usuario_id: user.id });
    if (vigError) {
      console.error("No se pudo verificar la membresía vigente:", vigError.message);
      return NextResponse.json(
        { error: "No se pudo procesar la compra. Intenta de nuevo." },
        { status: 500 }
      );
    }
    if (tieneVigente === true) {
      return NextResponse.json(
        { error: "Ya tienes una membresía vigente. Podrás comprar otra cuando se agoten tus tokens o venza tu plan." },
        { status: 409 }
      );
    }
  }

  const { data: boleta, error: boletaError } = await adminClient
    .from("boleta")
    .insert({
      usuario_id: usuario.id,
      estado: "pendiente",
      total: plan.precio,
      flow_confirmada: false,
    })
    .select()
    .single();

  if (boletaError || !boleta) {
    return NextResponse.json(
      { error: `Error al crear boleta: ${boletaError?.message}` },
      { status: 500 }
    );
  }

  const { error: itemError } = await adminClient
    .from("boleta_item")
    .insert({
      boleta_id: boleta.id,
      plan_id: plan.id,
      cantidad: 1,
      precio: plan.precio,
      total: plan.precio,
    });

  if (itemError) {
    await adminClient.from("boleta").delete().eq("id", boleta.id);
    return NextResponse.json(
      { error: `Error al crear item: ${itemError.message}` },
      { status: 500 }
    );
  }

  // Base canónica para callbacks de Flow (webhook + retorno):
  // futplay.cl si NEXT_PUBLIC_BASE_URL está bien configurada,
  // o el dominio real por el que el usuario está navegando.
  const publicUrl = getBaseUrl(request);

  try {
    const flowOrder = await createFlowOrder({
      commerceOrder: boleta.id,
      subject: `FutPlay - ${plan.nombre}`,
      amount: plan.precio,
      email: usuario.email,
      urlConfirmation: `${publicUrl}/api/flow/webhook?boletaId=${boleta.id}`,
      urlReturn: `${publicUrl}/api/flow/return`,
      timeout: 1800,
      paymentMethod: 1, // solo tarjetas crédito + débito
    });

    await adminClient
      .from("boleta")
      .update({ transaccion_id: String(flowOrder.flowOrder), flow_confirmada: true })
      .eq("id", boleta.id);

    return NextResponse.json({
      url: `${flowOrder.url}?token=${flowOrder.token}`,
      flowOrder: flowOrder.flowOrder,
      boletaId: boleta.id,
    });
  } catch (error) {
    await adminClient.from("boleta_item").delete().eq("boleta_id", boleta.id);
    await adminClient.from("boleta").delete().eq("id", boleta.id);

    // Log de diagnóstico para Vercel: captura el endpoint y config de Flow.
    console.error("[create-order] Error al crear orden Flow:", {
      planId: plan?.id,
      planNombre: plan?.nombre,
      sandbox: process.env.NEXT_PUBLIC_FLOW_SANDBOX === "true",
      apiKeyConfigurada: Boolean(process.env.FLOW_API_KEY),
      secretConfigurado: Boolean(process.env.FLOW_SECRET_KEY),
      urlBase: publicUrl,
      error: error instanceof Error ? error.message : String(error),
    });

    const message = error instanceof Error ? error.message : "Error al conectar con Flow";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
