"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
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
    const [membresia, setMembresia] = useState<MembresiaData | null>(null);
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

            const { data: membresiaRes } = await supabase
                .from("membresia")
                .select("*, plan(nombre, precio)")
                .eq("usuario_id", user.id)
                .order("mes", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!membresiaRes) {
                setLoading(false);
                return;
            }

            setMembresia({
                id: membresiaRes.id,
                plan_nombre: (membresiaRes as any).plan?.nombre || "Sin plan",
                precio: (membresiaRes as any).plan?.precio || 0,
                mes: membresiaRes.mes,
                tokens_totales: membresiaRes.tokens_totales,
                tokens_usados: membresiaRes.tokens_usados,
            });
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading || !membresia) return null;

    const fechaCompra = new Date(membresia.mes);
    const now = new Date();
    const diasTranscurridos = Math.max(0, Math.floor((now.getTime() - fechaCompra.getTime()) / 86400000));
    const porcentajeMes = Math.round(Math.min((diasTranscurridos / 30) * 100, 100));
    const diasRestantes = Math.max(0, 30 - diasTranscurridos);
    const proximaRenovacion = new Date(fechaCompra.getTime() + 30 * 86400000);

    const formatoPeso = (n: number) =>
        new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#002447] to-[#00305B] px-6 py-7 shadow-xl border border-white/10 border-t-2 border-t-[#F39200]">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#F39200]/20 p-2.5 rounded">
                    <CreditCard className="text-[#F39200]" size={20} />
                </div>
                <div>
                    <h2 className="text-white text-sm font-extrabold tracking-wide">
                        Fecha de Vencimiento
                    </h2>
                    <p className="text-white/40 text-[10px]">
                        {membresia.plan_nombre}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/5 shadow-sm ring-1 ring-inset ring-white/[0.03] border-t-4 border-t-[#F39200] aspect-square rounded-full flex flex-col items-center justify-center text-center p-2">
<span className="text-white/50 text-[8px] font-black uppercase tracking-wider leading-tight">{membresia.plan_nombre}</span>
                        <p className="text-white text-sm font-black leading-tight mt-0.5">{formatoPeso(membresia.precio)}</p>
                </div>

                <div className="bg-white/5 border border-white/5 shadow-sm ring-1 ring-inset ring-white/[0.03] border-t-4 border-t-[#00A86B] aspect-square rounded-full flex flex-col items-center justify-center text-center p-2">
                    <span className="text-white/50 text-[8px] font-black uppercase tracking-wider leading-tight">Días rest.</span>
                    <p className="text-white text-lg font-black leading-tight mt-0.5">{diasRestantes}</p>
                </div>

                    <div className="bg-white/5 border border-white/5 shadow-sm ring-1 ring-inset ring-white/[0.03] border-t-4 border-t-[#60A5FA] aspect-square rounded-full flex flex-col items-center justify-center text-center p-2">
                        <span className="text-white/50 text-[8px] font-black uppercase tracking-wider leading-tight">Vence</span>
                        <p className="text-white text-sm font-black leading-tight mt-0.5">{proximaRenovacion.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</p>
                    </div>
            </div>
        </div>
    );
}
