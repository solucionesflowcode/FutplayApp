import type { FilaTabla } from "@/lib/liga-tabla";
import EscudoEquipo from "./EscudoEquipo";

type Props = {
  filas: FilaTabla[];
  /** Resalta la fila del equipo del jugador. */
  miEquipoId?: string | null;
  /** Marca la zona de clasificación a playoffs. */
  clasificados?: number | null;
};

const COLUMNAS: { clave: keyof Omit<FilaTabla, "equipo">; titulo: string; ayuda: string }[] = [
  { clave: "pj", titulo: "PJ", ayuda: "Partidos jugados" },
  { clave: "pg", titulo: "PG", ayuda: "Partidos ganados" },
  { clave: "pe", titulo: "PE", ayuda: "Partidos empatados" },
  { clave: "pp", titulo: "PP", ayuda: "Partidos perdidos" },
  { clave: "gf", titulo: "GF", ayuda: "Goles a favor" },
  { clave: "gc", titulo: "GC", ayuda: "Goles en contra" },
  { clave: "dg", titulo: "DG", ayuda: "Diferencia de gol" },
];

export default function TablaPosiciones({ filas, miEquipoId, clasificados }: Props) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">Aún no hay equipos en esta liga.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-black/5 bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Tabla de posiciones</caption>
          <thead className="bg-[#00305B] text-white text-xs uppercase">
            <tr>
              <th scope="col" className="px-3 py-3 text-left w-10">#</th>
              <th scope="col" className="px-3 py-3 text-left">Equipo</th>
              <th scope="col" className="px-3 py-3 text-center" title="Puntos">Pts</th>
              {COLUMNAS.map((c) => (
                <th key={c.clave} scope="col" className="px-2 py-3 text-center hidden sm:table-cell" title={c.ayuda}>
                  <abbr title={c.ayuda} className="no-underline">{c.titulo}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const mio = f.equipo.id === miEquipoId;
              const clasifica = clasificados != null && i < clasificados;
              return (
                <tr key={f.equipo.id} className={`border-t border-gray-100 ${mio ? "bg-[#F28C28]/10 font-semibold" : ""}`}>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${clasifica ? "bg-emerald-100 text-emerald-700" : "text-gray-500"}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <EscudoEquipo nombre={f.equipo.nombre} logoUrl={f.equipo.logo_url} size="sm" />
                      <span className="truncate text-gray-900">{f.equipo.nombre}</span>
                      {mio && <span className="text-[10px] font-bold uppercase text-[#F28C28] shrink-0">Tu equipo</span>}
                    </div>
                    <p className="sm:hidden text-[11px] text-gray-500 mt-0.5 font-normal">
                      PJ {f.pj} · {f.pg}G {f.pe}E {f.pp}P · DG {f.dg > 0 ? `+${f.dg}` : f.dg}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-center font-black text-[#00305B]">{f.pts}</td>
                  {COLUMNAS.map((c) => (
                    <td key={c.clave} className="px-2 py-2.5 text-center text-gray-700 hidden sm:table-cell">
                      {c.clave === "dg" && f.dg > 0 ? `+${f.dg}` : f[c.clave]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {clasificados != null && (
        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-100 ring-1 ring-emerald-300" aria-hidden />
          Clasifican a playoffs los {clasificados} primeros.
        </p>
      )}
    </div>
  );
}
