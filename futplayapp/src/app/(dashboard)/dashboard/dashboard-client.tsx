"use client";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";
import ProximoEntrenamiento from "../../../components/userDashboard/ProximoEntrenamiento";
import MiAsistencia from "../../../components/userDashboard/MiAsistencia";
import MetricasCorporales from "../../../components/userDashboard/MetricasCorporales";
import Recordatorio from "../../../components/userDashboard/Recordatorio";
import PlanesRender from "../../../components/userDashboard/PlanesRender";
import { useAuthUser } from "@/context";

export default function DashboardClient({ children }: { children: React.ReactNode }) {
    const { usuario } = useAuthUser();

    const formattedUser = {
        ...usuario,
        firstName: usuario?.nombre.split(" ")[0],
    };

    return (
        <main>
            <TopNavBarUser />
            <div className="w-full flex flex-col  h-full px-7">
                <h1 className="text-[#004080] text-[30px]">Hola, {formattedUser?.firstName}, atrevete a Jugar</h1>
                <p className="text-gray-500 text-[15px]">Aqui podras ver tus entrenamientos, clases y mucho mas</p>

                <div className="w-full flex flex-col gap-6 mt-5 h-full">
                    <div className="flex flex-wrap gap-6 w-full">
                        <div className="flex-1 min-w-[380px]">
                            <ProximoEntrenamiento />
                        </div>
                        <div className="flex-none">
                            <MiAsistencia />
                        </div>
                        <div className="flex-1 min-w-[300px]">
                            <MetricasCorporales />
                        </div>
                    </div>
                    <div className="w-full">
                        <PlanesRender />
                    </div>
                    <div className="w-full">
                        <Recordatorio />
                    </div>
                    <div className="w-full h-auto">
                        {children}
                    </div>
                </div>
            </div>
        </main>
    );
}
