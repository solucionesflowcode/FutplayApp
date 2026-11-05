"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, CalendarDays, ListOrdered, Swords } from "lucide-react";
import { getLigaAdmin, type LigaDetalleAdmin } from "@/data/ligas-admin";
import { calcularTabla } from "@/lib/liga-tabla";
import TablaPosiciones from "@/components/liga/TablaPosiciones";
import EquiposPanel from "@/components/admin/ligas/EquiposPanel";
import FixturePanel from "@/components/admin/ligas/FixturePanel";
import PlayoffsPanel from "@/components/admin/ligas/PlayoffsPanel";
import { Button, PageHeader, StatusBadge } from "@/components/admin/ui";

const PESTANAS = [
  { id: "equipos", etiqueta: "Equipos y planteles", icono: Users },
  { id: "fixture", etiqueta: "Fixture", icono: CalendarDays },
  { id: "tabla", etiqueta: "Tabla", icono: ListOrdered },
  { id: "playoffs", etiqueta: "Playoffs", icono: Swords },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

export default function LigaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [datos, setDatos] = useState<LigaDetalleAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("equipos");

  const cargar = useCallback(async () => {
    try {
      setDatos(await getLigaAdmin(id));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <Link href="/admin/ligas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3">
          <ArrowLeft size={15} aria-hidden /> Volver a ligas
        </Link>

        {error && (
          <div className="bg-white rounded-xl ring-1 ring-black/5 p-8 text-center">
            <p className="text-gray-700">{error}</p>
            <Button variante="secundario" className="mt-3" onClick={cargar}>Reintentar</Button>
          </div>
        )}

        {!error && !datos && <p className="py-12 text-center text-gray-500">Cargando liga...</p>}

        {datos && (
          <>
            <PageHeader
              titulo={datos.liga.nombre}
              descripcion={<span className="inline-flex items-center gap-2">{datos.liga.temporada && <span>{datos.liga.temporada}</span>}<StatusBadge estado={datos.liga.estado} /></span>}
            >
              <div role="tablist" aria-label="Secciones de la liga" className="flex gap-1 overflow-x-auto border-b border-gray-200">
                {PESTANAS.map((p) => {
                  const Icono = p.icono;
                  const activa = pestana === p.id;
                  return (
                    <button key={p.id} role="tab" aria-selected={activa} onClick={() => setPestana(p.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${activa ? "border-marca text-marca" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                      <Icono size={16} aria-hidden /> {p.etiqueta}
                    </button>
                  );
                })}
              </div>
            </PageHeader>

            <div role="tabpanel">
              {pestana === "equipos" && <EquiposPanel ligaId={id} equipos={datos.equipos} jugadores={datos.jugadores} onCambio={cargar} />}
              {pestana === "fixture" && <FixturePanel ligaId={id} equipos={datos.equipos} partidos={datos.partidos} onCambio={cargar} />}
              {pestana === "tabla" && (
                <TablaPosiciones filas={calcularTabla(datos.equipos, datos.partidos)} clasificados={datos.liga.clasificados_playoff} />
              )}
              {pestana === "playoffs" && (
                <PlayoffsPanel ligaId={id} clasificados={datos.liga.clasificados_playoff} equipos={datos.equipos} partidos={datos.partidos} onCambio={cargar} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
