"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type Tipo = "exito" | "error" | "info";

export type Aviso = { id: number; tipo: Tipo; mensaje: string; detalle?: string };

type Api = {
  exito: (mensaje: string) => void;
  /** Persiste hasta que se cierra: un error no debe desaparecer antes de leerlo. */
  error: (mensaje: string, detalle?: string) => void;
  info: (mensaje: string) => void;
  cerrar: (id: number) => void;
};

/** Cuánto dura un aviso de éxito o info. Los errores no se cierran solos. */
export const DURACION_AVISO_MS = 4000;

const ToastContext = createContext<Api | null>(null);

const ESTILOS: Record<Tipo, { icono: typeof AlertCircle; clase: string }> = {
  exito: { icono: CheckCircle2, clase: "border-green-200 bg-green-50 text-green-800" },
  error: { icono: AlertCircle, clase: "border-red-200 bg-red-50 text-red-700" },
  info: { icono: AlertCircle, clase: "border-blue-200 bg-blue-50 text-marca" },
};

/**
 * Avisos del admin (GEN-02): reemplaza alert()/confirm()/prompt() y los
 * banners que nunca se cerraban. Éxito e info se cierran solos; los errores
 * quedan hasta que el admin los cierra. Se anuncian a lectores de pantalla.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const agregar = useCallback((tipo: Tipo, mensaje: string, detalle?: string) => {
    const id = siguienteId.current++;
    setAvisos((prev) => [...prev, { id, tipo, mensaje, detalle }]);
  }, []);

  const api = useMemo<Api>(() => ({
    exito: (m) => agregar("exito", m),
    error: (m, d) => agregar("error", m, d),
    info: (m) => agregar("info", m),
    cerrar,
  }), [agregar, cerrar]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96" aria-live="polite">
        {avisos.map((a) => <AvisoItem key={a.id} aviso={a} cerrar={cerrar} />)}
      </div>
    </ToastContext.Provider>
  );
}

// `cerrar` es estable (useCallback): el temporizador no se reinicia cuando llega otro aviso.
function AvisoItem({ aviso, cerrar }: { aviso: Aviso; cerrar: (id: number) => void }) {
  const onClose = () => cerrar(aviso.id);
  useEffect(() => {
    if (aviso.tipo === "error") return;
    const t = setTimeout(() => cerrar(aviso.id), DURACION_AVISO_MS);
    return () => clearTimeout(t);
  }, [aviso.id, aviso.tipo, cerrar]);

  const { icono: Icono, clase } = ESTILOS[aviso.tipo];
  return (
    <div
      role={aviso.tipo === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 p-3 border rounded-lg shadow-lg text-sm ${clase}`}
    >
      <Icono size={18} className="shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{aviso.mensaje}</p>
        {aviso.detalle && <p className="mt-0.5 opacity-80">{aviso.detalle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar aviso" className="p-0.5 opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

export function useToast(): Api {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast debe usarse dentro de <ToastProvider> (layout del admin)");
  return api;
}
