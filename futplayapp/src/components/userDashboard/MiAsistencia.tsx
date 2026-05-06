"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Membresia = {
    usuario_id: string;
    tokens_totales: number;
    tokens_usados: number;
    mes: string;
};

async function getMembresiaByUser(userId: string): Promise<Membresia | null> {
    const supabase = createClient();

    const now = new Date();

    // primer día del mes actual
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    // primer día del próximo mes
    const inicioMesSiguiente = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data, error } = await supabase
        .from("membresia")
        .select("*")
        .eq("usuario_id", userId)
        .gte("mes", inicioMes.toISOString().split("T")[0])
        .lt("mes", inicioMesSiguiente.toISOString().split("T")[0])
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

    if (loading) {
        return <p className="text-center">Cargando...</p>;
    }

    if (!membresia) {
        return <p className="text-center">Sin membresía activa</p>;
    }

    const clasesRestantes =
        membresia.tokens_totales - membresia.tokens_usados;

    const porcentajeUso =
        (membresia.tokens_usados / membresia.tokens_totales) * 100;

    return (
        <div className="w-[220px] h-[250px] min-w-[220px] bg-white px-6 pt-4 rounded-xl shadow-lg">
            <div className="flex flex-col gap-5">
                <h1 className="text-[#94A3B8] text-[15px]">Mi Asistencia</h1>

                <div className="flex flex-col">
                    <p className="text-center font-bold text-[30px] text-[#004080] mb-[-6px]">
                        {clasesRestantes}
                    </p>
                    <p className="text-center text-[#004080] text-[12px] font-bold">
                        CLASES RESTANTES <br /> ESTE MES
                    </p>
                </div>

                <div className="flex flex-col gap-1">
                    <p className="text-[13px] text-center text-black">
                        Excelente compromiso
                    </p>
                    <p className="text-[10px] text-center text-[#94A3B8]">
                        Has asistido a {membresia.tokens_usados} de {membresia.tokens_totales}
                        <br />
                        sesiones.
                    </p>
                </div>

                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                        className="h-2 bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}