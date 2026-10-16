"use client";

import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import {
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getAdminMembresias, type MembresiaConPlan } from "@/data/membresia";
import { getPlanesAdmin, type Plan } from "@/data/plans";
import { getChileMonthBounds, hoyChile, mesChile } from "@/lib/fechas";
import { membresiasActuales } from "@/lib/membresia-actual";
import { membresiaVigente, porcentajeConPlanActivo } from "@/lib/analiticas";
import { coincideSede, SIN_SEDE, type FiltroSede } from "@/lib/sedes";
import { CLASE_INPUT, PageHeader, StatCard } from "@/components/admin/ui";

type Resumen = {
  totalAlumnos: number;
  /** null si la API de ingresos falló (ANA-02): no se inventa el número. */
  ingresosMes: number | null;
  membresiasActivas: number;
  /** ANA-01: % de alumnos con un plan vigente (no es retención). */
  conPlanActivo: number;
};

type MembresiaPorMes = {
  mes: string;
  total: number;
  count: number;
};

type IngresoMensual = {
  mes: string;
  ingresos: number;
  membresias?: number;
  transacciones: number;
};

type MesData = {
  mes: string;
  label: string;
  membresias: number;
  ingresos: number;
  transacciones: number;
  vsAnterior: number | null;
  acumulado: number;
};

type PlanDistribucion = {
  nombre: string;
  count: number;
  color: string;
};

const PLAN_COLORS = ["#F28C28", "#004080", "#00A86B", "#8B5CF6", "#EC4899"];

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

type UsuarioSede = { id: string; rol: string; sede_id: string | null };

async function getIngresosMensuales(sede: FiltroSede): Promise<{ datos: IngresoMensual[]; error: boolean }> {
  try {
    const res = await fetch(sede ? `/api/admin/analiticas/mensual?sede=${encodeURIComponent(sede)}` : "/api/admin/analiticas/mensual");
    if (!res.ok) return { datos: [], error: true };
    return { datos: await res.json(), error: false };
  } catch {
    return { datos: [], error: true };
  }
}

