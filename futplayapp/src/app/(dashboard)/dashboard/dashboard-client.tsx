"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, X, Loader2 } from "lucide-react";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";
import ProximoEntrenamiento from "../../../components/userDashboard/ProximoEntrenamiento";
import AvisoReagendar from "../../../components/userDashboard/AvisoReagendar";
import MiAsistencia from "../../../components/userDashboard/MiAsistencia";
import ProximaRenovacion from "../../../components/userDashboard/ProximaRenovacion";
import MetricasCorporales from "../../../components/userDashboard/MetricasCorporales";
import Recordatorio from "../../../components/userDashboard/Recordatorio";
import PlanesRender from "../../../components/userDashboard/PlanesRender";
import CapsulasClient from "../../../components/userDashboard/CapsulasClient";
import { useAuthUser } from "@/context";
import { createClient } from "@/utils/supabase/client";
import { userHasFichaMedica } from "@/data/fichaMedica";

export default function DashboardClient() {
    const { usuario } = useAuthUser();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [tienePlan, setTienePlan] = useState(true);
    const [tieneFicha, setTieneFicha] = useState(false);
    const [planChecked, setPlanChecked] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showFailure, setShowFailure] = useState(false);
    const [confirmIndeterminate, setConfirmIndeterminate] = useState(false);
    const [confirmingPayment, setConfirmingPayment] = useState(false);

    useEffect(() => {
        if (searchParams.get("flowSuccess") !== "1") return;

        const token = searchParams.get("token");
        const params = new URLSearchParams(window.location.search);
        params.delete("flowSuccess");
        params.delete("token");
        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        window.history.replaceState({}, "", newUrl);

        const boletaId = typeof window !== "undefined" ? sessionStorage.getItem("flowBoletaId") : null;
        if (!boletaId) return;
        sessionStorage.removeItem("flowBoletaId");

        let cancelled = false;
        setConfirmingPayment(true);

        const url = new URL("/api/flow/confirm", window.location.origin);
        url.searchParams.set("boletaId", boletaId);
        if (token && token !== "{token}") {
            url.searchParams.set("token", token);
        }

        // Límite de seguridad: nunca dejar el modal "Confirmando pago" por siempre.
        // Si el poll no resolvió nada dentro de este plazo, cerramos confirmando y
        // mostramos el aviso neutro (el pago puede completarse vía webhook en 2º plano).
        const hardTimeout = setTimeout(() => {
            if (cancelled) return;
            setConfirmingPayment(false);
            setConfirmIndeterminate(true);
        }, 25000);

        const poll = async (attempts: number): Promise<void> => {
            if (cancelled) return;
            try {
                const res = await fetch(url.toString(), {
                    signal: AbortSignal.timeout(8000),
                });
                const data = await res.json();
                if (res.ok && data.estado === "pagado") {
                    setShowSuccess(true);
                    return;
                }
                if (data.estado === "rechazado" || data.estado === "anulado") {
                    setShowFailure(true);
                    return;
                }
                if (data.estado === "pendiente" && attempts < 6) {
                    await new Promise((r) => setTimeout(r, 2500));
                    return poll(attempts + 1);
                }
                // No se pudo confirmar automáticamente en el poll. En lugar de bloquear
                // con "carga eterna", mostramos un aviso neutro: el pago pudo completarse
                // (el webhook termina de sincronizar en segundo plano). El usuario puede
                // recargar para ver el estado final.
                if (!cancelled) setConfirmIndeterminate(true);
            } catch {
                if (!cancelled) setConfirmIndeterminate(true);
            }
        };
        poll(0).finally(() => {
            if (!cancelled) setConfirmingPayment(false);
        });

        return () => {
            cancelled = true;
            clearTimeout(hardTimeout);
            setShowSuccess(false);
        };
    }, [searchParams]);

    useEffect(() => {
        const check = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const ahora = new Date();
            const año = ahora.getFullYear();
            const month = ahora.getMonth() + 1;
            const inicioMes = `${año}-${String(month).padStart(2, '0')}-01`;
            const inicioMesSiguiente = month === 12
                ? `${año + 1}-01-01`
                : `${año}-${String(month + 1).padStart(2, '0')}-01`;

            const [tieneFichaData, membresiaResponse] = await Promise.all([
                userHasFichaMedica(user.id),
                supabase
                    .from("membresia")
                    .select("id")
                    .eq("usuario_id", user.id)
                    .gte("fecha_inicio", inicioMes)
                    .lt("fecha_inicio", inicioMesSiguiente)
                    .limit(1)
                    .maybeSingle()
            ]);

            setTieneFicha(tieneFichaData);
            setTienePlan(!!membresiaResponse.data);
            setPlanChecked(true);
        };
        check();
    }, []);

    const formattedUser = {
        ...usuario,
        firstName: usuario?.nombre.split(" ")[0],
    };

    return (
        <main>
            <TopNavBarUser />
            <div className="w-full flex flex-col h-full px-7">
                <div className="relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-12 bg-gradient-to-b from-[#F39200] to-[#60A5FA] rounded-full" />
                        <div>
                            <h1 className="text-[30px] font-black text-[#001220] tracking-tight leading-none">
                                ¡Hola, {formattedUser?.firstName}!
                            </h1>
                            <p className="text-[#F39200] text-[17px] mt-1.5 font-extrabold tracking-widest uppercase">
                                <span className="text-[#00305B]">Fut</span><span className="text-[#00305B]">Play</span>
                                <span className="mx-2 text-[#F39200]">·</span>
                                <span>Atrévete a Jugar</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-col gap-6 mt-5 h-full">
                    <div className="w-full">
                        <ProximoEntrenamiento />
                    </div>
                    <div className="w-full">
                        <AvisoReagendar />
                    </div>
                    <div className="w-full">
                        <Recordatorio />
                    </div>
                    <div className="w-full">
                        <PlanesRender />
                    </div>
                    {planChecked && (
                        tieneFicha ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                <MiAsistencia />
                                <ProximaRenovacion />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                <MetricasCorporales />
                                <MiAsistencia />
                                <ProximaRenovacion />
                            </div>
                        )
                    )}
                    <div className="w-full h-auto">
                        <CapsulasClient />
                    </div>
                </div>
            </div>

            {confirmingPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" />
                    <div className="relative bg-white border-t-2 border-t-[#F28C28] shadow-2xl ring-1 ring-inset ring-black/[0.03] p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <Loader2 className="w-12 h-12 text-[#F28C28] animate-spin mx-auto" />
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            Confirmando pago
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Estamos verificando el pago con Flow. Un momento por favor...
                        </p>
                    </div>
                </div>
            )}

            {confirmIndeterminate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" />
                    <div className="relative bg-white border-t-2 border-t-[#F28C28] shadow-2xl ring-1 ring-inset ring-black/[0.03] p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            Verificando pago
                        </h3>
                        <p className="text-gray-500 text-sm">
                            No pudimos confirmar tu pago automáticamente. Si lo completaste, quedará activo en unos segundos.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-8 w-full py-3.5 rounded bg-[#F28C28] hover:bg-[#e07d1f] text-white font-bold shadow-lg shadow-[#F28C28]/30 hover:shadow-xl hover:shadow-[#F28C28]/40 transition-all"
                        >
                            Recargar y ver mi estado
                        </button>
                    </div>
                </div>
            )}

            {showFailure && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" onClick={() => setShowFailure(false)} />
                    <div className="relative bg-white border-t-2 border-t-[#DC2626] shadow-2xl ring-1 ring-inset ring-black/[0.03] p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowFailure(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-20 h-20 rounded-full bg-[#DC2626]/10 flex items-center justify-center mx-auto">
                            <XCircle className="w-10 h-10 text-[#DC2626]" />
                        </div>
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            El pago no se pudo completar
                        </h3>
                        <p className="text-gray-500 text-sm">
                            La transacción fue rechazada o cancelada, por lo que tu plan no fue activado. Puedes intentarlo nuevamente desde la sección de planes.
                        </p>
                        <button
                            onClick={() => setShowFailure(false)}
                            className="mt-8 w-full py-3.5 rounded bg-[#F28C28] hover:bg-[#e07d1f] text-white font-bold shadow-lg shadow-[#F28C28]/30 hover:shadow-xl hover:shadow-[#F28C28]/40 transition-all"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
                    <div className="relative bg-white border-t-2 border-t-[#00A86B] shadow-2xl ring-1 ring-inset ring-black/[0.03] p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-20 h-20 rounded-full bg-[#00A86B]/10 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-[#00A86B]" />
                        </div>
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            ¡Pago exitoso!
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Tu plan ha sido activado correctamente. Ya puedes disfrutar de todos los beneficios.
                        </p>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="mt-8 w-full py-3.5 rounded bg-gradient-to-r from-[#00A86B] to-[#009960] text-white font-bold shadow-lg shadow-[#00A86B]/30 hover:shadow-xl hover:shadow-[#00A86B]/40 transition-all"
                        >
                            Ir al Dashboard
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
