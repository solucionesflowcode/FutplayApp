"use client";

import { useRef, useState, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { fechaIsoDesdeTexto, fechaTextoDesdeIso, esFechaIso } from "@/lib/fechas";
import { CLASE_INPUT } from "./FormField";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** YYYY-MM-DD, "" si está vacío o el texto a medio escribir: la validación se hace al guardar (esFechaIso). */
  value: string;
  onChange: (valor: string) => void;
};

/** Pone las barras mientras se escribe: "24122026" → "24/12/2026". */
function conBarras(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

/**
 * Fecha siempre en dd/mm/aaaa. <input type="date"> muestra el formato del idioma
 * del navegador (mm/dd/yyyy en inglés) y no se puede cambiar; aquí solo se usa
 * oculto para abrir el calendario.
 */
export default function FechaInput({ value, onChange, className = "", ...resto }: Props) {
  const calendario = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(esFechaIso(value) ? fechaTextoDesdeIso(value) : value);
  // Sincroniza si el valor cambia desde afuera (p. ej. al elegir en el calendario).
  const [valorAnterior, setValorAnterior] = useState(value);
  if (value !== valorAnterior) {
    setValorAnterior(value);
    setTexto(esFechaIso(value) ? fechaTextoDesdeIso(value) : value);
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={texto}
        onChange={(e) => {
          const nuevo = conBarras(e.target.value);
          const valor = fechaIsoDesdeTexto(nuevo) ?? nuevo;
          setTexto(nuevo);
          setValorAnterior(valor);
          onChange(valor);
        }}
        className={`${CLASE_INPUT} pr-10 ${className}`}
        {...resto}
      />
      <button
        type="button"
        aria-label="Abrir calendario"
        onClick={() => calendario.current?.showPicker?.()}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
      >
        <CalendarDays size={16} aria-hidden />
      </button>
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={esFechaIso(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-0 bottom-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
