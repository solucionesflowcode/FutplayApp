// Regla única de "membresía actual" de un alumno: la usan la API del admin
// (/api/admin/membresias), Gestión de membresías y Analíticas.
//  1. La vigente con más tokens restantes.
//  2. Si no hay vigente, la congelada (es el plan que el alumno sigue teniendo).
//  3. Si tampoco, la más reciente (antes se tomaba la primera fila que llegaba).

type MembresiaBase = {
  usuario_id: string;
  estado: boolean;
  congelada?: boolean | null;
  sin_tokens?: boolean | null;
  tokens_totales: number;
  tokens_usados: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
};

export function esVigente(m: MembresiaBase, ahora: Date = new Date()): boolean {
  return m.estado === true && m.sin_tokens !== true && m.congelada !== true && new Date(m.fecha_vencimiento) >= ahora;
}

/** Tokens que el alumno puede usar hoy (0 si vencida, agotada o congelada). */
export function tokensRestantes(m: MembresiaBase, ahora: Date = new Date()): number {
  return esVigente(m, ahora) ? Math.max(0, m.tokens_totales - m.tokens_usados) : 0;
}

function prioridad(m: MembresiaBase, ahora: Date): number {
  // Vigente sin tokens restantes no existe (el trigger la cierra), así que
  // cualquier vigente le gana a una congelada.
  return tokensRestantes(m, ahora) * 2 + (m.congelada === true ? 1 : 0);
}

/** ¿`a` le gana a `b` como membresía actual? */
function leGana<T extends MembresiaBase>(a: T, b: T, ahora: Date): boolean {
  const pa = prioridad(a, ahora);
  const pb = prioridad(b, ahora);
  if (pa !== pb) return pa > pb;
  return new Date(a.fecha_inicio).getTime() > new Date(b.fecha_inicio).getTime();
}

/** Una membresía por alumno: la actual (ver reglas arriba). */
export function membresiasActuales<T extends MembresiaBase>(lista: T[], ahora: Date = new Date()): Map<string, T> {
  const actuales = new Map<string, T>();
  for (const m of lista) {
    const actual = actuales.get(m.usuario_id);
    if (!actual || leGana(m, actual, ahora)) actuales.set(m.usuario_id, m);
  }
  return actuales;
}
