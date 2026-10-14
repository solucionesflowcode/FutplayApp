"use client";

import { useCallback, useState } from "react";
import { useToast } from "./Toast";

/** Las funciones de src/data devuelven { ok } o { success } según el módulo. */
export type ResultadoAccion = { ok?: boolean; success?: boolean; error?: string } | void;

type Opciones = {
  /** Aviso de éxito (si no se pasa, no se muestra). */
  exito?: string;
  /** Título del aviso de error; el detalle es el mensaje de la API. */
  error?: string;
  /** Deshace el cambio optimista si la acción falla. */
  revertir?: () => void;
};

export function fueExitoso(r: ResultadoAccion): boolean {
  if (!r) return true;
  if (r.ok !== undefined) return r.ok;
  if (r.success !== undefined) return r.success;
  return !r.error;
}

/**
 * Patrón común de las acciones del admin (CLA-04, PLA-02, MEM-02): ejecutar,
 * avisar el resultado y revertir el cambio optimista si falla. Antes cada
 * pantalla lo hacía a mano y varias ignoraban el error.
 * Devuelve true si la acción salió bien.
 */
export function useAdminMutation() {
  const toast = useToast();
  const [pendiente, setPendiente] = useState(false);

  const ejecutar = useCallback(
    async (accion: () => Promise<ResultadoAccion>, opciones: Opciones = {}): Promise<boolean> => {
      setPendiente(true);
      try {
        const r = await accion();
        if (fueExitoso(r)) {
          if (opciones.exito) toast.exito(opciones.exito);
          return true;
        }
        opciones.revertir?.();
        const detalle = (r && r.error) || undefined;
        toast.error(opciones.error ?? detalle ?? "No se pudo completar la acción", opciones.error ? detalle : undefined);
        return false;
      } catch {
        opciones.revertir?.();
        toast.error(opciones.error ?? "Error de conexión", "Revisa tu internet e intenta de nuevo.");
        return false;
      } finally {
        setPendiente(false);
      }
    },
    [toast],
  );

  return { ejecutar, pendiente };
}
