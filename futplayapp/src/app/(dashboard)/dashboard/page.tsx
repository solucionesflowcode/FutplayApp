"use client";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";
import ProximoEntrenamiento from "../../../components/userDashboard/ProximoEntrenamiento";
import MiAsistencia from "../../../components/userDashboard/MiAsistencia";
import MetricasCorporales from "../../../components/userDashboard/MetricasCorporales";
import Recordatorio from "../../../components/userDashboard/Recordatorio";
import { useAuthUser } from "@/context";

export default function DashboardPage() {
    const { usuario } = useAuthUser();

    //esta constante lo que hace es obtener el nombre completo de supabase, pero obtener solo la 
    //primera palabra asi no queda tan largo
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

                <div className="w-full flex-wrap h-full mt-5 flex justify-center gap-10">
                    <ProximoEntrenamiento />
                    <MiAsistencia />
                    <MetricasCorporales />
                    <Recordatorio />
                </div>
            </div>
        </main>
    );
}