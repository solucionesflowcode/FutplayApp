"use client";
import { useEffect, useState } from "react";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";
import ProximoEntrenamiento from "../../../components/userDashboard/ProximoEntrenamiento";
import MiAsistencia from "../../../components/userDashboard/MiAsistencia";
import ProximaRenovacion from "../../../components/userDashboard/ProximaRenovacion";
import MetricasCorporales from "../../../components/userDashboard/MetricasCorporales";
import Recordatorio from "../../../components/userDashboard/Recordatorio";
import PlanesRender from "../../../components/userDashboard/PlanesRender";
import CapsulasClient from "../../../components/userDashboard/CapsulasClient";
import { useAuthUser } from "@/context";
import { createClient } from "@/utils/supabase/client";

export default function DashboardClient() {
    const { usuario } = useAuthUser();
    const [tienePlan, setTienePlan] = useState(true);
    const [planChecked, setPlanChecked] = useState(false);

    useEffect(() => {
        const check = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const now = new Date();
            const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
            const inicioMesSiguiente = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const { data } = await supabase
                .from("membresia")
                .select("id")
                .eq("usuario_id", user.id)
                .gte("mes", inicioMes.toISOString().split("T")[0])
                .lt("mes", inicioMesSiguiente.toISOString().split("T")[0])
                .limit(1)
                .maybeSingle();
            setTienePlan(!!data);
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
                                <span className="mx-2">⚽</span>
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
                        <Recordatorio />
                    </div>
                    <div className="w-full">
                        <PlanesRender />
                    </div>
                    {planChecked && tienePlan ? (
                        <div className="flex gap-6 w-full">
                            <div className="flex-1">
                                <MetricasCorporales />
                            </div>
                            <div className="flex-1 flex flex-col gap-6">
                                <MiAsistencia />
                                <ProximaRenovacion />
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            <MetricasCorporales />
                        </div>
                    )}
                    <div className="w-full h-auto">
                        <CapsulasClient />
                    </div>
                </div>
            </div>
        </main>
    );
}
