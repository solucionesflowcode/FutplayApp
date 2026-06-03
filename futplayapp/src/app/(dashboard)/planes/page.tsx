"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Shield, Zap, Crown, ClipboardPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";
import FichaMedicaModal from "@/components/checkout/FichaMedicaModal";
import { getPlanes, type Plan } from "@/data/plans";
import { getMiMembresia } from "@/data/pagos";
import { useAuthUser } from "@/context";
import { userHasFichaMedica } from "@/data/fichaMedica";

export default function PlanesPage() {
    const router = useRouter();
    const { usuario, user } = useAuthUser();
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [tienePlanActivo, setTienePlanActivo] = useState(false);
    const [showFichaModal, setShowFichaModal] = useState(false);
    const [openFicha, setOpenFicha] = useState(false);

    // Force loading off after 5 seconds max (independent of any fetch)
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(t);
    }, []);

    // Detect BFCache restore: the 5s timeout above may have been cleared when navigating away,
    // and the browser may restore the page with stale loading=true. Force a reload.
    useEffect(() => {
        const handler = (e: PageTransitionEvent) => {
            if (e.persisted) {
                window.location.reload();
            }
        };
        window.addEventListener("pageshow", handler);
        return () => window.removeEventListener("pageshow", handler);
    }, []);

    // Cleanup orphaned flowBoletaId when landing on /planes (e.g. after back navigation from Flow)
    useEffect(() => {
        const boletaId = sessionStorage.getItem("flowBoletaId");
        if (!boletaId) return;
        sessionStorage.removeItem("flowBoletaId");
        fetch("/api/flow/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boletaId }),
        }).catch(() => {});
    }, []);

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                const [planesData] = await Promise.all([getPlanes()]);
                if (cancelled) return;
                setPlanes(planesData);
                if (usuario?.id) {
                    const membresia = await getMiMembresia(usuario.id);
                    if (cancelled) return;
                    if (membresia) {
                        const vencimiento = new Date(membresia.mes + "T00:00:00");
                        vencimiento.setMonth(vencimiento.getMonth() + 1);
                        vencimiento.setDate(0);
                        setTienePlanActivo(vencimiento >= new Date());
                    }
                }
            } catch (err) {
                console.error("Error obteniendo datos:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchData();

        return () => { cancelled = true; };
    }, [usuario]);

    const handleComprarPlan = async (plan: Plan) => {
        if (!usuario?.id) return;
        const tieneFicha = await userHasFichaMedica(usuario.id);
        if (!tieneFicha) {
            setShowFichaModal(true);
            return;
        }
        // Cancel any orphaned boleta from a previous Flow session
        const bId = typeof window !== "undefined" ? sessionStorage.getItem("flowBoletaId") : null;
        if (bId) {
            await fetch("/api/flow/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ boletaId: bId }),
            });
            sessionStorage.removeItem("flowBoletaId");
        }
        router.push(`/pagos?id=${plan.id}`);
    };

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
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-[#004080] text-4xl md:text-5xl font-black mb-4">
                        Elige tu <span className="text-[#F28C28]">Plan</span> Ideal
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Potencia tu entrenamiento, asiste a nuestras clases exclusivas y lleva tu juego al siguiente nivel. Encuentra la opción perfecta para ti.
                    </p>
                </div>

                {loading && (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C28]"></div>
                    </div>
                )}

                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center items-center mt-6">
                        {planes.map((plan, index) => {
                            const isDestacado = index === 1;
                            
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
                                        onClick={() => handleComprarPlan(plan)}
                                        disabled={tienePlanActivo}
                                        className={`w-full mt-10 py-4 rounded-xl font-bold text-lg transition-all duration-300
                                            ${tienePlanActivo
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : isDestacado 
                                                    ? 'bg-[#F28C28] hover:bg-[#e07d1f] text-white shadow-[0_0_20px_rgba(242,140,40,0.4)] hover:shadow-[0_0_30px_rgba(242,140,40,0.6)] transform hover:-translate-y-1' 
                                                    : 'bg-gray-100 hover:bg-gray-200 text-[#004080] border border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {tienePlanActivo ? "Plan activo" : "Comprar Plan"}
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

            {/* Modal aviso ficha médica requerida */}
            {showFichaModal && !openFicha && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl text-center">
                        <button onClick={() => setShowFichaModal(false)} className="float-right p-1 hover:bg-gray-100 rounded-lg">
                            <X size={20} className="text-gray-400" />
                        </button>
                        <div className="bg-[#F39200]/10 p-3 rounded-full w-fit mx-auto mb-4">
                            <ClipboardPlus className="text-[#F39200]" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Ficha médica requerida</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Necesitas completar tu ficha médica antes de poder comprar un plan. Es un requisito obligatorio para entrenar con nosotros.
                        </p>
                        <button
                            onClick={() => setOpenFicha(true)}
                            className="w-full bg-[#F39200] text-white py-3 rounded-xl font-bold hover:bg-[#d47d00] transition-all cursor-pointer"
                        >
                            Completar ficha médica
                        </button>
                    </div>
                </div>
            )}

            <FichaMedicaModal
                open={openFicha}
                onClose={() => setOpenFicha(false)}
                onSuccess={() => {
                    setOpenFicha(false);
                    setShowFichaModal(false);
                }}
                userId={user?.id || ""}
            />
        </main>
    );
}
