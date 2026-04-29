"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, Shield, Zap, Crown, ArrowLeft } from "lucide-react";
import Link from "next/link";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";

interface Plan {
    id: string;
    nombre: string;
    tokens_mensuales: number;
    precio: number;
}

export default function PlanesPage() {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlanes = async () => {
            const supabase = createClient();
            try {
                const { data, error } = await supabase
                    .from("plan")
                    .select("*")
                    .order("precio", { ascending: true });

                if (error) throw error;
                if (data) setPlanes(data);
            } catch (err) {
                console.error("Error obteniendo planes:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlanes();
    }, []);

    const renderPlanIcon = (index: number) => {
        switch (index) {
            case 0: return <Zap className="text-gray-400 w-12 h-12 mb-4 mx-auto" />;
            case 1: return <Shield className="text-[#F28C28] w-12 h-12 mb-4 mx-auto" />;
            case 2: return <Crown className="text-yellow-400 w-12 h-12 mb-4 mx-auto" />;
            default: return <Zap className="text-blue-400 w-12 h-12 mb-4 mx-auto" />;
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col">
            <TopNavBarUser />
            
            <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-10 flex flex-col">
                {/* Header Section */}
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-[#004080] text-4xl md:text-5xl font-black mb-4">
                        Elige tu <span className="text-[#F28C28]">Plan</span> Ideal
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Potencia tu entrenamiento, asiste a nuestras clases exclusivas y lleva tu juego al siguiente nivel. Encuentra la opción perfecta para ti.
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C28]"></div>
                    </div>
                )}

                {/* Grid de Planes */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center items-center mt-6">
                        {planes.map((plan, index) => {
                            const isDestacado = index === 1; // Asumimos que el plan del medio es el destacado
                            
                            return (
                                <div 
                                    key={plan.id}
                                    className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300
                                        ${isDestacado 
                                            ? 'bg-gradient-to-b from-[#00305B] to-[#001c37] text-white shadow-2xl scale-105 border border-[#F28C28]/30' 
                                            : 'bg-white text-gray-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 border border-gray-100'
                                        }`}
                                >
                                    {isDestacado && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F28C28] text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                            Más Popular
                                        </div>
                                    )}

                                    <div className="text-center">
                                        {renderPlanIcon(index)}
                                        <h2 className={`text-2xl font-bold uppercase tracking-wider mb-2 ${isDestacado ? 'text-white' : 'text-[#004080]'}`}>
                                            {plan.nombre}
                                        </h2>
                                        <div className="flex justify-center items-baseline my-6">
                                            <span className={`text-5xl font-black ${isDestacado ? 'text-[#F28C28]' : 'text-[#004080]'}`}>
                                                ${plan.precio ? plan.precio.toLocaleString("es-CL") : "0"}
                                            </span>
                                            <span className={`ml-1 text-lg font-medium ${isDestacado ? 'text-white/70' : 'text-gray-500'}`}>
                                                /mes
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 mt-6 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className={`w-6 h-6 shrink-0 ${isDestacado ? 'text-[#F28C28]' : 'text-[#F28C28]'}`} />
                                            <p className={isDestacado ? 'text-white/90' : 'text-gray-600'}>
                                                <span className="font-bold">{plan.tokens_mensuales} Tokens</span> mensuales para canjear por clases y eventos.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className={`w-6 h-6 shrink-0 ${isDestacado ? 'text-[#F28C28]' : 'text-[#F28C28]'}`} />
                                            <p className={isDestacado ? 'text-white/90' : 'text-gray-600'}>
                                                Acceso prioritario a reservas en todas nuestras sedes.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className={`w-6 h-6 shrink-0 ${isDestacado ? 'text-[#F28C28]' : 'text-[#F28C28]'}`} />
                                            <p className={isDestacado ? 'text-white/90' : 'text-gray-600'}>
                                                Acceso completo a nuestra biblioteca de <span className="font-bold">cápsulas e-learning</span>.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className={`w-6 h-6 shrink-0 ${isDestacado ? 'text-[#F28C28]' : 'text-[#F28C28]'}`} />
                                            <p className={isDestacado ? 'text-white/90' : 'text-gray-600'}>
                                                Análisis de métricas corporales y seguimiento de progreso.
                                            </p>
                                        </div>
                                    </div>

                                    <button 
                                        className={`w-full mt-10 py-4 rounded-xl font-bold text-lg transition-all duration-300
                                            ${isDestacado 
                                                ? 'bg-[#F28C28] hover:bg-[#e07d1f] text-white shadow-[0_0_20px_rgba(242,140,40,0.4)] hover:shadow-[0_0_30px_rgba(242,140,40,0.6)] transform hover:-translate-y-1' 
                                                : 'bg-gray-100 hover:bg-gray-200 text-[#004080] border border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        Comprar Plan
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {!loading && planes.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-md">
                        <p className="text-gray-500 text-xl">Actualmente no hay planes disponibles.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
