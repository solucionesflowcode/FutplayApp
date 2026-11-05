import { Trophy } from "lucide-react";
import type { LigaEquipoBase, LigaPartido } from "@/lib/liga-tabla";
import { ganador } from "@/lib/liga-playoffs";
import EscudoEquipo from "./EscudoEquipo";

/** Muestra al campeón cuando la final ya tiene ganador; si no, nada. */
export default function CampeonBanner({ partidos, equipos }: { partidos: LigaPartido[]; equipos: LigaEquipoBase[] }) {
  const final = partidos.find((p) => p.fase === "final");
  const id = final ? ganador(final) : null;
  const campeon = equipos.find((e) => e.id === id);
  if (!campeon) return null;

  return (
    <div className="mb-6 rounded-xl bg-gradient-to-r from-[#00305B] to-[#001c37] text-white p-5 flex items-center gap-4 border-t-2 border-t-[#F28C28]">
      <Trophy className="text-[#F28C28] shrink-0" size={36} aria-hidden />
      <EscudoEquipo nombre={campeon.nombre} logoUrl={campeon.logo_url} size="lg" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-white/60 font-bold">Campeón</p>
        <p className="text-xl font-black truncate">{campeon.nombre}</p>
      </div>
    </div>
  );
}
