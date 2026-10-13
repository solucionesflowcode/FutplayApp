import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";

export const dynamic = "force-dynamic";

type MembresiaRow = {
  id: string;
  usuario_id: string;
  estado: boolean;
  congelada: boolean;
  sin_tokens: boolean;
  fecha_inicio: string;
  fecha_vencimiento: string;
  fecha_congelamiento: string | null;
};

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

const RESERVA_ABIERTA = ["sin_confirmar", "pendiente", "confirmado_whatsapp"];

/**
 * Cancela las reservas futuras abiertas del alumno y devuelve un token por cada
 * clase cancelada (los partidos no descuentan token, así que no se devuelve).
 * Update condicional: si el alumno o el bot la cancelaron justo antes, no se
 * devuelve otro token.
 */
async function cancelarReservasFuturas(
  admin: AdminClient,
  usuarioId: string,
  ahoraIso: string
): Promise<{ total: number } | { error: string }> {
  const { data: reservas, error } = await admin
    .from("clase_usuario")
    .select("id, clase:clase_id!inner (fecha_hora, tipo_evento)")
    .eq("usuario_id", usuarioId)
    .in("asistencia", RESERVA_ABIERTA)
    .gt("clase.fecha_hora", ahoraIso);

  if (error) return { error: error.message };

  let total = 0;
  for (const r of (reservas ?? []) as unknown as { id: string; clase: { tipo_evento: string } | { tipo_evento: string }[] }[]) {
    const { data: cancelada, error: cancelError } = await admin
      .from("clase_usuario")
      .update({ asistencia: "cancelado" })
      .eq("id", r.id)
      .in("asistencia", RESERVA_ABIERTA)
      .select("id")
      .maybeSingle();
    if (cancelError) return { error: cancelError.message };
    if (!cancelada) continue;
    total++;

    const clase = Array.isArray(r.clase) ? r.clase[0] : r.clase;
    if (clase?.tipo_evento !== "partido") {
      const { error: rpcError } = await admin.rpc("devolver_token", { p_usuario_id: usuarioId });
      if (rpcError) return { error: rpcError.message };
    }
  }
  return { total };
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    const membreciaId = body?.membreciaId;
    const accion = body?.accion;

    if (!membreciaId) {
      return NextResponse.json({ error: "membreciaId requerido" }, { status: 400 });
    }
    if (accion !== "congelar" && accion !== "reactivar") {
      return NextResponse.json({ error: 'accion debe ser "congelar" o "reactivar"' }, { status: 400 });
    }

    const { data: membresia, error } = await admin
      .from("membresia")
      .select("id, usuario_id, estado, congelada, sin_tokens, fecha_inicio, fecha_vencimiento, fecha_congelamiento")
      .eq("id", membreciaId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    }
    if (!membresia) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    if (accion === "congelar") {
      const m = membresia as MembresiaRow;
      if (m.congelada) {
        return NextResponse.json({ error: "La membresía ya está congelada" }, { status: 400 });
      }
      if (m.sin_tokens) {
        return NextResponse.json(
          { error: "No se puede congelar una membresía sin tokens: no tiene saldo que pausar" },
          { status: 400 }
        );
      }
      if (!m.estado) {
        return NextResponse.json({ error: "Solo se puede congelar una membresía activa" }, { status: 400 });
      }
      if (!(new Date(m.fecha_inicio) <= now && now <= new Date(m.fecha_vencimiento))) {
        return NextResponse.json(
          { error: "Solo se puede congelar una membresía dentro de su vigencia" },
          { status: 400 }
        );
      }

      // Las reservas futuras se cancelan ANTES de congelar, devolviendo su token:
      // congelada, devolver_token ya no la considera y el alumno perdía el token
      // al cancelar (o el bot lo cancelaba sin reembolso por no responder).
      const canceladas = await cancelarReservasFuturas(admin, m.usuario_id, nowIso);
      if ("error" in canceladas) {
        return NextResponse.json({ error: traducirError(canceladas.error) }, { status: 500 });
      }

      // Condicional: con doble clic, el segundo pedido no pisa fecha_congelamiento.
      const { data: congelada, error: updateError } = await admin
        .from("membresia")
        .update({ congelada: true, fecha_congelamiento: nowIso })
        .eq("id", membreciaId)
        .eq("congelada", false)
        .select("id")
        .maybeSingle();

      if (updateError) {
        return NextResponse.json({ error: traducirError(updateError.message) }, { status: 500 });
      }
      if (!congelada) {
        return NextResponse.json({ error: "La membresía ya está congelada" }, { status: 400 });
      }

      return NextResponse.json({ ok: true, congelada: true, reservasCanceladas: canceladas.total });
    }

    // accion === "reactivar"
    const m = membresia as MembresiaRow;
    if (!m.congelada) {
      return NextResponse.json({ error: "La membresía no está congelada" }, { status: 400 });
    }
    if (!m.fecha_congelamiento) {
      return NextResponse.json(
        { error: "La membresía no tiene fecha de congelamiento registrada" },
        { status: 400 }
      );
    }

    const deltaMs = now.getTime() - new Date(m.fecha_congelamiento).getTime();
    const nuevoVencimiento = new Date(new Date(m.fecha_vencimiento).getTime() + deltaMs);

    // Condicional: con doble clic, el segundo pedido no vuelve a correr el
    // vencimiento por los días congelados (antes se sumaban dos veces).
    const { data: reactivada, error: updateError } = await admin
      .from("membresia")
      .update({
        congelada: false,
        fecha_congelamiento: null,
        fecha_vencimiento: nuevoVencimiento.toISOString(),
      })
      .eq("id", membreciaId)
      .eq("congelada", true)
      .select("id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: traducirError(updateError.message) }, { status: 500 });
    }
    if (!reactivada) {
      return NextResponse.json({ error: "La membresía no está congelada" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      congelada: false,
      fecha_vencimiento: nuevoVencimiento.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}