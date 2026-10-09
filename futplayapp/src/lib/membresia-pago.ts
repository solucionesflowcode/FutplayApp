import type { createServerClient } from "@supabase/ssr";
import { ahoraChile, fechaVencimientoDesde } from "@/lib/fechas";

type AdminClient = ReturnType<typeof createServerClient>;

export type ResultadoMembresiaPago =
  | { creada: true; liga: boolean }
  | { creada: false; motivo: "sin_plan" | "sin_tokens" | "ya_existe" | "error"; error?: string };

/**
 * Crea la membresía asociada a una boleta pagada (idempotente por boleta_id).
 * - Plan Liga (tipo_plan='liga'): pago único → registro inactivo (estado=false,
 *   0 tokens) que no afecta la membresía vigente del alumno.
 * - Resto: membresía activa con los tokens del plan.
 */
export async function crearMembresiaPorBoleta(
  adminClient: AdminClient,
  boletaId: string,
  usuarioId: string
): Promise<ResultadoMembresiaPago> {
  const { data: boletaItem } = await adminClient
    .from("boleta_item")
    .select("plan_id")
    .eq("boleta_id", boletaId)
    .maybeSingle();

  if (!boletaItem?.plan_id) return { creada: false, motivo: "sin_plan" };

  const { data: plan } = await adminClient
    .from("plan")
    .select("tokens_mensuales, dias, tipo_plan")
    .eq("id", boletaItem.plan_id)
    .maybeSingle();

  if (!plan) return { creada: false, motivo: "sin_plan" };

  const esLiga = plan.tipo_plan === "liga";
  if (!esLiga && !plan.tokens_mensuales) return { creada: false, motivo: "sin_tokens" };

  const { data: existing } = await adminClient
    .from("membresia")
    .select("id")
    .eq("boleta_id", boletaId)
    .maybeSingle();

  if (existing) return { creada: false, motivo: "ya_existe" };

  const fecha_inicio = ahoraChile().toISOString();
  const fecha_vencimiento = fechaVencimientoDesde(fecha_inicio, plan.dias || 30).toISOString();
  const { error } = await adminClient.from("membresia").insert({
    usuario_id: usuarioId,
    plan_id: boletaItem.plan_id,
    boleta_id: boletaId,
    fecha_inicio,
    fecha_vencimiento,
    tokens_totales: esLiga ? 0 : plan.tokens_mensuales,
    tokens_usados: 0,
    estado: !esLiga,
  });

  // 23505 = unique_violation (idx_membresia_boleta_id): el webhook y /confirm
  // pueden crearla a la vez; si el otro ganó la carrera, ya existe.
  if (error?.code === "23505") return { creada: false, motivo: "ya_existe" };
  if (error) return { creada: false, motivo: "error", error: error.message };
  return { creada: true, liga: esLiga };
}
