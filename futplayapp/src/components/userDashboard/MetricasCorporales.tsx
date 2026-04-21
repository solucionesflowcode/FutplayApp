"use client";
import { ChartNoAxesCombined } from "lucide-react";

type Props = {
    peso?: number;
    cambioPeso?: number;
    imc?: number;
    grasa?: number;
};

export default function MetricasCorporales({
    peso = 70.4,
    cambioPeso = -1.7,
    imc = 22.5,
    grasa = 12.5,
}: Props) {
    const imcEstado =
        imc < 18.5
            ? { label: "Bajo peso", color: "bg-yellow-500" }
            : imc < 25
                ? { label: "Saludable", color: "bg-green-500" }
                : { label: "Sobrepeso", color: "bg-red-500" };

    const grasaColor =
        grasa < 10
            ? "from-yellow-400 to-orange-500"
            : grasa < 20
                ? "from-green-400 to-emerald-600"
                : "from-red-400 to-red-600";

    return (
        <div className="w-full relative h-[250px] min-w-[300px] bg-gradient-to-br from-[#002447] to-[#00305B] px-6 py-7 rounded-2xl shadow-xl overflow-hidden border border-white/10">


            <ChartNoAxesCombined
                size={60}
                className="absolute right-4 top-2 text-white/5 z-0 pointer-events-none"
            />


            <h1 className="relative z-10 text-[#A3C9FF] text-[10px] uppercase tracking-wider">
                Métricas Corporales
            </h1>

            <div className="relative z-10 flex flex-col justify-between pt-6 h-full">


                <div className="flex justify-between items-center">
                    <p className="text-white text-[12px] font-semibold">Peso</p>

                    <div className="flex flex-col items-end">
                        <p className="text-[#FFDCBD] text-[16px] font-bold">
                            {peso}kg
                        </p>

                        <p
                            className={`text-[9px] ${cambioPeso < 0 ? "text-green-400" : "text-red-400"
                                }`}
                        >
                            {cambioPeso > 0 ? "+" : ""}
                            {cambioPeso}kg vs mes ant.
                        </p>
                    </div>
                </div>

                {/* IMC */}
                <div className="flex justify-between items-center">
                    <p className="text-white text-[12px] font-semibold">IMC</p>

                    <div className="flex flex-col items-end">
                        <p className="text-[#FFDCBD] text-[16px] font-bold">
                            {imc}
                        </p>

                        <span
                            className={`text-[9px] px-2 py-0.5 rounded-full text-white ${imcEstado.color}`}
                        >
                            {imcEstado.label}
                        </span>
                    </div>
                </div>

                {/* Grasa */}
                <div>
                    <div className="flex text-[12px] font-semibold justify-between items-center text-white">
                        <p>Grasa Corporal</p>
                        <p className="text-[15px] font-bold">{grasa}%</p>
                    </div>

                    <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                            className={`h-2 rounded-full bg-gradient-to-r ${grasaColor} transition-all duration-700 ease-out`}
                            style={{ width: `${Math.min(grasa, 100)}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-[8px] text-white/60 mt-1">
                        <span>0%</span>
                        <span>Normal</span>
                        <span>30%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}