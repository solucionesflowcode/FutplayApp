"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const TAMANOS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

const ENFOCABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Botones del pie (Cancelar / Guardar). */
  footer?: ReactNode;
  size?: keyof typeof TAMANOS;
  /** Mientras guarda: Escape, el fondo y la X no cierran (evita perder la operación). */
  bloquearCierre?: boolean;
  /** Clic en el fondo cierra. Por defecto no: en un formulario se perdería lo escrito. */
  cerrarConFondo?: boolean;
};

/**
 * Modal accesible del admin (GEN-01): role="dialog" + aria-modal, título
 * asociado, Escape cierra, el foco queda atrapado dentro y vuelve al botón que
 * lo abrió, y el fondo no se desplaza mientras está abierto.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  bloquearCierre = false,
  cerrarConFondo = false,
}: Props) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose/bloquearCierre en refs: el efecto de foco no se reinicia en cada render.
  const onCloseRef = useRef(onClose);
  const bloquearRef = useRef(bloquearCierre);
  useEffect(() => {
    onCloseRef.current = onClose;
    bloquearRef.current = bloquearCierre;
  });

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Foco inicial en el primer campo del contenido; la X solo si no hay otro.
    const primero = Array.from(panel?.querySelectorAll<HTMLElement>(ENFOCABLES) ?? [])
      .find((el) => !el.hasAttribute("data-modal-cerrar"));
    (primero ?? panel)?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!bloquearRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const enfocables = Array.from(panel.querySelectorAll<HTMLElement>(ENFOCABLES));
      if (enfocables.length === 0) {
        e.preventDefault();
        return;
      }
      const inicio = enfocables[0];
      const fin = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault();
        fin.focus();
      } else if (!e.shiftKey && document.activeElement === fin) {
        e.preventDefault();
        inicio.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (cerrarConFondo && !bloquearCierre && e.target === e.currentTarget) onClose();
      }}
      data-testid="modal-fondo"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={description ? idDescripcion : undefined}
        tabIndex={-1}
        className={`bg-white border-t-2 border-t-acento w-full ${TAMANOS[size]} shadow-xl max-h-[92vh] flex flex-col focus:outline-none`}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-xl font-bold text-gray-900">{title}</h2>
            {description && <div id={idDescripcion} className="text-sm text-gray-500 mt-1">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={bloquearCierre}
            aria-label="Cerrar"
            data-modal-cerrar
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        {children && <div className="px-6 pb-4 overflow-y-auto">{children}</div>}
        {footer && <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
