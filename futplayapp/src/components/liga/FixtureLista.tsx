import type { ReactNode } from "react";
import { ETIQUETA_FASE, FASES_PLAYOFF, type LigaEquipoBase, type LigaPartido } from "@/lib/liga-tabla";
import PartidoTarjeta from "./PartidoTarjeta";

type Props = {
  partidos: LigaPartido[];
  equipos: LigaEquipoBase[];
  miEquipoId?: string | null;
  /** Solo la fase regular, solo playoffs, o todo. */
  fases?: "regular" | "playoffs" | "todas";
  acciones?: (p: LigaPartido) => ReactNode;
  vacio?: ReactNode;
};

/** Partidos agrupados por fecha (jornada) y luego por ronda de playoffs. */
export default function FixtureLista({ partidos, equipos, miEquipoId, fases = "todas", acciones, vacio }: Props) {
  const mapa = new Map(equipos.map((e) => [e.id, e]));

  const grupos: { titulo: string; partidos: LigaPartido[] }[] = [];
  if (fases !== "playoffs") {
    const jornadas = [...new Set(partidos.filter((p) => p.fase === "regular").map((p) => p.jornada ?? 0))].sort((a, b) => a - b);
    for (const j of jornadas) {
      grupos.push({ titulo: j ? `Fecha ${j}` : "Sin fecha asignada", partidos: partidos.filter((p) => p.fase === "regular" && (p.jornada ?? 0) === j) });
    }
  }
  if (fases !== "regular") {
    for (const f of FASES_PLAYOFF) {
      const ronda = partidos.filter((p) => p.fase === f).sort((a, b) => (a.llave ?? 0) - (b.llave ?? 0));
      if (ronda.length) grupos.push({ titulo: ETIQUETA_FASE[f], partidos: ronda });
    }
  }

  if (grupos.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-500">{vacio ?? "Aún no hay partidos programados."}</div>;
  }

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <section key={g.titulo}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{g.titulo}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {g.partidos.map((p) => (
              <PartidoTarjeta
                key={p.id}
                partido={p}
                equipos={mapa}
                destacado={!!miEquipoId && (p.local_id === miEquipoId || p.visita_id === miEquipoId)}
                acciones={acciones?.(p)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
