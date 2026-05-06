"use client";

import { useEffect, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { getFichaMedicaByUser } from "@/data/fichaMedica";
import { createClient } from "@/utils/supabase/client";

type Ficha = {
    peso_kg: number;
    imc: number;
    usuario_id: string;
};

export default function MetricasCorporales() {
    const [ficha, setFicha] = useState<Ficha | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            // 🔑 obtener usuario logeado
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                console.error("No hay usuario logeado");
                return;
            }

            const data = await getFichaMedicaByUser(user.id);
            setFicha(data);
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) return <p className="text-white">Cargando...</p>;
    if (!ficha) return <p className="text-white">Sin datos</p>;

    const peso = ficha.peso_kg;
    const imc = ficha.imc;

    // puedes calcular esto si no lo tienes en DB
    const cambioPeso = 0;
    const grasa = 15; // si no lo tienes aún

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
                className="absolute right-4 top-2 text-white/5"
            />

            <h1 className="text-[#A3C9FF] text-[10px] uppercase tracking-wider">
                Métricas Corporales
            </h1>

            <div className="flex flex-col justify-between pt-6 h-full">

                {/* Peso */}
                <div className="flex justify-between items-center">
                    <p className="text-white text-[12px] font-semibold">Peso</p>

                    <div className="flex flex-col items-end">
                        <p className="text-[#FFDCBD] text-[16px] font-bold">
                            {peso}kg
                        </p>

                        <p className="text-[9px] text-green-400">
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

                        <span className={`text-[9px] px-2 py-0.5 rounded-full text-white ${imcEstado.color}`}>
                            {imcEstado.label}
                        </span>
                    </div>
                </div>

                {/* Grasa */}
                <div>
                    <div className="flex text-[12px] font-semibold justify-between text-white">
                        <p>Grasa Corporal</p>
                        <p className="text-[15px] font-bold">{grasa}%</p>
                    </div>

                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                        <div
                            className={`h-2 rounded-full bg-gradient-to-r ${grasaColor}`}
                            style={{ width: `${Math.min(grasa, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}