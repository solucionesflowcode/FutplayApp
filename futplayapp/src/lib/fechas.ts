export function calcularVencimiento(fecha: string): Date {
  const date = new Date(fecha);
  return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export function membresiaActiva(fecha: string): boolean {
  return calcularVencimiento(fecha) >= new Date();
}
