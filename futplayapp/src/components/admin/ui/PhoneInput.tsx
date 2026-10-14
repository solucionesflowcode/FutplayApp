"use client";

import type { InputHTMLAttributes } from "react";
import { normalizeTelefono } from "@/lib/telefono";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** Teléfono completo (+569XXXXXXXX) o "" si no tiene. */
  value: string;
  onChange: (telefono: string) => void;
};

/** Los 8 dígitos que se escriben después del prefijo +569. */
export function digitosMovil(telefono: string): string {
  if (!telefono.trim()) return "";
  return normalizeTelefono(telefono).slice(4);
}

/**
 * Celular chileno con prefijo fijo +569 (USR-04, PRO-02): se escriben solo los
 * 8 dígitos y siempre se entrega +569XXXXXXXX (el formato que busca el bot de
 * WhatsApp), o "" si se borra. Validar con telefonoParaGuardar al guardar.
 */
export default function PhoneInput({ value, onChange, className = "", ...resto }: Props) {
  return (
    <div className={`flex items-stretch border border-gray-200 rounded-lg focus-within:border-marca focus-within:ring-1 focus-within:ring-marca ${className}`}>
      <span className="px-3 flex items-center text-sm text-gray-500 bg-gray-50 border-r border-gray-200 rounded-l-lg select-none" aria-hidden>
        +569
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="XXXX XXXX"
        maxLength={9}
        value={digitosMovil(value)}
        onChange={(e) => {
          const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
          onChange(digitos ? `+569${digitos}` : "");
        }}
        className="flex-1 min-w-0 px-3 py-2.5 text-sm text-gray-900 rounded-r-lg focus:outline-none"
        {...resto}
      />
    </div>
  );
}
