"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuthUser } from "@/context";
import Link from "next/link";
import { Lock } from "lucide-react";

interface Clase {
    titulo: string;
    descripcion: string;
    fecha_hora: string;
    sede: string;
}

export default function ProximoEntrenamiento() {
    const { usuario } = useAuthUser();

    const [clase, setClase] = useState<Clase | null>(null);
    const [hasPlan, setHasPlan] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!usuario?.id) return;

            const supabase = createClient();
            setLoading(true);

            try {
                // 🔒 1. Verificar membresía
                const { data: membresia } = await supabase
                    .from("membresia")
                    .select("id")
                    .eq("usuario_id", usuario.id);

                const tienePlan = membresia && membresia.length > 0;
                setHasPlan(tienePlan);

                // 🏋️ 2. Solo si tiene plan, traer clase
                if (tienePlan) {
                    const { data, error } = await supabase.rpc(
                        "get_proxima_clase",
                        {
                            p_usuario_id: usuario.id,
                        }
                    );

                    if (!error && data?.length > 0) {
                        setClase(data[0]);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [usuario]);

    if (loading) return null;

    // 🧠 Si NO tiene plan → mostrar bloqueado
    if (!hasPlan) {
        return (
            <div className="relative w-full min-w-[380px] h-[250px] bg-gray-100 px-6 pt-4 rounded-xl border-l-4 border-gray-400 shadow-lg overflow-hidden">

                {/* Overlay */}
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center text-center z-10">

                    <Lock className="text-gray-500 mb-2" size={28} />

                    <p className="text-gray-700 font-semibold text-sm mb-2">
                        Desbloquea tus entrenamientos
                    </p>

                    <p className="text-gray-500 text-xs mb-4 max-w-[220px]">
                        Compra una membresía para ver tu próximo entrenamiento,
                        acceder a clases y métricas.
                    </p>

                    <Link href="/planes">
                        <button className="bg-[#8A5100] text-white px-5 py-2 rounded-lg text-sm hover:opacity-90 transition">
                            Ver planes
                        </button>
                    </Link>
                </div>

                {/* Contenido base (difuminado visualmente) */}
                <div className="opacity-40">
                    <div className="flex justify-between">
                        <h1 className="text-[15px] font-semibold">
                            Próximo Entrenamiento
                        </h1>
                        <p className="text-[12px]">Hoy, --:--</p>
                    </div>

                    <div className="mt-5">
                        <p className="font-bold text-[20px]">
                            Entrenamiento bloqueado
                        </p>
                        <p className="text-[12px]">
                            Adquiere una membresía para ver detalles.
                        </p>
                    </div>

                    <div className="mt-5 text-[10px]">
                        CUENTA REGRESIVA:
                        <p className="text-[20px] font-semibold">--:--</p>
                    </div>
                </div>
            </div>
        );
    }

    // 🧠 Si tiene plan pero no hay clases
    if (!clase) {
        return (
            <div className="w-full min-w-[380px] h-[250px] bg-white px-6 pt-4 rounded-xl shadow-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">
                    No tienes entrenamientos próximos
                </p>
            </div>
        );
    }

    // 🏋️ UI NORMAL
    const fecha = new Date(clase.fecha_hora);

    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();

    const horaFormateada = fecha.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const textoFecha = esHoy
        ? `Hoy, ${horaFormateada}`
        : fecha.toLocaleString("es-CL", {
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
        });

    const diff = fecha.getTime() - new Date().getTime();
    const horas = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
    const minutos = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));

    return (
        <div className="w-full min-w-[380px] h-[250px] bg-white px-6 pt-4 rounded-xl border-l-4 border-[#8A5100] shadow-lg">

            <div className="flex justify-between">
                <h1 className="text-[#8A5100] text-[15px] font-semibold">
                    Próximo Entrenamiento
                </h1>

                <p className="bg-[#D3E3FF] text-[#004080] px-2 py-1 rounded text-[12px]">
                    {textoFecha}
                </p>
            </div>

            <div className="flex flex-col gap-2 mt-5">
                <p className="font-bold text-[20px] text-[#00305B]">
                    {clase.titulo}
                </p>

                <p className="text-[12px] text-[#42474F]">
                    {clase.descripcion}
                </p>

                <p className="text-[10px] text-gray-400">
                    📍 {clase.sede}
                </p>
            </div>

            <div className="flex justify-between mt-5">
                <div className="text-[#94A3B8] text-[9px] font-semibold">
                    CUENTA REGRESIVA:
                    <p className="text-[#004080] text-[20px] font-semibold">
                        {horas}h:{minutos}m
                    </p>
                </div>

                <button className="bg-[#8A5100] h-[40px] text-white rounded-xl px-7">
                    Cancelar con aviso
                </button>
            </div>
        </div>
    );
}