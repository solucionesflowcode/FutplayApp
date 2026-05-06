"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Settings, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

/* =========================
   TYPES
========================= */
type Membresia = {
    usuario_id: string;
    tokens_totales: number;
    tokens_usados: number;
    mes: string;
};

/* =========================
   DATA FUNCTION
========================= */
async function getMembresiaByUser(userId: string): Promise<Membresia | null> {
    const supabase = createClient();

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
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

/* =========================
   COMPONENT
========================= */
export default function TopNavBarUser() {
    const [clasesRestantes, setClasesRestantes] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const membresia = await getMembresiaByUser(user.id);

            if (membresia) {
                const restantes =
                    membresia.tokens_totales - membresia.tokens_usados;
                setClasesRestantes(restantes);
            } else {
                setClasesRestantes(0);
            }
        };

        fetchData();
    }, []);

    return (
        <nav className="hidden md:flex items-center justify-between w-full px-4 h-[40px] bg-white">

            {/* BUSCADOR */}
            <div className="flex items-center">
                <Search size={20} className="text-[#004080]" />
                <input
                    type="text"
                    placeholder="Buscar Cursos, clases..."
                    className="pl-[20px] focus:outline-none h-[15px] text-[14px]"
                />
            </div>

            <div className="flex gap-10">

                {/* CLASES RESTANTES */}
                <div className="relative flex justify-center">
                    <p className="text-[#F39200] font-bold">
                        Clases restantes:{" "}
                        {clasesRestantes === null ? "..." : clasesRestantes}
                    </p>

                    <div className="absolute bottom-0 w-[160px] h-[4px] bg-[#F39200]" />
                </div>

                {/* ICONOS */}
                <div className="flex gap-4">
                    <Link href="/notificaciones" className="hover:scale-110 transition-all">
                        <Bell className="text-[#004080]" />
                    </Link>

                    <Link href="/configuracion" className="hover:scale-110 transition-all">
                        <Settings className="text-[#004080]" />
                    </Link>

                    <Link href="/perfil" className="hover:scale-110 transition-all">
                        <div className="w-[30px] h-[30px] rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="text-[#004080]" />
                        </div>
                    </Link>
                </div>
            </div>
        </nav>
    );
}