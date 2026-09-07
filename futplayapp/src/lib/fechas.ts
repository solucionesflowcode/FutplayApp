export function membresiaActiva(fechaVencimiento: string): boolean {
  return new Date(fechaVencimiento) >= ahoraChile();
}

export function ahoraChile(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value, 10);

  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
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
