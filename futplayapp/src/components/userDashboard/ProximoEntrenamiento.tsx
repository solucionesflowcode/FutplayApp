"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/context";
import Link from "next/link";
import { Lock, CalendarPlus, Sparkles, ArrowRight, Calendar, MapPin, Clock, GraduationCap } from "lucide-react";
import { userHasMembresia, getMembresiaByUser } from "@/data/membresia";
import { getProximaClase } from "@/data/clases";

interface Clase {
    titulo: string;
    descripcion: string;
    fecha_hora: string;
    sede: string;
    tipo_evento: "entrenamiento" | "partido" | "kids";
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
                const membresia = await getMembresiaByUser(usuario.id);
                const tipoPlan = membresia?.tipo_plan;
                const data = await getProximaClase(usuario.id, tipoPlan);

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

    if (clase) {
        return renderClase(clase);
    }

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

function renderClase(clase: Clase) {
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

    return (
        <div className="w-full bg-white rounded-xl border-t-2 border-t-[#F39200] shadow-sm ring-1 ring-black/[0.03] flex items-center p-5 gap-5">
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-1.5">
                    <Calendar className="text-[#F39200]" size={14} />
                    <span className="text-[#F39200] text-[11px] font-semibold uppercase tracking-widest">
                        Mi Próximo Evento
                    </span>
                </div>

                <div>
                    <h2 className="text-[20px] font-extrabold text-[#00305B] leading-tight">
                        {clase.titulo}
                    </h2>
                    <p className="text-[13px] text-[#42474F] font-medium mt-1">
                        {clase.descripcion}
                    </p>
                </div>

                {clase.sede && (
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <span>{clase.sede}</span>
                    </div>
                )}

                <div className="flex items-center gap-1.5">
                    <Clock size={15} className="text-[#F39200] shrink-0" />
                    <span className="text-[17px] font-extrabold text-[#00305B]">
                        {textoFecha}
                    </span>
                </div>
            </div>

            <div className="shrink-0">
                <Link
                    href="/misclases"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#F39200] bg-white text-[#F39200] text-[11px] font-bold uppercase tracking-wider hover:bg-[#FFF8F0] transition-all duration-200"
                >
                    <GraduationCap size={14} />
                    Ir a mis clases
                </Link>
            </div>
        </div>
    );
}