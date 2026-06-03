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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();

        const { data: usuarios } = await supabase.from("usuario").select("id, rol");

        const [membresiasData, planesData] = await Promise.all([
          getAdminMembresias(),
          getPlanes(),
        ]);

        setMembresias(membresiasData);
        setPlanes(planesData);

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
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-6);
  }, [membresias]);

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

  const maxIngreso = Math.max(...membresiasPorMes.map((m) => m.total), 1);
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
                  Comparativa de ingresos por membresías mes a mes
                </p>
              </div>
              {(() => {
                const last = membresiasPorMes[membresiasPorMes.length - 1];
                const prev = membresiasPorMes[membresiasPorMes.length - 2];
                if (!last || !prev || prev.total === 0) return null;
                const diff = last.total - prev.total;
                const pct = Math.round((diff / prev.total) * 100);
                const up = diff >= 0;
                return (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {pct}% vs mes anterior
                  </div>
                );
              })()}
            </div>
            {membresiasPorMes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No hay datos de ingresos aún
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Bar Chart */}
                <div className="flex items-end gap-3 h-48">
                  {membresiasPorMes.map((item, idx) => {
                    const height = (item.total / maxIngreso) * 100;
                    const colors = [
                      "from-blue-500 to-blue-400",
                      "from-emerald-500 to-emerald-400",
                      "from-violet-500 to-violet-400",
                      "from-rose-500 to-rose-400",
                      "from-amber-500 to-amber-400",
                      "from-cyan-500 to-cyan-400",
                    ];
                    const label = (() => {
                      const parts = item.mes.split("-");
                      const m = MESES[parseInt(parts[1]) - 1];
                      const y = parts[0].slice(2);
                      return `${m} '${y}`;
                    })();
                    return (
                      <div key={item.mes} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCLP(item.total)}
                        </span>
                        <div className="relative w-full flex justify-center">
                          <div
                            className={`w-full max-w-[48px] rounded-t-lg bg-gradient-to-t ${colors[idx % colors.length]} transition-all duration-500 hover:brightness-110 min-h-[4px] shadow-sm`}
                            style={{ height: `${Math.max(height, 6)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">
                          {label}
                        </span>
                        <span className="text-[10px] text-gray-400 -mt-0.5">
                          {item.count} membresía{item.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Data Table */}
                <div className="bg-gray-50/70 rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                        <th className="p-2.5 pl-3 font-semibold">Mes</th>
                        <th className="p-2.5 font-semibold">Membresías</th>
                        <th className="p-2.5 font-semibold">Total</th>
                        <th className="p-2.5 pr-3 font-semibold text-right">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membresiasPorMes.map((item, idx) => {
                        const parts = item.mes.split("-");
                        const m = MESES[parseInt(parts[1]) - 1];
                        const y = parts[0];
                        return (
                          <tr key={item.mes} className="border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                            <td className="p-2.5 pl-3 font-medium text-gray-900">{m} {y}</td>
                            <td className="p-2.5 text-gray-700">{item.count}</td>
                            <td className="p-2.5 font-semibold text-gray-900">{formatCLP(item.total)}</td>
                            <td className="p-2.5 pr-3 text-right text-gray-600">{formatCLP(Math.round(item.total / item.count))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
