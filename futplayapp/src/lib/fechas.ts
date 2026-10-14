// Las fechas de membresía son timestamptz (instantes absolutos): se comparan
// y se guardan con el instante real, `new Date()`. La zona America/Santiago
// solo importa al MOSTRARLAS (formatear*). Antes existía ahoraChile(), que
// devolvía la hora de pared de Chile disfrazada de UTC: guardaba las fechas
// 3-4 h antes de lo real y las membresías vencían antes de tiempo.
export function membresiaActiva(fechaVencimiento: string): boolean {
  return new Date(fechaVencimiento) >= new Date();
}

export function fechaVencimientoDesde(inicio: Date | string, dias: number): Date {
  return new Date(new Date(inicio).getTime() + dias * 24 * 60 * 60 * 1000);
}

export function formatearMes(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long", timeZone: "America/Santiago" });
}

export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
}

export function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
}

export function fechaHoraChileDesdeIso(iso: string): { fecha: string; hora: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fecha = d.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const hora = d
    .toLocaleTimeString("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(/^24:/, "00:");
  return { fecha, hora };
}

/** Día de hoy en Chile (YYYY-MM-DD). `new Date().toISOString().slice(0, 10)` da el día UTC: después de las 21:00 ya es mañana. */
export function hoyChile(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

/**
 * ¿La clase cae en el filtro de fechas del admin? `desde`/`hasta` son
 * YYYY-MM-DD (input date) y se comparan con el día de la clase EN CHILE.
 * Antes se usaba `new Date("2026-10-14")` (medianoche UTC = 13/10 21:00 en
 * Chile): "hasta" excluía el último día y "desde" se corría uno.
 * `dias`: días de la semana (0 = domingo), también según el día en Chile.
 */
export function claseEnFiltroFechas(
  fechaHoraIso: string | null,
  { desde, hasta, dias = [] }: { desde?: string; hasta?: string; dias?: number[] },
): boolean {
  const hayFiltro = !!desde || !!hasta || dias.length > 0;
  if (!fechaHoraIso) return !hayFiltro;
  const chile = fechaHoraChileDesdeIso(fechaHoraIso);
  if (!chile) return !hayFiltro;
  if (desde && chile.fecha < desde) return false;
  if (hasta && chile.fecha > hasta) return false;
  if (dias.length > 0) {
    const [y, m, d] = chile.fecha.split("-").map(Number);
    if (!dias.includes(new Date(Date.UTC(y, m - 1, d)).getUTCDay())) return false;
  }
  return true;
}

/**
 * Valida la fecha de una clase del admin (fecha/hora en hora de Chile).
 * Solo exige que sea futura al CREAR o si se cambió: antes también se
 * validaba al editar y no se podía corregir el profesor o la descripción de
 * una clase ya pasada. Devuelve el mensaje de error o null.
 */
export function errorFechaClase(
  esNueva: boolean,
  { fecha, hora, fecha_original, hora_original }: { fecha: string; hora: string; fecha_original?: string; hora_original?: string },
  ahora: Date = new Date(),
): string | null {
  const cambio = esNueva || fecha !== fecha_original || hora !== hora_original;
  if (!cambio) return null;
  if (new Date(fechaHoraChileAIso(fecha, hora)) < ahora) {
    return "No se puede programar una clase en una fecha u hora pasada";
  }
  return null;
}

export function fechaHoraChileAIso(fecha: string, hora: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const fmtLocal = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  let guess = Date.UTC(y, m - 1, d, hh + 4, mm);
  const desiredLocal = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 5; i++) {
    const p = fmtLocal.formatToParts(new Date(guess));
    const get = (t: string) => parseInt(p.find((x) => x.type === t)!.value, 10);
    const actualLocal = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    const diff = desiredLocal - actualLocal;
    if (diff === 0) break;
    guess += diff;
  }
  return new Date(guess).toISOString();
}

export function getChileMonthBounds(): { startISO: string; endISO: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" });
  const [y, m] = fmt.format(new Date()).split("-").map(Number);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  return {
    startISO: new Date(Date.UTC(y, m - 1, 1)).toISOString(),
    endISO: new Date(Date.UTC(nextY, nextM - 1, 1)).toISOString(),
  };
}

export function parseClaseFechaHora(iso: string): Date {
  return new Date(iso);
}

export function esSemanaActual(fecha: string): boolean {
  const fechaDate = new Date(fecha);
  const ahora = new Date();
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - ahora.getDay());
  inicioSemana.setHours(0, 0, 0, 0);
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 7);
  return fechaDate >= inicioSemana && fechaDate < finSemana;
}

