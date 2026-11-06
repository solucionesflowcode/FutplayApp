import { calcularGoleadores } from "@/lib/liga-goles";
import type { LigaEquipoBase, LigaPartido } from "@/lib/liga-tabla";
import EscudoEquipo from "./EscudoEquipo";

type Props = {
  partidos: LigaPartido[];
  equipos: LigaEquipoBase[];
  /** Resalta a los jugadores del equipo del usuario. */
  miEquipoId?: string | null;
};

export default function TablaGoleadores({ partidos, equipos, miEquipoId }: Props) {
  const goleadores = calcularGoleadores(partidos);
  const equipoPorId = new Map(equipos.map((e) => [e.id, e]));

  return (
    <section aria-labelledby="titulo-goleadores" className="mt-8">
      <h2 id="titulo-goleadores" className="text-lg font-bold text-[#00305B] mb-3">Goleadores</h2>
      {goleadores.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 bg-white rounded-xl ring-1 ring-black/5">Aún no hay goles con autor registrado.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl ring-1 ring-black/5 bg-white">
            <table className="w-full text-sm">
              <caption className="sr-only">Tabla de goleadores</caption>
              <thead className="bg-[#00305B] text-white text-xs uppercase">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left w-10">#</th>
                  <th scope="col" className="px-3 py-3 text-left">Jugador</th>
                  <th scope="col" className="px-3 py-3 text-left">Equipo</th>
                  <th scope="col" className="px-3 py-3 text-center">Goles</th>
                </tr>
              </thead>
              <tbody>
                {goleadores.map((g) => {
                  const equipo = equipoPorId.get(g.equipo_id);
                  const mio = g.equipo_id === miEquipoId;
                  return (
                    <tr key={g.jugador_id} className={`border-t border-gray-100 ${mio ? "bg-[#F28C28]/10 font-semibold" : ""}`}>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-500">{g.posicion}</td>
                      <td className="px-3 py-2.5 text-gray-900">{g.nombre}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <EscudoEquipo nombre={equipo?.nombre ?? "?"} logoUrl={equipo?.logo_url} size="sm" />
                          <span className="truncate text-gray-700">{equipo?.nombre ?? "Equipo"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-black text-[#00305B]">{g.goles}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">Incluye fase regular y playoffs. No cuenta autogoles ni goles sin autor.</p>
        </>
      )}
    </section>
  );
}
