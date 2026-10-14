"use client";

import type { ReactNode } from "react";

const TONOS = {
  neutro: "text-marca",
  exito: "text-green-600",
  alerta: "text-amber-600",
  peligro: "text-red-600",
} as const;

type Props = {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
  tono?: keyof typeof TONOS;
  /** Si se pasa, la tarjeta filtra la vista al hacer clic. */
  onClick?: () => void;
  activa?: boolean;
};

/**
 * Tarjeta de estadística (USR-08): rectangular y legible en móvil. Antes eran
 * círculos con texto de 7 px. Con onClick funciona como filtro (aria-pressed).
 */
export default function StatCard({ etiqueta, valor, detalle, icono, tono = "neutro", onClick, activa }: Props) {
  const contenido = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{etiqueta}</span>
        {icono && <span className="text-gray-400" aria-hidden>{icono}</span>}
      </div>
      <p className={`text-2xl font-black mt-1 ${TONOS[tono]}`}>{valor}</p>
      {detalle && <p className="text-xs text-gray-500 mt-0.5">{detalle}</p>}
    </>
  );

  const base = "w-full text-left bg-white border rounded-lg p-4 transition-colors";
  if (!onClick) return <div className={`${base} border-gray-200`}>{contenido}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!activa}
      className={`${base} ${activa ? "border-marca ring-1 ring-marca" : "border-gray-200 hover:border-gray-300"}`}
    >
      {contenido}
    </button>
  );
}