export default function AnaliticasPage() {
  const [loading, setLoading] = useState(true);
  const [errorIngresos, setErrorIngresos] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioSede[]>([]);
  const [todasMembresias, setTodasMembresias] = useState<MembresiaConPlan[]>([]);
  const [sedes, setSedes] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroSede, setFiltroSede] = useState<FiltroSede>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [ingresosMensuales, setIngresosMensuales] = useState<IngresoMensual[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();

        const [usuariosRes, sedesRes] = await Promise.all([
          supabase.from("usuario").select("id, rol, sede_id"),
          supabase.from("sede").select("id, nombre").order("nombre"),
        ]);
        if (usuariosRes.error) throw usuariosRes.error;

        // Solo las membresías con boleta (Flow o N° de boleta externa) cuentan.
        // Todas: las ventas cuentan cada una; "vigentes" usa la actual de cada alumno.
        const [membresiasData, planesResult] = await Promise.all([
          getAdminMembresias({ conBoleta: true, todas: true }),
          getPlanesAdmin(),
        ]);

        setUsuarios((usuariosRes.data || []) as UsuarioSede[]);
        setSedes(sedesRes.data || []);
        setTodasMembresias(membresiasData);
        setPlanes(planesResult.planes);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Error al cargar las analíticas");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Los ingresos se calculan en el servidor: se vuelven a pedir al cambiar de sede.
  useEffect(() => {
    let cancelado = false;
    getIngresosMensuales(filtroSede).then((r) => {
      if (cancelado) return;
      setIngresosMensuales(r.datos);
      setErrorIngresos(r.error);
    });
    return () => { cancelado = true; };
  }, [filtroSede]);

  // Ventas: todas las membresías con boleta de la sede elegida.
  const membresias = useMemo(
    () => todasMembresias.filter((m) => coincideSede(m.sede_id, filtroSede)),
    [todasMembresias, filtroSede],
  );
  // Estado de hoy: la membresía actual de cada alumno (misma regla que Gestión de membresías).
  const actuales = useMemo(() => Array.from(membresiasActuales(membresias).values()), [membresias]);

  const resumen = useMemo<Resumen>(() => {
    const alumnoIds = new Set(usuarios.filter((u) => u.rol === "jugador" && coincideSede(u.sede_id, filtroSede)).map((u) => u.id));
    const { startISO } = getChileMonthBounds();
    const hoy = hoyChile();
    // ANA-02: si la API de ingresos falla se muestra el error; antes se
    // estimaba sumando precios de planes (incluidas membresías regaladas).
    const ingresosMes = errorIngresos ? null : ingresosMensuales.find((i) => i.mes === startISO.slice(0, 7))?.ingresos ?? 0;
    return {
      totalAlumnos: alumnoIds.size,
      ingresosMes,
      membresiasActivas: actuales.filter((m) => membresiaVigente(m, hoy)).length,
      conPlanActivo: porcentajeConPlanActivo(actuales, alumnoIds, hoy),
    };
  }, [usuarios, actuales, filtroSede, ingresosMensuales, errorIngresos]);

  // Close month dropdown on outside click
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showMonthDropdown) return;
    const handler = (e: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setShowMonthDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMonthDropdown]);

  const membresiasPorMes = useMemo<MembresiaPorMes[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    membresias.forEach((m) => {
      const mesKey = m.fecha_inicio ? mesChile(m.fecha_inicio) : null;
      if (!mesKey) return;
      const prev = map.get(mesKey) || { total: 0, count: 0 };
      map.set(mesKey, {
        total: prev.total + (m.precio || 0),
        count: prev.count + 1,
      });
    });
    return Array.from(map.entries())
      .map(([mes, v]) => ({ mes, total: v.total, count: v.count }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [membresias]);

  const mesesData = useMemo<MesData[]>(() => {
    const ingresosMap = new Map(ingresosMensuales.map((i) => [i.mes, i]));
    const membresiasMap = new Map(membresiasPorMes.map((m) => [m.mes, m]));
    const allKeys = [...ingresosMap.keys(), ...membresiasMap.keys()];

    // Generate all months from earliest key to current month
    function monthRange(keys: string[]): string[] {
      if (!keys.length) return [];
      const earliest = keys.sort()[0];
      const [sy, sm] = earliest.split("-").map(Number);
      const now = new Date();
      const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [ey, em] = end.split("-").map(Number);
      const result: string[] = [];
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        result.push(`${y}-${String(m).padStart(2, "0")}`);
        m++; if (m > 12) { m = 1; y++; }
      }
      return result;
    }

    const sorted = monthRange(allKeys);

    let acumulado = 0;
    return sorted.map((mes, idx) => {
      const ing = ingresosMap.get(mes);
      const mem = membresiasMap.get(mes);
      const ingresos = ing?.ingresos || 0;
      acumulado += ingresos;

      const anterior = sorted[idx - 1];
      const antIngreso = anterior ? ingresosMap.get(anterior)?.ingresos || 0 : 0;
      const vsAnterior = antIngreso > 0
        ? Math.round(((ingresos - antIngreso) / antIngreso) * 100)
        : null;

      const parts = mes.split("-");
      const m = MESES[parseInt(parts[1]) - 1] || "";
      const y = parts[0];

      return {
        mes,
        label: `${m} ${y}`,
        membresias: mem?.count ?? ing?.membresias ?? 0,
        ingresos,
        transacciones: ing?.transacciones ?? 0,
        vsAnterior,
        acumulado,
      };
    });
  }, [ingresosMensuales, membresiasPorMes]);

  const planDist = useMemo<PlanDistribucion[]>(() => {
    const map = new Map<string, number>();
    membresias.forEach((m) => {
      const name = m.plan_nombre || "Sin plan";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nombre, count], i) => ({
      nombre,
      count,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
    }));
  }, [membresias]);

  const ingresosPorPlan = useMemo(() => {
    const map = new Map<string, { ingresos: number; alumnos: number }>();
    membresias.forEach((m) => {
      const name = m.plan_nombre || "Sin plan";
      const prev = map.get(name) || { ingresos: 0, alumnos: 0 };
      map.set(name, {
        ingresos: prev.ingresos + (m.precio || 0),
        alumnos: prev.alumnos + 1,
      });
    });
    return Array.from(map.entries()).map(([nombre, data], i) => ({
      nombre,
      ...data,
      color: PLAN_COLORS[i % PLAN_COLORS.length],
    }));
  }, [membresias]);

  // ── Filtered data by selected month ──
  const filteredMembresias = useMemo(() => {
    if (!selectedMonth) return membresias;
    return membresias.filter((m) => m.fecha_inicio && mesChile(m.fecha_inicio) === selectedMonth);
  }, [membresias, selectedMonth]);

  // Alumnos, membresías vigentes y % con plan son del estado actual; el mes
  // elegido solo cambia los ingresos (antes mezclaba membresías del mes con alumnos de hoy).
  const filteredResumen = useMemo<Resumen>(() => {
    if (!selectedMonth) return resumen;
    const ingresosMes = errorIngresos ? null : ingresosMensuales.find((i) => i.mes === selectedMonth)?.ingresos ?? 0;
    return { ...resumen, ingresosMes };
  }, [resumen, selectedMonth, ingresosMensuales, errorIngresos]);

  const filteredMesesData = useMemo(() => {
    if (!selectedMonth) return mesesData;
    return mesesData.filter((m) => m.mes === selectedMonth);
  }, [mesesData, selectedMonth]);

  const maxRevenue = Math.max(...filteredMesesData.map((m) => m.ingresos), 1);

  const filteredPlanDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredMembresias.forEach((m) => {
      const name = m.plan_nombre || "Sin plan";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nombre, count], i) => ({
      nombre, count, color: PLAN_COLORS[i % PLAN_COLORS.length],
    }));
  }, [filteredMembresias]);

  const filteredIngresosPorPlan = useMemo(() => {
    const map = new Map<string, { ingresos: number; alumnos: number }>();
    filteredMembresias.forEach((m) => {
      const name = m.plan_nombre || "Sin plan";
      const prev = map.get(name) || { ingresos: 0, alumnos: 0 };
      map.set(name, {
        ingresos: prev.ingresos + (m.precio || 0),
        alumnos: prev.alumnos + 1,
      });
    });
    return Array.from(map.entries()).map(([nombre, data], i) => ({
      nombre, ...data, color: PLAN_COLORS[i % PLAN_COLORS.length],
    }));
  }, [filteredMembresias]);

  const maxPlanCount = Math.max(...filteredPlanDist.map((p) => p.count), 1);
  const totalPlan = filteredPlanDist.reduce((s, p) => s + p.count, 0);

  const formatCLP = (n: number) =>
    `$${n.toLocaleString("es-CL")}`;

  const handleSelectMonth = (mes: string | null) => {
    setShowMonthDropdown(false);
    setSelectedMonth(mes);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-acento" />
          <p className="text-gray-500">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded p-6 text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div
        className="flex flex-col items-start gap-8 w-full mx-auto"
        style={{ maxWidth: "1216px" }}
      >
        {/* Section 0: Header */}
        <div className="self-stretch">
          <PageHeader titulo="Analíticas" descripcion="Estadísticas de la academia. Solo cuentan las membresías con boleta (Flow o N° de boleta).">
            <select
              aria-label="Filtrar por sede"
              value={filtroSede ?? ""}
              onChange={(e) => setFiltroSede(e.target.value || null)}
              className={`${CLASE_INPUT} py-2 w-full sm:max-w-xs`}
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              <option value={SIN_SEDE}>Sin sede asignada</option>
            </select>
          </PageHeader>
        </div>

        {/* Section 1: Stat Cards */}
        <div className="self-stretch space-y-3">
          {errorIngresos && (
            <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              No se pudieron cargar los ingresos: los montos no están disponibles. Recarga la página para reintentar.
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard etiqueta="Total alumnos" valor={filteredResumen.totalAlumnos} detalle="cuentas de jugador" icono={<Users size={18} />} />
            <StatCard
              etiqueta={selectedMonth ? "Ingresos del mes elegido" : "Ingresos del mes"}
              valor={filteredResumen.ingresosMes === null ? "No disponible" : formatCLP(filteredResumen.ingresosMes)}
              detalle="membresías con boleta"
              icono={<DollarSign size={18} />}
              tono={filteredResumen.ingresosMes === null ? "peligro" : "exito"}
            />
            <StatCard etiqueta="Membresías vigentes" valor={filteredResumen.membresiasActivas} detalle="activas, con tokens y sin vencer" icono={<CreditCard size={18} />} tono="alerta" />
            <StatCard etiqueta="% con plan activo" valor={`${filteredResumen.conPlanActivo}%`} detalle="de los alumnos tiene un plan vigente hoy" icono={<TrendingUp size={18} />} />
          </div>
        </div>

        {/* Section 2: Ingresos Mensuales */}
        <div className="flex-none self-stretch z-0">
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Ingresos Mensuales
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedMonth
                      ? `Ingresos del mes de ${(() => { const p = selectedMonth.split("-"); return `${MESES[parseInt(p[1]) - 1]} ${p[0]}`; })()}`
                      : "Evolución de ingresos mes a mes desde el primer registro"}
                  </p>
                </div>
                {/* Month selector inside chart */}
                <div className="relative" ref={monthDropdownRef}>
                  <button
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 min-w-[120px]"
                  >
                    {(() => {
                      if (!selectedMonth) return "Todos los meses";
                      const parts = selectedMonth.split("-");
                      return `${MESES[parseInt(parts[1]) - 1]} ${parts[0]}`;
                    })()}
                    <ChevronDown size={14} />
                  </button>
                  {showMonthDropdown && (
                    <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => handleSelectMonth(null)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 font-medium"
                      >
                        Todos los meses
                      </button>
                      <div className="border-t border-gray-100 mx-2" />
                      {mesesData.map((m) => (
                        <button
                          key={m.mes}
                          onClick={() => handleSelectMonth(m.mes)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedMonth === m.mes ? "bg-orange-50 text-orange-800 font-bold" : "text-gray-700"}`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {!selectedMonth && (() => {
                const last = mesesData[mesesData.length - 1];
                const prev = mesesData[mesesData.length - 2];
                if (!last || !prev || prev.ingresos === 0) return null;
                const up = last.ingresos >= prev.ingresos;
                const diff = last.ingresos - prev.ingresos;
                const pct = prev.ingresos > 0 ? Math.round((diff / prev.ingresos) * 100) : 0;
                return (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {pct}% vs mes anterior
                  </div>
                );
              })()}
            </div>
            {filteredMesesData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                {errorIngresos ? "Ingresos no disponibles: no se pudo consultar la API." : "No hay datos de ingresos aún"}
              </p>
            ) : (
              <>
                {/* Bar Chart */}
                <div className="overflow-x-auto pb-2">
                <div className="flex items-end gap-3 h-48 mb-6 min-w-[500px]">
                  {filteredMesesData.map((item) => {
                    const BAR_PX = 192;
                    const pixelHeight = Math.max((item.ingresos / maxRevenue) * BAR_PX, 4);
                    const isLast = item.mes === filteredMesesData[filteredMesesData.length - 1]?.mes;
                    const colors = [
                      "from-blue-500 to-blue-400",
                      "from-emerald-500 to-emerald-400",
                      "from-violet-500 to-violet-400",
                      "from-rose-500 to-rose-400",
                      "from-amber-500 to-amber-400",
                      "from-cyan-500 to-cyan-400",
                    ];
                    const barColor = isLast
                      ? "from-acento to-[#F5A623]"
                      : "from-blue-500 to-blue-400";
                    return (
                      <div key={item.mes} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCLP(item.ingresos)}
                        </span>
                        <div className="relative w-full flex justify-center">
                          <div
                            className={`w-full max-w-[48px] rounded-t-lg bg-gradient-to-t ${barColor} transition-all duration-500 hover:brightness-110 min-h-[4px] shadow-sm`}
                            style={{ height: `${pixelHeight}px` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">
                          {(() => {
                            const p = item.mes.split("-");
                            return `${MESES[parseInt(p[1]) - 1] || ""} '${p[0].slice(2)}`;
                          })()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                </div>

                {/* Data Table */}
                <div className="md:overflow-x-auto">
                <div className="bg-gray-50/70 rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm md:min-w-[600px]">
                    <thead className="hidden md:table-header-group">
                      <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                        <th className="p-3 pl-4 font-semibold">Mes</th>
                        <th className="p-3 font-semibold">Ingresos</th>
                        <th className="p-3 font-semibold">Ventas</th>
                        <th className="p-3 font-semibold">Membresías</th>
                        <th className="p-3 font-semibold">vs Mes Anterior</th>
                        <th className="p-3 pr-4 font-semibold text-right">Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMesesData.map((item) => {
                        const isLast = !selectedMonth && item.mes === filteredMesesData[filteredMesesData.length - 1]?.mes;
                        const barWidth = (item.ingresos / maxRevenue) * 100;
                        return (
                          <Fragment key={item.mes}>
                            {/* MOBILE CARD */}
                            <tr className="md:hidden border-b border-gray-100">
                              <td colSpan={6} className="p-0">
                                <div onClick={() => handleSelectMonth(item.mes)} className="p-3 space-y-1.5 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                                    </div>
                                    {isLast && (
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-acento animate-pulse shrink-0 ml-2" />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                                    <div><span className="text-gray-500">Ingresos: </span><span className="font-bold text-gray-900">{formatCLP(item.ingresos)}</span></div>
                                    <div><span className="text-gray-500">Ventas: </span><span className="font-medium text-gray-700">{item.transacciones}</span></div>
                                    <div><span className="text-gray-500">Membresías: </span><span className="font-medium text-gray-700">{item.membresias}</span></div>
                                  </div>
                                  <div className="flex items-center justify-between pt-0.5">
                                    <div>
                                      {item.vsAnterior !== null ? (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          item.vsAnterior >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                        }`}>
                                          {item.vsAnterior >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                          {Math.abs(item.vsAnterior)}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 text-[10px]">—</span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-500 text-[10px]">Acumulado: </span>
                                      <span className="font-semibold text-gray-900 text-[11px]">{formatCLP(item.acumulado)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {/* DESKTOP ROW */}
                            <tr onClick={() => handleSelectMonth(item.mes)} className={`hidden md:table-row border-b border-gray-100 last:border-0 hover:bg-white transition-colors cursor-pointer ${isLast ? "bg-amber-50/40" : ""}`}>
                              <td className="p-3 pl-4 font-medium text-gray-900 whitespace-nowrap">
                                {isLast && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-acento mr-2 animate-pulse" />
                                )}
                                {item.label}
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-gray-900">{formatCLP(item.ingresos)}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-gray-700">{item.transacciones}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-gray-700">{item.membresias}</span>
                              </td>
                              <td className="p-3">
                                {item.vsAnterior !== null ? (
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                                    item.vsAnterior >= 0
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  }`}>
                                    {item.vsAnterior >= 0 ? (
                                      <TrendingUp size={12} />
                                    ) : (
                                      <TrendingDown size={12} />
                                    )}
                                    {Math.abs(item.vsAnterior)}%
                                  </div>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                              <td className="p-3 pr-4 text-right">
                                <span className="font-semibold text-gray-900">{formatCLP(item.acumulado)}</span>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="hidden md:table-footer-group">
                      <tr className="bg-gray-100/60 border-t-2 border-gray-200">
                        <td className="p-3 pl-4 font-bold text-gray-700">{selectedMonth ? "Total mes" : "Total"}</td>
                        <td className="p-3 font-black text-gray-900">
                          {formatCLP(filteredMesesData.reduce((s, m) => s + m.ingresos, 0))}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {filteredMesesData.reduce((s, m) => s + m.transacciones, 0)}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {filteredMesesData.reduce((s, m) => s + m.membresias, 0)}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                  {/* MOBILE TOTALS */}
                  {filteredMesesData.length > 0 && (
                    <div className="md:hidden p-3 bg-gray-100/60 border-t-2 border-gray-200">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-gray-500 font-semibold">{selectedMonth ? "Total mes" : "Total"}: </span><span className="font-black text-gray-900">{formatCLP(filteredMesesData.reduce((s, m) => s + m.ingresos, 0))}</span></div>
                        <div><span className="text-gray-500">Ventas: </span><span className="font-bold text-gray-900">{filteredMesesData.reduce((s, m) => s + m.transacciones, 0)}</span></div>
                        <div><span className="text-gray-500">Membresías: </span><span className="font-bold text-gray-900">{filteredMesesData.reduce((s, m) => s + m.membresias, 0)}</span></div>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Distribución */}
        <div className="flex-none self-stretch z-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por Plan */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Ventas por Plan
              </h2>
              {filteredPlanDist.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  {selectedMonth ? "No hay miembros para este mes" : "No hay miembros con plan aún"}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredPlanDist.map((p) => {
                    const width = (p.count / maxPlanCount) * 100;
                    return (
                      <div key={p.nombre}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{p.nombre}</span>
                          <span className="font-bold text-gray-900">{p.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(width, 4)}%`,
                              backgroundColor: p.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="font-semibold text-gray-500">Total</span>
                    <span className="font-bold text-gray-900">{totalPlan}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ingresos por Plan */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Ingresos por Plan
              </h2>
              <p className="text-xs text-gray-500 -mt-5 mb-5">Precio de lista del plan de cada membresía con boleta (Flow o N° de boleta).</p>
              {filteredIngresosPorPlan.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  {selectedMonth ? "No hay ingresos para este mes" : "No hay membresías con boleta"}
                </p>
              ) : (
                <div className="space-y-5">
                  {filteredIngresosPorPlan.map((p) => {
                    const pct = filteredMembresias.length > 0
                      ? Math.round((p.alumnos / filteredMembresias.length) * 100)
                      : 0;
                    return (
                      <div key={p.nombre}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-medium text-gray-700">{p.nombre}</span>
                          </div>
                          <span className="font-black text-gray-900">{formatCLP(p.ingresos)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>{p.alumnos} venta{p.alumnos !== 1 ? "s" : ""} · {pct}%</span>
                          <span>{(p.ingresos / Math.max(p.alumnos, 1)).toLocaleString("es-CL")} /venta</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-700">{selectedMonth ? "Total del mes" : "Total ingresos recurrentes"}</span>
                    <span className="font-black text-xl text-gray-900">
                      {formatCLP(filteredIngresosPorPlan.reduce((s, p) => s + p.ingresos, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Planes Disponibles */}
        <div className="flex-none self-stretch z-0">
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Planes Disponibles
            </h2>
            {planes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No hay planes configurados
              </p>
            ) : (
              <div className="md:overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="hidden md:table-header-group">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="p-3 font-semibold">Nombre</th>
                      <th className="p-3 font-semibold">Tokens</th>
                      <th className="p-3 font-semibold">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planes.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{p.nombre}</td>
                        <td className="p-3 text-gray-600">{p.tokens_mensuales}</td>
                        <td className="p-3 font-semibold text-gray-900">
                          {formatCLP(p.precio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

