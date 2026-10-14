"use client";

import { useId, type ReactNode } from "react";

/** Props que FormField pasa al control para asociarlo con su label, ayuda y error. */
export type PropsControl = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type Props = {
  label: string;
  required?: boolean;
  ayuda?: ReactNode;
  error?: string | null;
  children: (control: PropsControl) => ReactNode;
};

export const CLASE_INPUT =
  "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-marca focus:ring-1 focus:ring-marca aria-[invalid=true]:border-red-400 disabled:bg-gray-50 disabled:text-gray-500";

/**
 * Campo de formulario (USR-11): label visible asociado al control, ayuda y
 * error enlazados con aria-describedby. Antes varios formularios usaban solo
 * placeholders, que desaparecen al escribir.
 *
 *   <FormField label="Nombre" required error={err}>
 *     {(p) => <input {...p} className={CLASE_INPUT} />}
 *   </FormField>
 */
export default function FormField({ label, required, ayuda, error, children }: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describedBy = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500" aria-hidden> *</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {ayuda && <p id={idAyuda} className="text-xs text-gray-500 mt-1">{ayuda}</p>}
      {error && <p id={idError} className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
