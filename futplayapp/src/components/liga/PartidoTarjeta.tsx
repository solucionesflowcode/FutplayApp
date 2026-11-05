import type { ReactNode } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { LigaEquipoBase, LigaPartido } from "@/lib/liga-tabla";
import { ganador } from "@/lib/liga-playoffs";
import { formatearFechaHora } from "@/lib/fechas";
import EscudoEquipo from "./EscudoEquipo";

type Props = {
  partido: LigaPartido;
  equipos: Map<string, LigaEquipoBase>;
  /** Partido del equipo del jugador. */
  destacado?: boolean;
  /** Botones del admin (editar, resultado…). */
  acciones?: ReactNode;
};

function Equipo({ e, lado, gano }: { e?: LigaEquipoBase; lado: "local" | "visita"; gano: boolean }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 flex-1 ${lado === "visita" ? "flex-row-reverse text-right" : ""}`}>
      <EscudoEquipo nombre={e?.nombre ?? "?"} logoUrl={e?.logo_url} />
      <span className={`truncate text-sm ${gano ? "font-bold text-gray-900" : "text-gray-700"}`}>{e?.nombre ?? "Equipo eliminado"}</span>
    </div>
  );
}

export default function PartidoTarjeta({ partido: p, equipos, destacado, acciones }: Props) {
  const local = equipos.get(p.local_id);
  const visita = equipos.get(p.visita_id);
  const jugado = p.estado === "jugado";
  const gana = ganador(p);
  const hayPenales = p.penales_local != null && p.penales_visita != null;
  // El partido se juega en la sede del equipo local.
  const lugar = [local?.sede?.nombre, p.cancha].filter(Boolean).join(" · ");

  return (
    <article className={`rounded-xl bg-white p-3 sm:p-4 ring-1 ${destacado ? "ring-[#F28C28] ring-2" : "ring-black/5"}`}>
      <div className="flex items-center gap-2 sm:gap-4">
        <Equipo e={local} lado="local" gano={jugado && gana === local?.id} />
        <div className="text-center shrink-0 min-w-[64px]">
          {jugado ? (
            <>
              <p className="text-xl font-black text-[#00305B] tabular-nums">{p.goles_local} – {p.goles_visita}</p>
              {hayPenales && <p className="text-[11px] text-gray-500">Penales {p.penales_local}–{p.penales_visita}</p>}
            </>
          ) : p.estado === "suspendido" ? (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 rounded px-2 py-1">Suspendido</p>
          ) : (
            <p className="text-sm font-bold text-gray-400">vs</p>
          )}
        </div>
        <Equipo e={visita} lado="visita" gano={jugado && gana === visita?.id} />
      </div>

      {(p.fecha_hora || lugar || acciones) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {p.fecha_hora && (
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden />{formatearFechaHora(p.fecha_hora)}</span>
            )}
            {lugar && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden />{lugar}</span>}
          </div>
          {acciones && <div className="flex gap-1">{acciones}</div>}
        </div>
      )}
    </article>
  );
}
