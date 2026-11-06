"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { Trophy, ListOrdered, CalendarDays, Users, Info } from "lucide-react";
import TopNavBarUser from "@/components/navbars/TopNavBarUser";
import { getMiLiga, type MiLigaRespuesta } from "@/data/ligas";
import { POSICIONES } from "@/lib/posiciones";
import TablaGoleadores from "@/components/liga/TablaGoleadores";
import TablaPosiciones from "@/components/liga/TablaPosiciones";
import FixtureLista from "@/components/liga/FixtureLista";
import CampeonBanner from "@/components/liga/CampeonBanner";
import EscudoEquipo from "@/components/liga/EscudoEquipo";

const PESTANAS = [
    { id: "tabla", etiqueta: "Tabla", icono: ListOrdered },
    { id: "fixture", etiqueta: "Fixture y resultados", icono: CalendarDays },
    { id: "equipos", etiqueta: "Equipos", icono: Users },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"];

const etiquetaPosicion = (v: string | null) => POSICIONES.find((p) => p.valor === v)?.etiqueta ?? null;

export default function MiLigaPage() {
    const [datos, setDatos] = useState<MiLigaRespuesta | null>(null);
    const [error, setError] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [pestana, setPestana] = useState<Pestana>("tabla");
    const [soloMios, setSoloMios] = useState(false);

    const cargar = useCallback(async (id?: string) => {
        setCargando(true);
        try {
            setDatos(await getMiLiga(id));
            setError(false);
        } catch {
            setError(true);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const detalle = datos?.detalle ?? null;
    const miEquipo = detalle?.equipos.find((e) => e.id === detalle.miEquipoId) ?? null;
    const partidosVisibles = detalle && soloMios && miEquipo
        ? detalle.partidos.filter((p) => p.local_id === miEquipo.id || p.visita_id === miEquipo.id)
        : detalle?.partidos ?? [];

    return (
        <div className="min-h-full bg-[#f8f9fb] pb-12">
            <TopNavBarUser />

            <div className="px-4 md:px-8 lg:px-10 pt-6 md:pt-8 max-w-6xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                    <div>
                        <div className="w-12 h-1 bg-[#F28C28] rounded-full mb-3" />
                        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#00305B]">Liga SportTrade 2026</h1>
                        <p className="text-gray-500 mt-1.5 text-sm md:text-base">Tabla de posiciones, fixture y equipos.</p>
                    </div>
                    {datos && datos.ligas.length > 1 && (
                        <label className="text-sm text-gray-600 flex flex-col gap-1">
                            <span className="text-xs font-semibold">Liga</span>
                            <select
                                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-[#00305B]"
                                value={detalle?.liga.id ?? ""}
                                onChange={(e) => cargar(e.target.value)}
                            >
                                {datos.ligas.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.nombre}{l.temporada ? ` · ${l.temporada}` : ""}{l.estado === "finalizada" ? " (finalizada)" : ""}{l.inscrito ? " ★" : ""}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>

                {cargando && !datos && <p className="py-16 text-center text-gray-500">Cargando liga...</p>}

                {error && (
                    <div className="bg-white rounded-xl ring-1 ring-black/5 p-8 text-center">
                        <p className="text-gray-700">No se pudo cargar la liga.</p>
                        <button onClick={() => cargar(detalle?.liga.id)} className="mt-3 px-4 py-2 rounded-lg bg-[#00305B] text-white text-sm font-semibold">Reintentar</button>
                    </div>
                )}

                {datos && !detalle && !error && (
                    <div className="bg-white rounded-xl ring-1 ring-black/5 p-10 text-center">
                        <Trophy className="mx-auto text-gray-300 mb-3" size={40} aria-hidden />
                        <p className="font-semibold text-gray-800">Todavía no hay ligas activas.</p>
                        <p className="text-sm text-gray-500 mt-1">Cuando el club publique una liga la verás aquí.</p>
                    </div>
                )}

                {detalle && (
                    <div className={cargando ? "opacity-60 transition-opacity" : ""}>
                        {miEquipo ? (
                            <div className="mb-6 rounded-xl bg-gradient-to-r from-[#00305B] to-[#001c37] text-white p-5 flex items-center gap-4 border-t-2 border-t-[#F28C28]">
                                <EscudoEquipo nombre={miEquipo.nombre} logoUrl={miEquipo.logo_url} size="lg" />
                                <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wide text-white/60 font-bold">Tu equipo</p>
                                    <p className="text-xl font-black truncate">{miEquipo.nombre}</p>
                                    {(() => {
                                        const pos = detalle.tabla.findIndex((f) => f.equipo.id === miEquipo.id);
                                        const fila = detalle.tabla[pos];
                                        return fila ? <p className="text-sm text-white/70">{pos + 1}° lugar · {fila.pts} pts · {fila.pj} PJ</p> : null;
                                    })()}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 rounded-xl bg-sky-50 text-sky-900 p-4 flex items-start gap-3 text-sm">
                                <Info size={18} className="shrink-0 mt-0.5" aria-hidden />
                                <p>No estás inscrito en esta liga. Puedes ver la tabla y los resultados; para jugar, habla con el administrador del club.</p>
                            </div>
                        )}

                        <CampeonBanner partidos={detalle.partidos} equipos={detalle.equipos} />

                        <div role="tablist" aria-label="Secciones de la liga" className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-5">
                            {PESTANAS.map((p) => {
                                const Icono = p.icono;
                                const activa = pestana === p.id;
                                return (
                                    <button key={p.id} role="tab" aria-selected={activa} onClick={() => setPestana(p.id)}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${activa ? "border-[#F28C28] text-[#00305B]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                                        <Icono size={16} aria-hidden /> {p.etiqueta}
                                    </button>
                                );
                            })}
                        </div>

                        <div role="tabpanel">
                            {pestana === "tabla" && (
                                <>
                                    <TablaPosiciones filas={detalle.tabla} miEquipoId={detalle.miEquipoId} clasificados={detalle.liga.clasificados_playoff} />
                                    <TablaGoleadores partidos={detalle.partidos} equipos={detalle.equipos} miEquipoId={detalle.miEquipoId} />
                                </>
                            )}

                            {pestana === "fixture" && (
                                <>
                                    {miEquipo && (
                                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
                                            <input type="checkbox" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} className="accent-[#F28C28] w-4 h-4" />
                                            Solo mis partidos
                                        </label>
                                    )}
                                    <FixtureLista partidos={partidosVisibles} equipos={detalle.equipos} miEquipoId={detalle.miEquipoId} />
                                </>
                            )}

                            {pestana === "equipos" && (
                                detalle.equipos.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-gray-500">Aún no hay equipos.</p>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {[...detalle.equipos]
                                            .sort((a, b) => (a.id === detalle.miEquipoId ? -1 : b.id === detalle.miEquipoId ? 1 : 0))
                                            .map((e) => {
                                                const plantel = detalle.jugadores
                                                    .filter((j) => j.equipo_id === e.id)
                                                    .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999) || a.nombre.localeCompare(b.nombre, "es"));
                                                return (
                                                    <section key={e.id} className={`bg-white rounded-xl p-4 ring-1 ${e.id === detalle.miEquipoId ? "ring-2 ring-[#F28C28]" : "ring-black/5"}`}>
                                                        <header className="flex items-center gap-3 mb-3">
                                                            <EscudoEquipo nombre={e.nombre} logoUrl={e.logo_url} size="lg" />
                                                            <div className="min-w-0">
                                                                <h2 className="font-bold text-[#00305B] truncate">{e.nombre}</h2>
                                                                <p className="text-xs text-gray-500">{e.sede?.nombre ? `${e.sede.nombre} · ` : ""}{plantel.length} jugador(es)</p>
                                                            </div>
                                                        </header>
                                                        <ul className="divide-y divide-gray-100">
                                                            {plantel.map((j, i) => (
                                                                <li key={i} className="py-2 flex items-center gap-3">
                                                                    <span className="w-6 text-center text-xs font-bold text-[#00305B]">{j.numero ?? "–"}</span>
                                                                    {j.foto_url ? (
                                                                        <img src={j.foto_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                                                                    ) : (
                                                                        <span aria-hidden className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">{j.nombre.slice(0, 1).toUpperCase()}</span>
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm text-gray-900 truncate">{j.nombre}</p>
                                                                        {etiquetaPosicion(j.posicion) && <p className="text-[11px] text-gray-500">{etiquetaPosicion(j.posicion)}</p>}
                                                                    </div>
                                                                </li>
                                                            ))}
                                                            {plantel.length === 0 && <li className="py-2 text-xs text-gray-500">Plantel por confirmar.</li>}
                                                        </ul>
                                                    </section>
                                                );
                                            })}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
