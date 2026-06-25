"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import { getPlanes, type Plan } from "@/data/plans";

type Resumen = {
  totalAlumnos: number;
  ingresosMes: number;
  membresiasActivas: number;
  retencion: number;
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

async function getIngresosMensuales(): Promise<IngresoMensual[]> {
  try {
    const res = await fetch("/api/admin/analiticas/mensual");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default function AnaliticasPage() {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<Resumen>({
    totalAlumnos: 0,
    ingresosMes: 0,
    membresiasActivas: 0,
    retencion: 0,
  });
  const [membresias, setMembresias] = useState<MembresiaConPlan[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [ingresosMensuales, setIngresosMensuales] = useState<IngresoMensual[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthDetail, setMonthDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();

        const { data: usuarios } = await supabase.from("usuario").select("id, rol");

        const [membresiasData, planesData, ingresosData] = await Promise.all([
          getAdminMembresias(),
          getPlanes(),
          getIngresosMensuales(),
        ]);

        setMembresias(membresiasData);
        setPlanes(planesData);
        setIngresosMensuales(ingresosData);

        const jugadores = (usuarios || []).filter((u) => u.rol === "jugador");
        const totalAlumnos = jugadores.length;

        const ahora = new Date();
        const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;

        const activas = membresiasData.filter((m) => m.tokens_restantes > 0);
        const membresiasActivas = activas.length;

        const apiIngresoMes = ingresosData.find((i) => i.mes === mesActual);
        const membresiasMesActual = membresiasData.filter((m) => m.mes?.startsWith(mesActual));
        const ingresosMesLocal = membresiasMesActual.reduce((sum, m) => sum + (Number(m.precio) || 0), 0);
        const ingresosMes = apiIngresoMes?.ingresos ?? ingresosMesLocal;

        const retencion = totalAlumnos > 0
          ? Math.round((membresiasActivas / totalAlumnos) * 100)
          : 0;

        setResumen({ totalAlumnos, ingresosMes, membresiasActivas, retencion });
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Error al cargar las analíticas");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      const mesKey = m.mes?.slice(0, 7);
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
    return membresias.filter((m) => m.mes?.startsWith(selectedMonth));
  }, [membresias, selectedMonth]);

  const filteredResumen = useMemo(() => {
    if (!selectedMonth) return resumen;
    const apiIngreso = ingresosMensuales.find((i) => i.mes === selectedMonth);
    const ingresos = apiIngreso?.ingresos ?? 0;
    const activas = filteredMembresias.filter((m) => m.tokens_restantes > 0);
    return {
      totalAlumnos: resumen.totalAlumnos,
      ingresosMes: ingresos,
      membresiasActivas: activas.length,
      retencion: resumen.totalAlumnos > 0
        ? Math.round((activas.length / resumen.totalAlumnos) * 100)
        : 0,
    };
  }, [filteredMembresias, resumen, selectedMonth, ingresosMensuales]);

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

  const handleSelectMonth = async (mes: string | null) => {
    setShowMonthDropdown(false);
    setSelectedMonth(mes);

    if (!mes) {
      setMonthDetail(null);
      return;
    }

    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/analiticas/detalle?mes=${mes}`);
      if (res.ok) {
        const data = await res.json();
        setMonthDetail(data);
      }
    } catch {
      console.error("Error fetching month detail");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#F28C28]" />
          <p className="text-gray-500">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div
        className="flex flex-col items-start gap-8 w-full"
        style={{ maxWidth: "1216px" }}
      >
        {/* Section 0: Header */}
        <div className="flex-none self-stretch flex items-center justify-between z-0">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Analíticas</h1>
            <p className="text-gray-500 text-sm mt-1">
              Estadísticas y métricas de rendimiento de la academia
            </p>
          </div>
        </div>

        {/* Section 1: Stat Cards */}
        <div className="flex-none self-stretch z-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="w-5 h-5 text-blue-600" />}
              label="Total Alumnos"
              value={filteredResumen.totalAlumnos.toString()}
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              label="Ingresos del Mes"
              value={formatCLP(filteredResumen.ingresosMes)}
              bgColor="bg-green-50"
            />
            <StatCard
              icon={<CreditCard className="w-5 h-5 text-orange-600" />}
              label="Membresías Activas"
              value={filteredResumen.membresiasActivas.toString()}
              bgColor="bg-orange-50"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              label="Tasa de Retención"
              value={`${filteredResumen.retencion}%`}
              bgColor="bg-purple-50"
            />
          </div>
        </div>

        {/* Section 2: Ingresos Mensuales */}
        <div className="flex-none self-stretch z-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
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
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedMonth === m.mes ? "bg-orange-50 text-[#F28C28] font-bold" : "text-gray-700"}`}
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
              <p className="text-gray-400 text-sm text-center py-8">
                No hay datos de ingresos aún
              </p>
            ) : (
              <>
                {/* Bar Chart */}
                <div className="flex items-end gap-3 h-48 mb-6">
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
                      ? "from-[#F28C28] to-[#F5A623]"
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

                {/* Data Table */}
                <div className="bg-gray-50/70 rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
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
                          <tr key={item.mes} onClick={() => handleSelectMonth(item.mes)} className={`border-b border-gray-100 last:border-0 hover:bg-white transition-colors cursor-pointer ${isLast ? "bg-amber-50/40" : ""}`}>
                            <td className="p-3 pl-4 font-medium text-gray-900 whitespace-nowrap">
                              {isLast && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F28C28] mr-2 animate-pulse" />
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
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="p-3 pr-4 text-right">
                              <span className="font-semibold text-gray-900">{formatCLP(item.acumulado)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
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
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Distribución */}
        <div className="flex-none self-stretch z-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por Plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Alumnos por Plan
              </h2>
              {filteredPlanDist.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                Ingresos por Plan
              </h2>
              {filteredIngresosPorPlan.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  {selectedMonth ? "No hay ingresos para este mes" : "No hay membresías activas este mes"}
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
                          <span>{p.alumnos} alumno{p.alumnos !== 1 ? "s" : ""} · {pct}%</span>
                          <span>{(p.ingresos / Math.max(p.alumnos, 1)).toLocaleString("es-CL")} /alumno</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Planes Disponibles
            </h2>
            {planes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                No hay planes configurados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
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

      {/* Detail Modal */}
      {monthDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setMonthDetail(null); setSelectedMonth(null); }} />
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto z-10">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Detalle de {(() => {
                    const p = selectedMonth?.split("-");
                    if (!p) return "";
                    return `${MESES[parseInt(p[1]) - 1]} ${p[0]}`;
                  })()}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {monthDetail.membresiasCount} membresía{monthDetail.membresiasCount !== 1 ? "s" : ""} · {formatCLP(monthDetail.totalIngresos)} total
                </p>
              </div>
              <button
                onClick={() => { setMonthDetail(null); setSelectedMonth(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#F28C28]" />
                </div>
              ) : (
                <>
                  {/* Summary card */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-blue-700">{formatCLP(monthDetail.totalIngresos)}</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">Ingresos</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-green-700">{monthDetail.membresiasCount}</p>
                      <p className="text-xs text-green-600 font-medium mt-1">Membresías</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-purple-700">{monthDetail.planes.length}</p>
                      <p className="text-xs text-purple-600 font-medium mt-1">Planes</p>
                    </div>
                  </div>

                  {/* Breakdown by plan */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Desglose por Plan</h4>
                    <div className="space-y-2">
                      {monthDetail.planes.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F28C28]" />
                            <span className="font-medium text-gray-800">{p.nombre}</span>
                            <span className="text-xs text-gray-400">×{p.count}</span>
                          </div>
                          <span className="font-bold text-gray-900">{formatCLP(p.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Membership list */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Membresías</h4>
                    {monthDetail.detalle.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">Sin membresías registradas</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="pb-2 font-semibold">Alumno</th>
                              <th className="pb-2 font-semibold">Plan</th>
                              <th className="pb-2 font-semibold text-right">Precio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthDetail.detalle.map((d: any, i: number) => (
                              <tr key={i} className="border-b border-gray-50 last:border-0">
                                <td className="py-2.5 font-medium text-gray-800">{d.usuario_nombre}</td>
                                <td className="py-2.5 text-gray-600">{d.plan_nombre}</td>
                                <td className="py-2.5 text-right font-semibold text-gray-900">{formatCLP(d.precio)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
