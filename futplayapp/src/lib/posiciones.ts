// Valores del enum posicion_jugador (docs/migrations/2026-10-usuario-posicion.sql).
export const POSICIONES = [
    { valor: "arquero", etiqueta: "Arquero" },
    { valor: "lateral_derecho", etiqueta: "Lateral derecho" },
    { valor: "lateral_izquierdo", etiqueta: "Lateral izquierdo" },
    { valor: "defensa_central", etiqueta: "Defensa central" },
    { valor: "volante_contencion", etiqueta: "Volante de contención" },
    { valor: "volante_creativo", etiqueta: "Volante creativo" },
    { valor: "delantero_izquierdo", etiqueta: "Delantero izquierdo" },
    { valor: "delantero_derecho", etiqueta: "Delantero derecho" },
    { valor: "delantero_centro", etiqueta: "Delantero centro" },
] as const;

export type Posicion = (typeof POSICIONES)[number]["valor"];

export function esPosicion(v: unknown): v is Posicion {
    return POSICIONES.some((p) => p.valor === v);
}
