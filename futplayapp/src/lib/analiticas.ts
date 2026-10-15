import type { MembresiaConPlan } from "@/data/membresia";

/**
 * Regla única de las analíticas: solo cuenta una membresía con boleta, sea de
 * Flow (boleta_id) o un N° de boleta externo que anotó el admin. Las asignadas
 * desde el panel sin boleta (regaladas, pruebas) no cuentan.
 */
export function tieneBoleta(m: { boleta_id?: string | null; numero_boleta?: string | null }): boolean {
  return !!m.boleta_id || !!m.numero_boleta?.trim();
}

/** Vigente hoy: activa, no congelada, con tokens y sin vencer. */
export function membresiaVigente(m: MembresiaConPlan, hoy: string): boolean {
  return m.estado && !m.congelada && !m.sin_tokens && !!m.fecha_vencimiento && m.fecha_vencimiento.slice(0, 10) >= hoy;
}

/**
 * ANA-01: alumnos distintos con un plan vigente ÷ total de alumnos. Antes se
 * llamaba "retención" y dividía membresías con tokens (repetidas por alumno,
 * vencidas o congeladas incluidas) por el total de alumnos.
 */
export function porcentajeConPlanActivo(membresias: MembresiaConPlan[], alumnoIds: Set<string>, hoy: string): number {
  if (alumnoIds.size === 0) return 0;
  const conPlan = new Set(
    membresias.filter((m) => alumnoIds.has(m.usuario_id) && membresiaVigente(m, hoy)).map((m) => m.usuario_id),
  );
  return Math.round((conPlan.size / alumnoIds.size) * 100);
}
