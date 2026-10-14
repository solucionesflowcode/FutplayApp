"use client";

import type { ReactNode } from "react";
import { AlertCircle, TriangleAlert, Trash2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

const VARIANTES = {
  peligro: { boton: "peligro", icono: Trash2, color: "bg-red-100 text-red-600" },
  advertencia: { boton: "advertencia", icono: TriangleAlert, color: "bg-amber-100 text-amber-700" },
  info: { boton: "primario", icono: AlertCircle, color: "bg-blue-100 text-marca" },
} as const;

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  /** Obligatorio: el diálogo anterior usaba "Eliminar" por defecto y el de congelar decía "Eliminar". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Qué pasará (reservas canceladas, tokens devueltos…): se muestra como lista. */
  consecuencias?: ReactNode[];
  variante?: keyof typeof VARIANTES;
  cargando?: boolean;
  textoCargando?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmación del admin (v2): texto del botón obligatorio, variantes de
 * color, lista de consecuencias y bloqueo mientras se ejecuta la acción.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  consecuencias,
  variante = "peligro",
  cargando = false,
  textoCargando,
  onConfirm,
  onCancel,
}: Props) {
  const v = VARIANTES[variante];
  const Icono = v.icono;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      bloquearCierre={cargando}
      footer={
        <>
          <Button variante="secundario" onClick={onCancel} disabled={cargando}>{cancelLabel}</Button>
          <Button variante={v.boton} onClick={onConfirm} cargando={cargando} textoCargando={textoCargando}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${v.color}`} aria-hidden>
          <Icono size={18} />
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <div>{message}</div>
          {consecuencias && consecuencias.length > 0 && (
            <ul className="list-disc pl-4 space-y-1 text-gray-500">
              {consecuencias.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
