// Un único mapa estado → etiqueta/color para todo el admin. Antes cada pantalla
// tenía el suyo y un mismo estado se veía distinto (o con otro nombre).

const ESTADOS = {
  // Membresías
  activa: { etiqueta: "Activa", clase: "bg-green-100 text-green-700" },
  inactiva: { etiqueta: "Inactiva", clase: "bg-red-100 text-red-600" },
  sin_tokens: { etiqueta: "Sin tokens", clase: "bg-orange-100 text-orange-700" },
  congelada: { etiqueta: "Congelada", clase: "bg-amber-100 text-amber-700" },
  // Alumnos (tabla de usuarios)
  Activo: { etiqueta: "Activo", clase: "bg-green-100 text-green-700" },
  Vencido: { etiqueta: "Vencido", clase: "bg-red-100 text-red-600" },
  Inactivo: { etiqueta: "Sin plan", clase: "bg-gray-100 text-gray-600" },
  Congelado: { etiqueta: "Congelado", clase: "bg-amber-100 text-amber-700" },
  // Asistencia a clases
  sin_confirmar: { etiqueta: "Sin confirmar", clase: "bg-gray-100 text-gray-600" },
  pendiente: { etiqueta: "Recordatorio enviado", clase: "bg-sky-100 text-sky-700" },
  confirmado_whatsapp: { etiqueta: "Confirmado", clase: "bg-emerald-100 text-emerald-700" },
  asistio: { etiqueta: "Presente", clase: "bg-green-100 text-green-700" },
  no_asistio: { etiqueta: "Ausente", clase: "bg-red-100 text-red-700" },
  cancelado: { etiqueta: "Cancelada", clase: "bg-gray-200 text-gray-600" },
  cancelado_sin_reembolso: { etiqueta: "Cancelada sin reembolso", clase: "bg-gray-200 text-gray-600" },
} as const;

export type EstadoConocido = keyof typeof ESTADOS;

export function infoEstado(estado: string): { etiqueta: string; clase: string } {
  return (ESTADOS as Record<string, { etiqueta: string; clase: string }>)[estado]
    ?? { etiqueta: estado || "—", clase: "bg-gray-100 text-gray-600" };
}

type Props = {
  estado: string;
  /** Reemplaza la etiqueta por defecto. */
  etiqueta?: string;
  title?: string;
};

export default function StatusBadge({ estado, etiqueta, title }: Props) {
  const info = infoEstado(estado);
  return (
    <span title={title} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${info.clase}`}>
      {etiqueta ?? info.etiqueta}
    </span>
  );
}
