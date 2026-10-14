"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

const VARIANTES = {
  // Azul de marca (antes cada pantalla usaba blue-600).
  primario: "bg-marca text-white hover:bg-marca-hover",
  secundario: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
  peligro: "bg-red-600 text-white hover:bg-red-700",
  advertencia: "bg-amber-600 text-white hover:bg-amber-700",
  fantasma: "text-gray-600 hover:bg-gray-100",
} as const;

export type VarianteBoton = keyof typeof VARIANTES;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  /** Muestra el spinner, deshabilita el botón y anuncia aria-busy. */
  cargando?: boolean;
  /** Texto mientras carga (por defecto, el mismo). */
  textoCargando?: string;
  icono?: ReactNode;
};

/** Botón del admin: variantes de color consistentes y estado de carga. */
export default function Button({
  variante = "primario",
  cargando = false,
  textoCargando,
  icono,
  children,
  className = "",
  disabled,
  type = "button",
  ...resto
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
      {...resto}
    >
      {cargando ? <Loader2 size={14} className="animate-spin" aria-hidden /> : icono}
      {cargando && textoCargando ? textoCargando : children}
    </button>
  );
}
