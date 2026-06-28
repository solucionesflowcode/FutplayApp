import { CalendarCheck } from "lucide-react";
import Link from "next/link";

export default function AvisoReagendar() {
    return (
        <div className="w-full bg-[#FFF8E1] text-[#7A5C00] shadow-lg border border-[#FFE082] border-t-2 border-t-[#F39200]">
            <div className="flex gap-3 p-4 w-full items-center">
                <CalendarCheck size={24} className="text-[#F39200] shrink-0" />
                <div className="text-[12px] leading-relaxed">
                    <p>
                        <span className="font-semibold">Importante:</span> Nuestras clases se preparan con
                        anticipación y tienen cupos limitados, por lo que cada estudiante es clave para la
                        calidad del entrenamiento. Si surge un imprevisto, te pedimos que reagendes tu clase
                        desde{" "}
                        <Link href="/misclases" className="font-bold underline hover:text-[#F39200] transition-colors">
                            Mis Clases
                        </Link>{" "}
                        solo si es realmente necesario.
                    </p>
                    <p className="mt-1 text-[#9A7A00]">
                        Así aseguramos que todos los cupos se aprovechen al máximo y el grupo mantenga el
                        ritmo de entrenamiento.
                    </p>
                </div>
            </div>
        </div>
    );
}
