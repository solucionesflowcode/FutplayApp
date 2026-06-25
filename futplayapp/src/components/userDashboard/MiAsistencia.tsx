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
        <div className="w-full h-full bg-gradient-to-br from-[#002447] to-[#00305B] rounded-2xl shadow-xl border border-white/10 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#00A86B] rounded-full mix-blend-multiply filter blur-3xl opacity-10" />

            <div className="flex items-center gap-3 mb-5">
                <div className="bg-[#00A86B]/20 p-2.5 rounded-xl">
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

            <div className="flex items-end gap-4 mb-5">
                <div className="flex flex-col">
                    <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold mb-1">
                        Tokens restantes
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[#F39200] text-5xl font-black leading-none">
                            {clasesRestantes}
                        </span>
                        <span className="text-white/30 text-sm font-medium">/ {membresia.tokens_totales}</span>
                    </div>
                </div>
            </div>

            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F39200] to-[#00A86B] transition-all duration-700 ease-out"
                    style={{ width: `${Math.min((membresia.tokens_usados / membresia.tokens_totales) * 100, 100)}%` }}
                />
            </div>

            <p className="text-white/50 text-xs mt-3">
                {clasesRestantes === 0
                    ? "Has completado todas tus clases del mes"
                    : `Te quedan ${clasesRestantes} clases este mes, ¡aprovéchalas!`}
            </p>
        </div>
    );
}