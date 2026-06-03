"use client";

import { useEffect, useState } from "react";
import { RotateCcw, CreditCard, CalendarDays, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type MembresiaData = {
    id: string;
    plan_nombre: string;
    precio: number;
    mes: string;
    tokens_totales: number;
    tokens_usados: number;
};

export default function ProximaRenovacion() {
    const [data, setData] = useState<{
        membresia: MembresiaData;
        recurrenciaActiva: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            const [membresiaRes, recurrenciaRes] = await Promise.all([
                supabase
                    .from("membresia")
                    .select("*, plan(nombre, precio)")
                    .eq("usuario_id", user.id)
                    .order("mes", { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from("recurrencia")
                    .select("activa")
                    .eq("usuario_id", user.id)
                    .eq("activa", true)
                    .maybeSingle(),
            ]);

            if (!membresiaRes.data) {
                setLoading(false);
                return;
            }

            setData({
                membresia: {
                    id: membresiaRes.data.id,
                    plan_nombre: (membresiaRes.data as any).plan?.nombre || "Sin plan",
                    precio: (membresiaRes.data as any).plan?.precio || 0,
                    mes: membresiaRes.data.mes,
                    tokens_totales: membresiaRes.data.tokens_totales,
                    tokens_usados: membresiaRes.data.tokens_usados,
                },
                recurrenciaActiva: !!recurrenciaRes.data?.activa,
            });
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading || !data) return null;

    const { membresia, recurrenciaActiva } = data;

    const now = new Date();
    const diasDelMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const diasTranscurridos = now.getDate();
    const porcentajeMes = Math.round((diasTranscurridos / diasDelMes) * 100);
    const diasRestantes = diasDelMes - diasTranscurridos;

    const formatoPeso = (n: number) =>
        new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#002447] to-[#00305B] rounded-2xl shadow-xl border border-white/10 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#F39200] rounded-full mix-blend-multiply filter blur-3xl opacity-10" />

            <div className="flex items-center gap-3 mb-5">
                <div className="bg-[#F39200]/20 p-2.5 rounded-xl">
                    <CreditCard className="text-[#F39200]" size={20} />
                </div>
                <div>
                    <h2 className="text-white text-sm font-extrabold tracking-wide">
                        Próxima Renovación
                    </h2>
                    <p className="text-white/40 text-[10px]">
                        {membresia.plan_nombre}
                    </p>
                </div>
            </div>

            <div className="flex items-end gap-4 mb-4">
                <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1">
                        Próximo cargo
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-white text-3xl font-black leading-none">
                            {formatoPeso(membresia.precio)}
                        </span>
                    </div>
                </div>
                {recurrenciaActiva && (
                    <div className="flex items-center gap-1.5 mb-1 ml-auto bg-[#00A86B]/10 px-3 py-1.5 rounded-full">
                        <RotateCcw size={14} className="text-[#00A86B]" />
                        <span className="text-[#00A86B] text-xs font-bold">Auto</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 mb-4 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                <CalendarDays size={16} className="text-[#F39200]" />
                <div>
                    <p className="text-white text-sm font-semibold">
                        Renueva el {new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                    </p>
                    <p className="text-white/40 text-[11px]">
                        {diasRestantes === 0 ? "Último día del mes" : `Quedan ${diasRestantes} días`}
                    </p>
                </div>
            </div>

            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F39200] to-[#60A5FA] transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(porcentajeMes, 100)}%` }}
                />
            </div>
            <p className="text-white/40 text-[10px] mt-2 text-right">
                {porcentajeMes}% del mes
            </p>

            {!recurrenciaActiva && (
                <div className="mt-4 bg-[#F39200]/10 border border-[#F39200]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Zap size={16} className="text-[#F39200] shrink-0" />
                    <p className="text-[#F39200] text-xs font-semibold">
                        Activa el pago automático para no preocuparte cada mes
                    </p>
                </div>
            )}
        </div>
    );
}
