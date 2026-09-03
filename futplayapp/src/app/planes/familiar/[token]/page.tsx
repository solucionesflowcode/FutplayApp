"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Users, Zap, Shield, Crown, LogIn } from "lucide-react";

type PlanFamiliar = {
    id: string;
    nombre: string;
    precio: number;
    tokens_mensuales: number;
    dias_vigencia: number | null;
    tipo_plan: "normal" | "familiar";
};

function formatPrice(n: number) {
    return "$" + n.toLocaleString("es-CL");
}

function renderPlanIcon(nombre: string) {
    const lower = nombre.toLowerCase();
    if (lower.includes("premium")) return <Crown className="text-[#F28C28] w-12 h-12 mx-auto mb-4" />;
    if (lower.includes("pro") || lower.includes("familiar")) return <Shield className="text-[#F28C28] w-12 h-12 mx-auto mb-4" />;
    return <Zap className="text-gray-400 w-12 h-12 mx-auto mb-4" />;
}

export default function PlanFamiliarPage() {
    const params = useParams<{ token: string }>();
    const router = useRouter();
    const token = params?.token;

    const [plan, setPlan] = useState<PlanFamiliar | null>(null);
    const [loading, setLoading] = useState(true);
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        if (!token) {
            setInvalid(true);
            setLoading(false);
            return;
        }
        let cancelled = false;

        const fetchPlan = async () => {
            try {
                const res = await fetch(`/api/planes/familiar?token=${encodeURIComponent(token)}`);
                if (cancelled) return;
                if (!res.ok) {
                    setInvalid(true);
                    return;
                }
                const data = await res.json();
                setPlan(data);
            } catch {
                if (!cancelled) setInvalid(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchPlan();
        return () => { cancelled = true; };
    }, [token]);

    return (
        <main className="min-h-screen bg-[#f8f9fb] flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <span className="text-xl font-black tracking-tight text-[#00305B]">
                        Fut<span className="text-[#F28C28]">Play</span>
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                        <Users size={13} />
                        Acceso exclusivo
                    </span>
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center px-6 py-12">
                {loading && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin h-10 w-10 text-[#F28C28]" />
                        <p className="text-gray-500 font-medium">Validando tu link...</p>
                    </div>
                )}

                {!loading && invalid && (
                    <div className="bg-white shadow-xl ring-1 ring-inset ring-black/[0.03] p-12 max-w-md w-full text-center border-t-2 border-t-[#ba1a1a]">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-black text-[#00305B] mb-2">Link inválido</h1>
                        <p className="text-gray-500 mb-6">
                            Este enlace no es válido o fue regenerado por el administrador.
                            Solicita un nuevo link para acceder a este plan.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-[#F28C28] hover:bg-[#e07d1f] text-white px-8 py-3 rounded font-bold transition-all"
                        >
                            Ir al inicio
                        </Link>
                    </div>
                )}

                {!loading && plan && (
                    <div className="bg-white shadow-xl ring-1 ring-inset ring-black/[0.03] p-8 md:p-12 max-w-md w-full text-center border-t-2 border-t-[#F28C28]">
                        {renderPlanIcon(plan.nombre)}

                        <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-3">
                            Plan Familiar · Exclusivo
                        </span>

                        <h1 className="text-3xl font-black text-[#00305B] capitalize">{plan.nombre}</h1>

                        <div className="my-6">
                            <span className="text-5xl font-black text-[#00305B]">{formatPrice(plan.precio)}</span>
                            <span className="text-gray-400 font-medium ml-2">
                                / {(plan.dias_vigencia ?? 30) >= 90 ? "trimestre" : "mes"}
                            </span>
                        </div>

                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-left space-y-3 mb-8">
                            <div className="flex items-center gap-3">
                                <Zap size={18} className="text-[#F28C28] shrink-0" />
                                <p className="text-gray-600 text-sm">
                                    <span className="font-bold text-gray-900">{plan.tokens_mensuales}</span>{" "}
                                    sesiones de entrenamiento por período
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-[#F28C28] shrink-0" />
                                <p className="text-gray-600 text-sm">
                                    Plan disponible únicamente para quienes recibieron este enlace
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => router.push(`/pagos?id=${plan.id}&acceso=${token}`)}
                            className="w-full py-4 rounded font-bold text-lg bg-[#F28C28] hover:bg-[#e07d1f] text-white shadow-[0_0_20px_rgba(242,140,40,0.4)] hover:shadow-[0_0_30px_rgba(242,140,40,0.6)] transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            <LogIn size={18} />
                            Comprar Plan
                        </button>

                        <p className="text-xs text-gray-400 mt-4">
                            Necesitas una cuenta en FutPlay para completar la compra.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
