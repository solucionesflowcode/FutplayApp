
import { LucideAlertTriangle } from "lucide-react";
export default function Recordatorio() {
    return (
        <div className="w-full h-[70px]  rounded-xl bg-[#FFEBE8] text-[#93000A] shadow-lg border-1 border-[#F8CCCC]">
            <div className="flex gap-3 p-4 w-full h-full items-center justify-center ">
                <LucideAlertTriangle size={20} className="text-[#93000A]" />
                <p className="text-[#93000A] text-[12px]"> <span className="font-semibold">Recordatorio de Normativa:</span> Las cancelaciones con menos de 4 horas de antelación generarán una penalización automática del
                    5% en el cobro del siguiente pago.</p>
            </div>



        </div>
    );
}