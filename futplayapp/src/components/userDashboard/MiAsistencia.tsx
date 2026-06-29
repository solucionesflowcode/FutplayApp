"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Membresia = {
    usuario_id: string;
    tokens_totales: number;
    tokens_usados: number;
    mes: string;
};

async function getMembresiaByUser(userId: string): Promise<Membresia | null> {
    const supabase = createClient();

    const ahora = new Date();
    const año = ahora.getFullYear();
    const month = ahora.getMonth() + 1;
    const inicioMes = `${año}-${String(month).padStart(2, '0')}-01`;
    const inicioMesSiguiente = month === 12
        ? `${año + 1}-01-01`
        : `${año}-${String(month + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
        .from("membresia")
        .select("*")
        .eq("usuario_id", userId)
        .gte("mes", inicioMes)
        .lt("mes", inicioMesSiguiente)
        .maybeSingle();

    if (error) {
        console.error("Error fetching membresia:", error.message);
        return null;
    }

    return data;
}

export default function MiAsistencia() {
    const [membresia, setMembresia] = useState<Membresia | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMembresia = async () => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                console.error("No hay usuario logeado");
                setLoading(false);
                return;
            }

            const data = await getMembresiaByUser(user.id);
            setMembresia(data);
            setLoading(false);
        };

        fetchMembresia();
    }, []);

    if (loading || !membresia) return null;

    const clasesRestantes = membresia.tokens_totales - membresia.tokens_usados;

    // Percentages for rings
    const pctRestantes = membresia.tokens_totales > 0 ? (clasesRestantes / membresia.tokens_totales) * 100 : 0;
    const pctUsados = membresia.tokens_totales > 0 ? (membresia.tokens_usados / membresia.tokens_totales) * 100 : 0;
    const pctTotales = 100;

    // SVG Dash offset calculations (Circumference = 282.7)
    const offsetRestantes = 282.7 - (pctRestantes * 282.7) / 100;
    const offsetUsados = 282.7 - (pctUsados * 282.7) / 100;
    const offsetTotales = 0;

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
            
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-[#00A86B]/5 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-[#00A86B]/10 p-2.5 rounded-xl border border-[#00A86B]/25 flex items-center justify-center">
                        <CalendarCheck className="text-[#00A86B]" size={20} />
                    </div>
                    <div>
                        <h2 className="text-white text-sm font-extrabold tracking-wide uppercase">
                            Mi Asistencia
                        </h2>
                        <p className="text-white/40 text-[10px] font-semibold mt-0.5">
                            {membresia.tokens_usados} de {membresia.tokens_totales} tokens
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10 mt-auto">
                {/* Restantes Circle */}
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
                                strokeDashoffset={offsetRestantes}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center text-center p-1.5 z-10">
                            <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-none mb-1 truncate max-w-[55px] sm:max-w-[70px]" title="Restantes">
                                Restantes
                            </span>
                            <p className="text-[#F39200] text-base sm:text-lg font-black leading-none mt-0.5">
                                {clasesRestantes}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Usados Circle */}
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
                                strokeDashoffset={offsetUsados}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center text-center p-1.5 z-10">
                            <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-none mb-1 truncate max-w-[55px] sm:max-w-[70px]" title="Usados">
                                Usados
                            </span>
                            <p className="text-white text-base sm:text-lg font-black leading-none mt-0.5">
                                {membresia.tokens_usados}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Totales Circle */}
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
                                strokeDashoffset={offsetTotales}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center text-center p-1.5 z-10">
                            <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-none mb-1 truncate max-w-[55px] sm:max-w-[70px]" title="Totales">
                                Totales
                            </span>
                            <p className="text-white text-base sm:text-lg font-black leading-none mt-0.5">
                                {membresia.tokens_totales}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}