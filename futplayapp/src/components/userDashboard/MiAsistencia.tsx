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

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#002447] to-[#00305B] px-6 py-7 shadow-xl border border-white/10 border-t-2 border-t-[#F39200]">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#00A86B]/20 p-2.5 rounded">
                    <CalendarCheck className="text-[#00A86B]" size={20} />
                </div>
                <div>
                    <h2 className="text-white text-sm font-extrabold tracking-wide">
                        Mi Asistencia
                    </h2>
                    <p className="text-white/40 text-[10px]">
                        {membresia.tokens_usados} de {membresia.tokens_totales} tokens
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/5 shadow-sm ring-1 ring-inset ring-white/[0.03] border-t-4 border-t-[#F39200] aspect-square rounded-full flex flex-col items-center justify-center text-center p-2">
                    <span className="text-white/50 text-[8px] font-black uppercase tracking-wider leading-tight">Restantes</span>
                    <p className="text-[#F39200] text-lg font-black leading-tight mt-0.5">{clasesRestantes}</p>
                </div>

                <div className="bg-white/5 border border-white/5 shadow-sm ring-1 ring-inset ring-white/[0.03] border-t-4 border-t-[#00A86B] aspect-square rounded-full flex flex-col items-center justify-center text-center p-2">
                    <span className="text-white/50 text-[8px] font-black uppercase tracking-wider leading-tight">Usados</span>
                    <p className="text-white text-lg font-black leading-tight mt-0.5">{membresia.tokens_usados}</p>
                </div>

                <div className="bg-white/5 border border-white/5 shadow-sm ring-1 ring-inset ring-white/[0.03] border-t-4 border-t-[#60A5FA] aspect-square rounded-full flex flex-col items-center justify-center text-center p-2">
                    <span className="text-white/50 text-[8px] font-black uppercase tracking-wider leading-tight">Totales</span>
                    <p className="text-white text-lg font-black leading-tight mt-0.5">{membresia.tokens_totales}</p>
                </div>
            </div>
        </div>
    );
}