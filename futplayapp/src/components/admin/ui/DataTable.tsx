"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { acotarPagina, paginasVisibles } from "@/lib/paginacion";

export type Columna<T> = {
  id: string;
  encabezado: string;
  celda: (fila: T) => ReactNode;
  /** Valor para ordenar; si falta, la columna no se puede ordenar. */
  valorOrden?: (fila: T) => string | number | null | undefined;
  className?: string;
};

type Props<T> = {
  filas: T[];
  columnas: Columna<T>[];
  getId: (fila: T) => string;
  /** Vista de tarjeta en móvil (< md). Si falta, en móvil se ve la tabla con scroll. */
  tarjetaMovil?: (fila: T) => ReactNode;
  porPagina?: number;
  vacio?: ReactNode;
  cargando?: boolean;
  /** Al cambiar (p. ej. el texto buscado) vuelve a la página 1. */
  resetKey?: string;
  onFilaClick?: (fila: T) => void;
  /** Orden inicial. */
  ordenInicial?: { columna: string; asc: boolean };
  etiqueta?: string;
};

/** Ordena sin mutar; los vacíos (null/undefined/"") van al final en ambos sentidos. */
export function ordenarFilas<T>(filas: T[], valor: (f: T) => string | number | null | undefined, asc: boolean): T[] {
  const vacio = (v: unknown) => v === null || v === undefined || v === "";
  return [...filas].sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    if (vacio(va) && vacio(vb)) return 0;
    if (vacio(va)) return 1;
    if (vacio(vb)) return -1;
    const cmp = typeof va === "number" && typeof vb === "number"
      ? va - vb
      : String(va).localeCompare(String(vb), "es", { numeric: true, sensitivity: "base" });
    return asc ? cmp : -cmp;
  });
}

/**
 * Tabla del admin: columnas declarativas, orden por columna, paginación real,
 * estado vacío y de carga, y tarjetas en móvil (USR-01/02/05, CLA-05).
 */
export default function DataTable<T>({
  filas,
  columnas,
  getId,
  tarjetaMovil,
  porPagina = 20,
  vacio = "No hay registros",
  cargando = false,
  resetKey,
  onFilaClick,
  ordenInicial,
  etiqueta,
}: Props<T>) {
  const [paginaElegida, setPagina] = useState(1);
  const [orden, setOrden] = useState(ordenInicial ?? null);
  // Volver a la página 1 al cambiar el filtro, ajustando en el render (sin useEffect).
  const [claveAnterior, setClaveAnterior] = useState(resetKey);
  if (resetKey !== claveAnterior) {
    setClaveAnterior(resetKey);
    setPagina(1);
  }

  const ordenadas = useMemo(() => {
    if (!orden) return filas;
    const col = columnas.find((c) => c.id === orden.columna);
    return col?.valorOrden ? ordenarFilas(filas, col.valorOrden, orden.asc) : filas;
  }, [filas, columnas, orden]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const pagina = acotarPagina(paginaElegida, totalPaginas);
  const visibles = ordenadas.slice((pagina - 1) * porPagina, pagina * porPagina);

  const alternarOrden = (id: string) => {
    setOrden((o) => (o?.columna === id ? { columna: id, asc: !o.asc } : { columna: id, asc: true }));
    setPagina(1);
  };

  const filasTabla = cargando
    ? Array.from({ length: 5 }, (_, i) => (
        <tr key={`esqueleto-${i}`} className="border-b border-gray-100" aria-hidden>
          {columnas.map((c) => (
            <td key={c.id} className="p-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
          ))}
        </tr>
      ))
    : visibles.length === 0
      ? [
          <tr key="vacio">
            <td colSpan={columnas.length} className="p-8 text-center text-gray-400">{vacio}</td>
          </tr>,
        ]
      : visibles.map((fila) => (
          <tr
            key={getId(fila)}
            onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
            className={`border-b border-gray-100 hover:bg-gray-50/70 ${onFilaClick ? "cursor-pointer" : ""}`}
          >
            {columnas.map((c) => (
              <td key={c.id} className={`p-3 text-gray-700 ${c.className ?? ""}`}>{c.celda(fila)}</td>
            ))}
          </tr>
        ));

  return (
    <div className="bg-white border border-gray-200 rounded-lg" aria-busy={cargando || undefined}>
      <div className={tarjetaMovil ? "hidden md:block overflow-x-auto" : "overflow-x-auto"}>
        <table className="w-full text-sm" aria-label={etiqueta}>
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50/50">
              {columnas.map((c) => {
                const activa = orden?.columna === c.id;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    className={`p-3 font-semibold ${c.className ?? ""}`}
                    aria-sort={activa ? (orden!.asc ? "ascending" : "descending") : undefined}
                  >
                    {c.valorOrden ? (
                      <button
                        type="button"
                        onClick={() => alternarOrden(c.id)}
                        className="inline-flex items-center gap-1 hover:text-gray-900"
                      >
                        {c.encabezado}
                        {activa ? (orden!.asc ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} className="opacity-30" />}
                      </button>
                    ) : (
                      c.encabezado
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{filasTabla}</tbody>
        </table>
      </div>

      {tarjetaMovil && (
        <ul className="md:hidden divide-y divide-gray-100">
          {cargando ? (
            <li className="p-4"><div className="h-12 bg-gray-100 rounded animate-pulse" /></li>
          ) : visibles.length === 0 ? (
            <li className="p-8 text-center text-gray-400">{vacio}</li>
          ) : (
            visibles.map((fila) => (
              <li
                key={getId(fila)}
                onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
                className={`p-3 ${onFilaClick ? "cursor-pointer" : ""}`}
              >
                {tarjetaMovil(fila)}
              </li>
            ))
          )}
        </ul>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-3 p-3 border-t border-gray-100">
        <span className="text-sm text-gray-500">
          {ordenadas.length === 0
            ? "Sin registros"
            : `Mostrando ${(pagina - 1) * porPagina + 1} a ${Math.min(pagina * porPagina, ordenadas.length)} de ${ordenadas.length}`}
        </span>
        {totalPaginas > 1 && (
          <nav className="flex flex-wrap gap-1 items-center" aria-label="Paginación">
            <button
              type="button"
              onClick={() => setPagina(pagina - 1)}
              disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Anterior
            </button>
            {paginasVisibles(pagina, totalPaginas).map((n, i) =>
              n === "…" ? (
                <span key={`salto-${i}`} className="px-1 text-gray-400">…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPagina(n)}
                  aria-current={n === pagina ? "page" : undefined}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                    n === pagina ? "bg-marca text-white border-marca" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPagina(pagina + 1)}
              disabled={pagina >= totalPaginas}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
