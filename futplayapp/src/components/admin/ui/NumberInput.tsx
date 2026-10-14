"use client";

import { useState, type InputHTMLAttributes } from "react";
import { CLASE_INPUT } from "./FormField";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null;
  /** null cuando el campo queda vacío: la validación se hace al guardar. */
  onChange: (valor: number | null) => void;
};

/** Texto → número entero, o null si está vacío o no es número. */
export function parsearEntero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "" || !/^-?\d+$/.test(limpio)) return null;
  return parseInt(limpio, 10);
}

/**
 * Número entero que se puede vaciar (PLA-04). Antes `parseInt(...) || 1`
 * reponía el valor al borrar y no se podía escribir otro número desde cero.
 */
export default function NumberInput({ value, onChange, className = "", ...resto }: Props) {
  const [texto, setTexto] = useState(value === null ? "" : String(value));
  // Sincroniza si el valor cambia desde afuera (p. ej. al elegir un plan).
  const [valorAnterior, setValorAnterior] = useState(value);
  if (value !== valorAnterior) {
    setValorAnterior(value);
    if (parsearEntero(texto) !== value) setTexto(value === null ? "" : String(value));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={texto}
      onChange={(e) => {
        const nuevo = e.target.value.replace(/[^\d-]/g, "");
        setTexto(nuevo);
        const n = parsearEntero(nuevo);
        setValorAnterior(n);
        onChange(n);
      }}
      className={`${CLASE_INPUT} ${className}`}
      {...resto}
    />
  );
}
