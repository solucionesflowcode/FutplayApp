"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

/** Borrado en dos pasos dentro de una lista, sin abrir otro diálogo encima del que ya está abierto. */
export default function BorrarConConfirmacion({ etiqueta, onBorrar }: { etiqueta: string; onBorrar: () => Promise<void> }) {
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  if (!confirmando) {
    return (
      <button type="button" aria-label={etiqueta} onClick={() => setConfirmando(true)} className="p-1 text-gray-400 hover:text-red-600 shrink-0">
        <Trash2 size={14} aria-hidden />
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs shrink-0">
      <button
        type="button"
        disabled={borrando}
        onClick={async () => {
          setBorrando(true);
          await onBorrar();
          setBorrando(false);
          setConfirmando(false);
        }}
        className="font-semibold text-red-600 hover:underline disabled:opacity-50"
      >
        {borrando ? "Borrando..." : "Borrar"}
      </button>
      <button type="button" disabled={borrando} onClick={() => setConfirmando(false)} className="text-gray-500 hover:underline">Cancelar</button>
    </span>
  );
}
