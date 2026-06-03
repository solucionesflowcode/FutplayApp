"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/context";
import Link from "next/link";
import { Lock, CalendarPlus, Sparkles } from "lucide-react";
import { userHasMembresia } from "@/data/membresia";
import { getProximaClase } from "@/data/clases";

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

            setLoading(true);

            try {
                const tienePlan = await userHasMembresia(usuario.id);
                setHasPlan(tienePlan);

                if (tienePlan) {
                    const data = await getProximaClase(usuario.id);
                    if (data.length > 0) {
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
            <div className="w-full min-w-[380px] h-[250px] bg-gradient-to-br from-[#FFF8F0] to-[#FFE4CC] px-8 pt-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-[#F39200]/10 p-3 rounded-full">
                    <Lock className="text-[#F39200]" size={28} />
                </div>
                <p className="text-[#00305B] text-lg font-extrabold leading-tight">
                    Desbloquea tus <br />entrenamientos
                </p>
                <p className="text-gray-500 text-xs max-w-[250px]">
                    Compra una membresía para acceder a clases, métricas y mucho más.
                </p>
                <Link href="/planes">
                    <button className="bg-[#F39200] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#d47d00] transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
                        <Sparkles size={16} />
                        Ver planes
                    </button>
                </Link>
            </div>
        );
    }

    // 🧠 Si tiene plan pero no hay clases
    if (!clase) {
        return (
            <div className="w-full min-w-[380px] h-[250px] bg-gradient-to-br from-[#FFF8F0] to-[#FFE4CC] px-8 pt-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-[#F39200]/10 p-3 rounded-full">
                    <CalendarPlus className="text-[#F39200]" size={28} />
                </div>
                <p className="text-[#00305B] text-lg font-extrabold leading-tight">
                    Aún no tienes <br />clases agendadas
                </p>
                <p className="text-gray-500 text-xs max-w-[250px]">
                    Revisa los horarios disponibles y reserva tu próximo entrenamiento.
                </p>
                <Link href="/misclases">
                    <button className="mt-1 bg-[#F39200] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#d47d00] transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                        <Sparkles size={16} />
                        Explorar clases
                    </button>
                </Link>
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