import type { ReactNode } from "react";

type Props = {
  titulo: string;
  descripcion?: ReactNode;
  /** Botones a la derecha (p. ej. "Nueva membresía"). */
  acciones?: ReactNode;
  /** Debajo del título: buscador, filtros, pestañas. */
  children?: ReactNode;
};

/**
 * Encabezado común de las pantallas del admin (GEN-03). Antes cada página
 * tenía el suyo (en Usuarios el buscador quedaba arriba del título).
 */
export default function PageHeader({ titulo, descripcion, acciones, children }: Props) {
  return (
    <header className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900">{titulo}</h1>
          {descripcion && <p className="text-sm text-gray-500 mt-1">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2 sm:justify-end">{acciones}</div>}
      </div>
      {children}
    </header>
  );
}
