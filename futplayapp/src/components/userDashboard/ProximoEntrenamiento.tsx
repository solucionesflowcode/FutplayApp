"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/context";
import Link from "next/link";
import { Lock, CalendarPlus, Sparkles, ArrowRight } from "lucide-react";
import { userHasMembresia } from "@/data/membresia";
import { getProximaClase } from "@/data/clases";

interface Clase {
    titulo: string;
    descripcion: string;
    fecha_hora: string;
    sede: string;
    tipo_evento: "entrenamiento" | "partido";
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
                const data = await getProximaClase(usuario.id);

                if (data.length > 0) {
                    const c = data[0];
                    setClase(c);
                    if (c.tipo_evento === "partido") {
                        setHasPlan(true);
                    } else {
                        const tienePlan = await userHasMembresia(usuario.id);
                        setHasPlan(tienePlan);
                    }
                } else {
                    const tienePlan = await userHasMembresia(usuario.id);
                    setHasPlan(tienePlan);
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

    if (!hasPlan) {
        return (
            <div className="w-full min-w-[380px] h-[250px] bg-gradient-to-br from-[#FFF8F0] to-[#FFE4CC] px-8 pt-6 border-t-2 border-t-[#F39200] shadow-lg flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-[#F39200]/10 p-3 rounded">
                    <Lock className="text-[#F39200]" size={28} />
                </div>
                <p className="text-[#00305B] text-lg font-extrabold leading-tight">
                    Desbloquea tus <br />entrenamientos
                </p>
                <p className="text-gray-500 text-xs max-w-[250px]">
                    Compra una membresía para acceder a clases, métricas y mucho más.
                </p>
                <Link href="/planes">
                    <button className="bg-[#F39200] text-white px-6 py-2.5 rounded text-sm font-bold hover:bg-[#d47d00] transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
                        <Sparkles size={16} />
                        Ver planes
                    </button>
                </Link>
            </div>
        );
    }

    if (!clase) {
        return (
            <div className="w-full min-w-[380px] h-[250px] bg-gradient-to-br from-[#FFF8F0] to-[#FFE4CC] px-8 pt-6 border-t-2 border-t-[#F39200] shadow-lg flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-[#F39200]/10 p-3 rounded">
                    <CalendarPlus className="text-[#F39200]" size={28} />
                </div>
                <p className="text-[#00305B] text-lg font-extrabold leading-tight">
                    Aún no tienes <br />clases agendadas
                </p>
                <p className="text-gray-500 text-xs max-w-[250px]">
                    Revisa los horarios disponibles y reserva tu próximo entrenamiento.
                </p>
                <Link href="/misclases">
                    <button className="mt-1 bg-[#F39200] text-white px-6 py-2.5 rounded text-sm font-bold hover:bg-[#d47d00] transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                        <Sparkles size={16} />
                        Explorar clases
                    </button>
                </Link>
            </div>
        );
    }

    const fecha = new Date(clase.fecha_hora);

    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();

    const horaFormateada = fecha.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const fechaFormateada = fecha.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
    });

    const textoFecha = esHoy
        ? `Hoy, ${horaFormateada}`
        : `${fechaFormateada}, ${horaFormateada}`;

    const tituloEvento = clase.tipo_evento === "partido" ? "Próximo Partido" : "Próximo Entrenamiento";

    return (
        <div className="w-full min-w-[380px] bg-white px-6 pt-4 pb-4 border-t-2 border-t-[#F39200] shadow-lg flex">

            <div className="flex-1">
                <div className="flex justify-between">
                    <h1 className="text-[#F39200] text-[15px] font-semibold">
                        {tituloEvento}
                    </h1>
                </div>

                <div className="flex flex-col gap-2 mt-5">
                    <p className="font-bold text-[20px] text-[#00305B]">
                        {clase.titulo}
                    </p>

                    <p className="text-[12px] text-[#42474F]">
                        {clase.descripcion}
                    </p>

                    {clase.sede && (
                        <p className="text-[10px] text-gray-400">
                            {clase.sede}
                        </p>
                    )}
                </div>

                <div className="mt-5">
                    <p className="font-bold text-[20px] text-[#00305B]">
                        {textoFecha}
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center pl-4">
                <Link
                    href="/misclases"
                    className="w-12 h-12 bg-[#F28C28] hover:bg-[#e07d1f] text-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg shrink-0"
                    title="Ver más clases"
                >
                    <ArrowRight size={20} />
                </Link>
            </div>
        </div>
    );
}