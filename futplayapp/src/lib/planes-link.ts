// Planes que solo se compran con el link del admin (codigo_acceso) y no
// aparecen en el catálogo público. Sin dependencias: lo usan las rutas de API
// (create-order, link, familiar) y el cliente.
export type TipoPlanLink = "normal" | "familiar" | "kids" | "liga";

// Familiar y Liga siempre están ocultos.
export const PLANES_CON_LINK: TipoPlanLink[] = ["familiar", "liga"];

/** Familiar/Liga siempre; cualquier otro plan si el admin lo ocultó. */
export function requiereLink(p: { tipo_plan?: TipoPlanLink | string | null; oculto?: boolean | null }): boolean {
  return PLANES_CON_LINK.includes(p.tipo_plan as TipoPlanLink) || p.oculto === true;
}
