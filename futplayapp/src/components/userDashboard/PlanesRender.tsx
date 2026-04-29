"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/context";
import Link from "next/link";
import { Crown, CheckCircle2 } from "lucide-react";
import { getPlanesLimit, userHasMembresia, type Plan } from "@/data/plans";

export default function PlanesRender() {
    const { usuario } = useAuthUser();
    const [hasPlan, setHasPlan] = useState<boolean | null>(null);
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMembresiaYPlanes = async () => {
            if (!usuario?.id) return;

            setLoading(true);

            try {
                const hasMembership = await userHasMembresia(usuario.id);
                setHasPlan(hasMembership);

                if (!hasMembership) {
                    const data = await getPlanesLimit(3);
                    setPlanes(data);
                }
            } catch (err) {
                console.error("Error inesperado:", err);
                setHasPlan(false);
            } finally {
                setLoading(false);
            }
        };

        fetchMembresiaYPlanes();
    }, [usuario]);

    if (loading) return null;
    if (hasPlan) return null;

    return (
        <div className="w-full bg-gradient-to-br from-[#001c37] to-[#00305B] px-8 py-8 rounded-2xl shadow-xl mt-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F28C28] rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/4"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F28C28]/20 text-[#F28C28] rounded-full text-sm font-semibold border border-[#F28C28]/30">
                        <Crown size={16} />
                        <span>Desbloquea tu potencial</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                        ¡Aún no tienes un plan activo!
                    </h2>
                    <p className="text-blue-100/80 text-lg max-w-lg">
                        Únete hoy y accede a entrenamientos exclusivos, métricas avanzadas y participa en todas nuestras clases.
                    </p>
                    <Link href="/planes">
                        <button className="mt-4 bg-[#F28C28] hover:bg-[#e07d1f] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(242,140,40,0.4)] hover:shadow-[0_0_25px_rgba(242,140,40,0.6)] transform hover:-translate-y-1">
                            Ver todos los planes
                        </button>
                    </Link>
                </div>

                <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 justify-center lg:justify-end">
                    {planes.map((plan) => (
                        <div key={plan.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex flex-col w-full sm:w-[250px] shadow-lg hover:bg-white/15 transition-all">
                            <h3 className="text-xl font-bold text-white mb-2 capitalize">{plan.nombre}</h3>
                            <div className="text-3xl font-black text-[#F28C28] mb-4">
                                ${plan.precio ? plan.precio.toLocaleString("es-CL") : "0"}
                                <span className="text-sm font-normal text-white/60">/mes</span>
                            </div>
                            
                            <ul className="space-y-3 mb-6 flex-1">
                                <li className="flex items-center gap-2 text-sm text-white/80">
                                    <CheckCircle2 size={16} className="text-[#F28C28]" />
                                    {plan.tokens_mensuales} Tokens Mensuales
                                </li>
                                <li className="flex items-center gap-2 text-sm text-white/80">
                                    <CheckCircle2 size={16} className="text-[#F28C28]" />
                                    Acceso a clases
                                </li>
                                <li className="flex items-center gap-2 text-sm text-white/80">
                                    <CheckCircle2 size={16} className="text-[#F28C28]" />
                                    Acceso completo a cápsulas e-learning
                                </li>
                                <li className="flex items-center gap-2 text-sm text-white/80">
                                    <CheckCircle2 size={16} className="text-[#F28C28]" />
                                    Métricas básicas
                                </li>
                            </ul>

                            <button className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors border border-white/10">
                                Comprar
                            </button>
                        </div>
                    ))}
                    {planes.length === 0 && (
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-center items-center text-center w-full sm:w-[280px]">
                            <p className="text-white/60 mb-4">Cargando increíbles planes para ti...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
