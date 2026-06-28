
import { LucideAlertTriangle } from "lucide-react";
export default function Recordatorio() {
    return (
        <div className="w-full h-[70px] bg-[#FFEBE8] text-[#93000A] shadow-lg border border-[#F8CCCC] border-l-4 border-l-[#93000A]">
            <div className="flex gap-3 p-4 w-full h-full items-center justify-center ">
                <LucideAlertTriangle size={20} className="text-[#93000A]" />
                <p className="text-[#93000A] text-[12px]"> <span className="font-semibold">Recordatorio de Normativa:</span> Las cancelaciones con menos de 3 horas de antelación
                    no devolvera el token de la clase agendada</p>
            </div>



        </div>
    );
}