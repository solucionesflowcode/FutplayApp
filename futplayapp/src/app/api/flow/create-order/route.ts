import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createFlowOrder } from "@/lib/flow";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
  const { planId, recurrencia: conRecurrencia } = body;

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
        setAll() {},
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

  const { data: existingMembresia } = await adminClient
    .from("membresia")
    .select("id, mes")
    .eq("usuario_id", usuario.id)
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingMembresia) {
    const mesDate = new Date(existingMembresia.mes + "T00:00:00");
    const vencimiento = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0);
    if (vencimiento >= new Date()) {
      return NextResponse.json(
        { error: "Ya tienes un plan activo. No puedes comprar otro hasta que termine el período actual." },
        { status: 409 }
      );
    }
  }

  let recurrenciaId: string | null = null;
  if (conRecurrencia) {
    const { data: rec, error: recError } = await adminClient
      .from("recurrencia")
      .insert({ usuario_id: usuario.id, plan_id: plan.id })
      .select("id")
      .single();

    if (recError || !rec) {
      return NextResponse.json(
        { error: `Error al crear recurrencia: ${recError?.message}` },
        { status: 500 }
      );
    }
    recurrenciaId = rec.id;
  }

  const { data: boleta, error: boletaError } = await adminClient
    .from("boleta")
    .insert({
      usuario_id: usuario.id,
      estado: "pendiente",
      total: plan.precio,
      recurrencia_id: recurrenciaId,
    })
    .select()
    .single();

  if (boletaError || !boleta) {
    if (recurrenciaId) {
      await adminClient.from("recurrencia").delete().eq("id", recurrenciaId);
    }
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
    if (recurrenciaId) {
      await adminClient.from("recurrencia").delete().eq("id", recurrenciaId);
    }
    return NextResponse.json(
      { error: `Error al crear item: ${itemError.message}` },
      { status: 500 }
    );
  }

  const publicUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const flowOrder = await createFlowOrder({
      commerceOrder: boleta.id,
      subject: `FutPlay - ${plan.nombre}`,
      amount: plan.precio,
      email: usuario.email,
      urlConfirmation: `${publicUrl}/api/flow/webhook`,
      urlReturn: `http://localhost:3000/pagos?token={token}`,
      timeout: 1800,
      paymentMethod: 1, // solo tarjetas crédito + débito
      ...(conRecurrencia ? { recurrence: { period: 30 } } : {}),
    });

    await adminClient
      .from("boleta")
      .update({ transaccion_id: String(flowOrder.flowOrder) })
      .eq("id", boleta.id);

    return NextResponse.json({
      url: `${flowOrder.url}?token=${flowOrder.token}`,
      flowOrder: flowOrder.flowOrder,
      boletaId: boleta.id,
    });
  } catch (error) {
    await adminClient.from("boleta_item").delete().eq("boleta_id", boleta.id);
    await adminClient.from("boleta").delete().eq("id", boleta.id);
    if (recurrenciaId) {
      await adminClient.from("recurrencia").delete().eq("id", recurrenciaId);
    }

    const message = error instanceof Error ? error.message : "Error al conectar con Flow";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
