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

export function formatearMes(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long", timeZone: "America/Santiago" });
}

export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
}

export function formatearHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
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
