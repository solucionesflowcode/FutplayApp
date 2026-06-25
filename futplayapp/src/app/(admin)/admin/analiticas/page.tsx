"use client";

import { useEffect, useState, useMemo } from "react";
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

        const membresiasMesActual = membresiasData.filter((m) => m.mes?.startsWith(mesActual));
        const ingresosMes = membresiasMesActual.reduce((sum, m) => sum + (Number(m.precio) || 0), 0);

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
    const allMeses = new Set([...ingresosMap.keys(), ...membresiasMap.keys()]);
    const sorted = Array.from(allMeses).sort();

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
        membresias: mem?.count || 0,
        ingresos,
        transacciones: ing?.transacciones || 0,
        vsAnterior,
        acumulado,
      };
    });
  }, [ingresosMensuales, membresiasPorMes]);

  const maxRevenue = Math.max(...mesesData.map((m) => m.ingresos), 1);

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

  const maxPlanCount = Math.max(...planDist.map((p) => p.count), 1);
  const totalPlan = planDist.reduce((s, p) => s + p.count, 0);

  const formatCLP = (n: number) =>
    `$${n.toLocaleString("es-CL")}`;

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
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Este mes
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Section 1: Stat Cards */}
        <div className="flex-none self-stretch z-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="w-5 h-5 text-blue-600" />}
              label="Total Alumnos"
              value={resumen.totalAlumnos.toString()}
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              label="Ingresos del Mes"
              value={formatCLP(resumen.ingresosMes)}
              bgColor="bg-green-50"
            />
            <StatCard
              icon={<CreditCard className="w-5 h-5 text-orange-600" />}
              label="Membresías Activas"
              value={resumen.membresiasActivas.toString()}
              bgColor="bg-orange-50"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
              label="Tasa de Retención"
              value={`${resumen.retencion}%`}
              bgColor="bg-purple-50"
            />
          </div>
        </div>

        {/* Section 2: Ingresos Mensuales */}
        <div className="flex-none self-stretch z-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Ingresos Mensuales
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Evolución de ingresos mes a mes desde el primer registro
                </p>
              </div>
              {(() => {
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
            {mesesData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No hay datos de ingresos aún
              </p>
            ) : (
              <>
                {/* Bar Chart */}
                <div className="flex items-end gap-3 h-48 mb-6">
                  {mesesData.map((item) => {
                    const height = (item.ingresos / maxRevenue) * 100;
                    const isLast = item.mes === mesesData[mesesData.length - 1]?.mes;
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
                            style={{ height: `${Math.max(height, 4)}%` }}
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
                      {mesesData.map((item) => {
                        const isLast = item.mes === mesesData[mesesData.length - 1]?.mes;
                        const barWidth = (item.ingresos / maxRevenue) * 100;
                        return (
                          <tr key={item.mes} className={`border-b border-gray-100 last:border-0 hover:bg-white transition-colors ${isLast ? "bg-amber-50/40" : ""}`}>
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
                        <td className="p-3 pl-4 font-bold text-gray-700">Total</td>
                        <td className="p-3 font-black text-gray-900">
                          {formatCLP(mesesData.reduce((s, m) => s + m.ingresos, 0))}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {mesesData.reduce((s, m) => s + m.transacciones, 0)}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {mesesData.reduce((s, m) => s + m.membresias, 0)}
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
              {planDist.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No hay miembros con plan aún
                </p>
              ) : (
                <div className="space-y-4">
                  {planDist.map((p) => {
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
              {ingresosPorPlan.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No hay membresías activas este mes
                </p>
              ) : (
                <div className="space-y-5">
                  {ingresosPorPlan.map((p) => {
                    const pct = membresias.length > 0
                      ? Math.round((p.alumnos / membresias.length) * 100)
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
                    <span className="font-bold text-gray-700">Total ingresos recurrentes</span>
                    <span className="font-black text-xl text-gray-900">
                      {formatCLP(ingresosPorPlan.reduce((s, p) => s + p.ingresos, 0))}
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
