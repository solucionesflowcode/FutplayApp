"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Camera, Download, Heart, MessageCircle } from "lucide-react";
import { cambiarMeGusta, getFotosLiga } from "@/data/ligas";
import { etiquetaPartido, filtrarPartidos, urlDescarga, type FiltroFotos, type LigaFotoVista } from "@/lib/liga-fotos";
import { ETIQUETA_FASE, FASES_PLAYOFF, type LigaEquipoBase, type LigaFase, type LigaPartido } from "@/lib/liga-tabla";
import FotoVisor from "./FotoVisor";

const CLASE_SELECT = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-[#00305B] disabled:bg-gray-50 disabled:text-gray-400";

/** "generales", "jornada:2" o "fase:final"; "" es sin filtro. */
function valorEtapa(filtro: FiltroFotos): string {
  if (filtro.generales) return "generales";
  if (filtro.jornada !== undefined) return `jornada:${filtro.jornada}`;
  return filtro.fase ? `fase:${filtro.fase}` : "";
}

function filtroEtapa(valor: string, equipoId: string | undefined): FiltroFotos {
  if (valor === "generales") return { generales: true };
  const [tipo, dato] = valor.split(":");
  const base: FiltroFotos = equipoId ? { equipo_id: equipoId } : {};
  if (tipo === "jornada") return { ...base, jornada: Number(dato) };
  if (tipo === "fase") return { ...base, fase: dato as LigaFase };
  return base;
}

export default function FotosGaleria({ ligaId, partidos, equipos }: { ligaId: string; partidos: LigaPartido[]; equipos: LigaEquipoBase[] }) {
  const [filtro, setFiltro] = useState<FiltroFotos>({});
  const [fotos, setFotos] = useState<LigaFotoVista[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [enComentarios, setEnComentarios] = useState(false);
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());
  const [errorMeGusta, setErrorMeGusta] = useState<string | null>(null);
  // Si cambia el filtro mientras se carga "Ver más", esa respuesta ya no sirve.
  const consulta = useRef(0);

  useEffect(() => {
    let vigente = true;
    getFotosLiga(ligaId, filtro)
      .then((p) => {
        if (!vigente) return;
        setFotos(p.fotos);
        setSiguiente(p.siguiente);
        setError(false);
      })
      .catch(() => { if (vigente) setError(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [ligaId, filtro, intento]);

  const cambiarFiltro = (nuevo: FiltroFotos) => {
    consulta.current++;
    setCargandoMas(false);
    setCargando(true);
    setFiltro(nuevo);
  };

  /** Devuelve cuántas fotos llegaron. */
  const cargarMas = async (): Promise<number> => {
    if (!siguiente || cargandoMas) return 0;
    const esta = consulta.current;
    setCargandoMas(true);
    try {
      const p = await getFotosLiga(ligaId, filtro, siguiente);
      if (esta !== consulta.current) return 0;
      setFotos((actuales) => [...actuales, ...p.fotos]);
      setSiguiente(p.siguiente);
      return p.fotos.length;
    } catch {
      if (esta === consulta.current) setError(true);
      return 0;
    } finally {
      if (esta === consulta.current) setCargandoMas(false);
    }
  };

  const abrir = (indice: number, comentarios: boolean) => {
    setEnComentarios(comentarios);
    setAbierta(indice);
  };

  const actualizarFoto = (id: string, cambios: Partial<LigaFotoVista>) => {
    setFotos((actuales) => actuales.map((f) => (f.id === id ? { ...f, ...cambios } : f)));
  };

  /** Cambia el "me gusta" al tiro y lo revierte si falla. Devuelve el mensaje de error, si lo hubo. */
  const alternarMeGusta = async (id: string): Promise<string | null> => {
    const foto = fotos.find((f) => f.id === id);
    if (!foto || pendientes.has(id)) return null;
    const nuevo = !foto.me_gusta;
    setPendientes((p) => new Set(p).add(id));
    actualizarFoto(id, { me_gusta: nuevo, me_gusta_total: foto.me_gusta_total + (nuevo ? 1 : -1) });
    try {
      const r = await cambiarMeGusta(id, nuevo);
      actualizarFoto(id, { me_gusta: r.me_gusta, me_gusta_total: r.total });
      return null;
    } catch (e) {
      actualizarFoto(id, { me_gusta: foto.me_gusta, me_gusta_total: foto.me_gusta_total });
      return (e as Error).message;
    } finally {
      setPendientes((p) => {
        const resto = new Set(p);
        resto.delete(id);
        return resto;
      });
    }
  };

  const etiquetaDe = (foto: LigaFotoVista) => {
    const partido = partidos.find((p) => p.id === foto.partido_id);
    return partido ? etiquetaPartido(partido, equipos) : null;
  };

  const jornadas = [...new Set(partidos.filter((p) => p.fase === "regular" && p.jornada != null).map((p) => p.jornada as number))].sort((a, b) => a - b);
  const fases = FASES_PLAYOFF.filter((f) => partidos.some((p) => p.fase === f));
  const opcionesPartido = filtrarPartidos(partidos, { jornada: filtro.jornada, fase: filtro.fase, equipo_id: filtro.equipo_id });
  const hayFiltro = Object.keys(filtro).length > 0;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <label className="text-xs font-semibold text-gray-600">
          <span className="block mb-1">Fecha</span>
          <select className={CLASE_SELECT} value={valorEtapa(filtro)} onChange={(e) => cambiarFiltro(filtroEtapa(e.target.value, filtro.equipo_id))}>
            <option value="">Todas</option>
            <option value="generales">Generales de la liga</option>
            {jornadas.map((j) => <option key={j} value={`jornada:${j}`}>Jornada {j}</option>)}
            {fases.map((f) => <option key={f} value={`fase:${f}`}>{ETIQUETA_FASE[f]}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          <span className="block mb-1">Equipo</span>
          <select
            className={CLASE_SELECT}
            disabled={filtro.generales}
            value={filtro.equipo_id ?? ""}
            onChange={(e) => cambiarFiltro({ ...filtroEtapa(valorEtapa(filtro), undefined), ...(e.target.value ? { equipo_id: e.target.value } : {}) })}
          >
            <option value="">Todos</option>
            {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          <span className="block mb-1">Partido</span>
          <select
            className={CLASE_SELECT}
            disabled={filtro.generales}
            value={filtro.partido_id ?? ""}
            onChange={(e) => cambiarFiltro({ ...filtroEtapa(valorEtapa(filtro), filtro.equipo_id), ...(e.target.value ? { partido_id: e.target.value } : {}) })}
          >
            <option value="">Todos</option>
            {opcionesPartido.map((p) => <option key={p.id} value={p.id}>{etiquetaPartido(p, equipos)}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="bg-white rounded-xl ring-1 ring-black/5 p-8 text-center mb-4">
          <p className="text-gray-700">No se pudieron cargar las fotos.</p>
          <button onClick={() => { setError(false); setCargando(true); setIntento((n) => n + 1); }} className="mt-3 px-4 py-2 rounded-lg bg-[#00305B] text-white text-sm font-semibold">Reintentar</button>
        </div>
      )}

      {cargando && <p className="py-12 text-center text-sm text-gray-500">Cargando fotos...</p>}

      {!cargando && !error && fotos.length === 0 && (
        <div className="bg-white rounded-xl ring-1 ring-black/5 p-10 text-center">
          <Camera className="mx-auto text-gray-300 mb-3" size={40} aria-hidden />
          <p className="text-sm text-gray-600">{hayFiltro ? "No hay fotos con estos filtros." : "Aún no hay fotos de esta liga."}</p>
        </div>
      )}

      {!cargando && fotos.length > 0 && (
        <>
          {errorMeGusta && <p role="alert" className="text-sm text-red-600 mb-3">{errorMeGusta}</p>}
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {fotos.map((f, i) => (
              <li key={f.id} className="bg-white rounded-xl ring-1 ring-black/5 overflow-hidden flex flex-col">
                <button type="button" onClick={() => abrir(i, false)} aria-label={`Ver foto: ${f.pie ?? etiquetaDe(f) ?? "general de la liga"}`} className="group block w-full aspect-square overflow-hidden bg-gray-100">
                  <img src={f.miniatura_url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                </button>
                {f.pie && <p className="px-2.5 pt-2 text-xs text-gray-700 truncate" title={f.pie}>{f.pie}</p>}
                <div className="mt-auto px-1 py-1 flex items-center">
                  <button
                    type="button"
                    aria-pressed={f.me_gusta}
                    aria-label={`Me gusta (${f.me_gusta_total})`}
                    disabled={pendientes.has(f.id)}
                    onClick={async () => setErrorMeGusta(await alternarMeGusta(f.id))}
                    className={`inline-flex items-center gap-1 p-2 rounded-lg text-xs font-semibold hover:bg-gray-100 ${f.me_gusta ? "text-rose-600" : "text-gray-600"}`}
                  >
                    <Heart size={16} aria-hidden fill={f.me_gusta ? "currentColor" : "none"} />{f.me_gusta_total}
                  </button>
                  <button
                    type="button"
                    aria-label={`Comentarios (${f.comentarios_total})`}
                    onClick={() => abrir(i, true)}
                    className="inline-flex items-center gap-1 p-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    <MessageCircle size={16} aria-hidden />{f.comentarios_total}
                  </button>
                  <a href={urlDescarga(f)} aria-label="Descargar foto" className="ml-auto p-2 rounded-lg text-gray-600 hover:bg-gray-100">
                    <Download size={16} aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
          {siguiente && (
            <div className="mt-5 text-center">
              <button onClick={cargarMas} disabled={cargandoMas} className="px-4 py-2 rounded-lg bg-white ring-1 ring-black/10 text-sm font-semibold text-[#00305B] disabled:opacity-50">
                {cargandoMas ? "Cargando..." : "Ver más"}
              </button>
            </div>
          )}
        </>
      )}

      {abierta !== null && fotos[abierta] && (
        <FotoVisor
          foto={fotos[abierta]}
          etiqueta={etiquetaDe(fotos[abierta])}
          enfocarComentario={enComentarios}
          meGustaPendiente={pendientes.has(fotos[abierta].id)}
          onMeGusta={() => alternarMeGusta(fotos[abierta].id)}
          hayAnterior={abierta > 0}
          haySiguiente={abierta < fotos.length - 1 || !!siguiente}
          onAnterior={() => setAbierta(abierta - 1)}
          onSiguiente={async () => {
            if (abierta < fotos.length - 1) setAbierta(abierta + 1);
            else if ((await cargarMas()) > 0) setAbierta(abierta + 1);
          }}
          onCerrar={() => setAbierta(null)}
          onActualizar={(cambios) => actualizarFoto(fotos[abierta].id, cambios)}
        />
      )}
    </div>
  );
}
