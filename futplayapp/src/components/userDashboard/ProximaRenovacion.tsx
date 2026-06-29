"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import Link from "next/link";
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

    if (loading) return null;

    if (!membresia) {
        return (
            <div className="relative overflow-hidden w-full h-full bg-gradient-to-br from-[#002447] to-[#00305B] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/25 shadow-md flex flex-col justify-between">
                {/* Speed Lines / Sporty Accent Background */}
                <div className="absolute top-0 right-0 w-36 h-full opacity-[0.04] pointer-events-none">
                    <svg className="w-full h-full text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points="45,0 60,0 25,100 10,100" fill="currentColor" />
                        <polygon points="70,0 82,0 47,100 35,100" fill="currentColor" />
                        <polygon points="90,0 98,0 63,100 55,100" fill="currentColor" />
                    </svg>
                </div>
                
                <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-[#F39200]/5 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#F39200]/10 p-2.5 rounded-xl border border-[#F39200]/25 flex items-center justify-center">
                            <CreditCard className="text-[#F39200]" size={20} />
                        </div>
                        <div>
                            <h2 className="text-white text-sm font-extrabold tracking-wide uppercase">
                                Fecha de Vencimiento
                            </h2>
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1 inline-block">
                                Sin plan activo
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-6 text-center z-10 relative">
                    <p className="text-white text-sm font-bold mb-1">Renovación pendiente</p>
                    <p className="text-white/50 text-xs max-w-[200px] mb-3">
                        No posees un plan contratado. Adquiere una membresía para comenzar a reservar.
                    </p>
                    <Link
                        href="/planes"
                        className="text-xs bg-[#F39200] hover:bg-[#d67f00] text-white font-bold px-4 py-2 rounded transition-colors cursor-pointer inline-block"
                    >
                        Ver Planes
                    </Link>
                </div>
            </div>
        );
    }

    const fechaCompra = new Date(membresia.mes);
    const now = new Date();
    const diasTranscurridos = Math.max(0, Math.floor((now.getTime() - fechaCompra.getTime()) / 86400000));
    const porcentajeMes = Math.round(Math.min((diasTranscurridos / 30) * 100, 100));
    const diasRestantes = Math.max(0, 30 - diasTranscurridos);
    const proximaRenovacion = new Date(fechaCompra.getTime() + 30 * 86400000);

    const formatoPeso = (n: number) =>
        new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

    // Percentages for rings
    const pctDiasRestantes = Math.min(100, Math.max(0, (diasRestantes / 30) * 100));
    
    // SVG Dash offset calculations (Circumference = 282.7)
    const offsetPrecio = 0; // 100% full circle
    const offsetDiasRestantes = 282.7 - (pctDiasRestantes * 282.7) / 100;
    const offsetVence = 282.7 - (porcentajeMes * 282.7) / 100;

    return (
        <div className="relative overflow-hidden w-full h-full bg-gradient-to-br from-[#002447] to-[#00305B] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/25 shadow-md flex flex-col justify-between">
            {/* Speed Lines / Sporty Accent Background */}
            <div className="absolute top-0 right-0 w-36 h-full opacity-[0.04] pointer-events-none">
                <svg className="w-full h-full text-white" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="45,0 60,0 25,100 10,100" fill="currentColor" />
                    <polygon points="70,0 82,0 47,100 35,100" fill="currentColor" />
                    <polygon points="90,0 98,0 63,100 55,100" fill="currentColor" />
                </svg>
            </div>
            
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-[#F39200]/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-[#F39200]/10 p-2.5 rounded-xl border border-[#F39200]/25 flex items-center justify-center">
                        <CreditCard className="text-[#F39200]" size={20} />
                    </div>
                    <div>
                        <h2 className="text-white text-sm font-extrabold tracking-wide uppercase">
                            Fecha de Vencimiento
                        </h2>
                        {diasRestantes === 0 ? (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-1 inline-block">
                                Plan Vencido
                            </span>
                        ) : (
                            <p className="text-white/40 text-[10px] font-semibold mt-0.5">
                                {membresia.plan_nombre}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10 mt-auto">
                {/* Plan Price Circle */}
                <div className="flex flex-col items-center">
                    <div className="relative aspect-square w-full max-w-[85px] sm:max-w-[95px] flex items-center justify-center bg-[#00172e]/80 rounded-full border border-[#F39200]/20 shadow-inner">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.04)"
                                strokeWidth="4"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="#F39200"
                                strokeWidth="4"
                                strokeDasharray="282.7"
                                strokeDashoffset={offsetPrecio}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center text-center p-1.5 z-10">
                            <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-none mb-1 truncate max-w-[55px] sm:max-w-[70px]" title={membresia.plan_nombre}>
                                {membresia.plan_nombre}
                            </span>
                            <p className="text-white text-[10px] sm:text-xs font-black leading-none mt-0.5">
                                {formatoPeso(membresia.precio)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Días Restantes Circle */}
                <div className="flex flex-col items-center">
                    <div className="relative aspect-square w-full max-w-[85px] sm:max-w-[95px] flex items-center justify-center bg-[#00172e]/80 rounded-full border border-[#00A86B]/20 shadow-inner">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.04)"
                                strokeWidth="4"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="#00A86B"
                                strokeWidth="4"
                                strokeDasharray="282.7"
                                strokeDashoffset={offsetDiasRestantes}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center text-center p-1.5 z-10">
                            <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-none mb-1 truncate max-w-[55px] sm:max-w-[70px]" title="Días rest.">
                                Días rest.
                            </span>
                            <p className="text-white text-base sm:text-lg font-black leading-none mt-0.5">
                                {diasRestantes}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Vence Circle */}
                <div className="flex flex-col items-center">
                    <div className="relative aspect-square w-full max-w-[85px] sm:max-w-[95px] flex items-center justify-center bg-[#00172e]/80 rounded-full border border-[#60A5FA]/20 shadow-inner">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.04)"
                                strokeWidth="4"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="#60A5FA"
                                strokeWidth="4"
                                strokeDasharray="282.7"
                                strokeDashoffset={offsetVence}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center text-center p-1.5 z-10">
                            <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-none mb-1 truncate max-w-[55px] sm:max-w-[70px]" title="Vence">
                                Vence
                            </span>
                            <p className="text-white text-[10px] sm:text-xs font-black leading-none mt-0.5 uppercase">
                                {proximaRenovacion.toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
