"use client";

import { useEffect, useState } from "react";
import { ClipboardPlus, HeartPulse, Activity, Scale, Ruler, Droplets, Pill, AlertCircle, FileText, User, Stethoscope } from "lucide-react";
import { getFichaMedicaByUser, getIMCStatus, calcularEdad } from "@/data/fichaMedica";
import { createClient } from "@/utils/supabase/client";
import FichaMedicaModal from "@/components/checkout/FichaMedicaModal";

type Ficha = {
    fecha_nacimiento: string;
    peso_kg: number;
    estatura_cm: number;
    imc: number;
    grupo_sanguineo: string;
    enfermedades: string;
    alergias: string;
    medicamentos: string;
    observaciones: string;
    usuario_id: string;
};

export default function MetricasCorporales() {
    const [ficha, setFicha] = useState<Ficha | null>(null);
    const [rut, setRut] = useState("");
    const [loading, setLoading] = useState(true);
    const [showFichaModal, setShowFichaModal] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                console.error("No hay usuario logeado");
                return;
            }

            setUserId(user.id);
            const [fichaData, usuarioData] = await Promise.all([
                getFichaMedicaByUser(user.id),
                supabase.from("usuario").select("rut").eq("id", user.id).maybeSingle(),
            ]);
            setFicha(fichaData);
            if (usuarioData.data?.rut) setRut(usuarioData.data.rut);
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) return <p className="text-white">Cargando...</p>;
    if (!ficha) return (
        <>
            <div className="w-full min-w-[300px] h-[250px] bg-gradient-to-br from-[#002447] to-[#00305B] rounded-2xl shadow-xl border border-white/10 flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="bg-white/10 p-3 rounded-full">
                    <ClipboardPlus className="text-[#F39200]" size={28} />
                </div>
                <p className="text-white text-base font-extrabold leading-tight">
                    Completa tu ficha médica
                </p>
                <p className="text-gray-400 text-xs max-w-[220px]">
                    Necesitas tener tu ficha médica al día para poder comprar un plan y entrenar.
                </p>
                <button
                    onClick={() => setShowFichaModal(true)}
                    className="bg-[#F39200] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#d47d00] transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                    <ClipboardPlus size={16} />
                    Completar ficha
                </button>
            </div>
            <FichaMedicaModal
                open={showFichaModal}
                onClose={() => setShowFichaModal(false)}
                onSuccess={() => {
                    setShowFichaModal(false);
                    window.location.reload();
                }}
                userId={userId || ""}
            />
        </>
    );

    const imcStatus = getIMCStatus(ficha.imc);

    const hasMedicalInfo = (val: string) =>
        val && val !== "Ninguna" && val !== "ninguna" && val !== "Ninguno" && val !== "ninguno";

    return (
        <div className="w-full flex flex-col gap-6">
            {/* TOP: Métricas */}
            <div className="w-full bg-gradient-to-br from-[#002447] to-[#00305B] px-6 py-7 rounded-2xl shadow-xl border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#F39200]/20 p-2.5 rounded-xl">
                        <HeartPulse className="text-[#F39200]" size={20} />
                    </div>
                    <div>
                        <h2 className="text-white text-sm font-extrabold tracking-wide">
                            Ficha Médica
                        </h2>
                        {rut && <p className="text-white/40 text-[10px] font-mono">RUT {rut}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={13} className="text-[#F39200]/70" />
                            <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Edad</span>
                        </div>
                        <p className="text-white text-lg font-bold">{calcularEdad(ficha.fecha_nacimiento)} <span className="text-xs font-normal text-white/50">años</span></p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Droplets size={13} className="text-red-400/70" />
                            <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Grupo Sang.</span>
                        </div>
                        <p className="text-white text-lg font-bold">{ficha.grupo_sanguineo}</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Scale size={13} className="text-[#F39200]/70" />
                            <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Peso</span>
                        </div>
                        <p className="text-white text-lg font-bold">{ficha.peso_kg} <span className="text-xs font-normal text-white/50">kg</span></p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Ruler size={13} className="text-[#F39200]/70" />
                            <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Estatura</span>
                        </div>
                        <p className="text-white text-lg font-bold">{ficha.estatura_cm} <span className="text-xs font-normal text-white/50">cm</span></p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3.5 border border-white/5 col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={13} className="text-[#F39200]/70" />
                            <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">IMC</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-white text-lg font-bold">{ficha.imc}</p>
                            <span className={`text-[11px] px-3 py-1 rounded-full font-bold ${imcStatus.color.replace("text-", "text-")} bg-white/10`}>
                                {imcStatus.label}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM: Historial médico */}
            <div className="w-full bg-gradient-to-br from-[#002447] to-[#00305B] px-6 py-7 rounded-2xl shadow-xl border border-white/10">
                <div className="flex items-center gap-3 mb-5">
                    <div className="bg-[#F39200]/20 p-2.5 rounded-xl">
                        <HeartPulse className="text-[#F39200]" size={20} />
                    </div>
                    <div>
                        <h2 className="text-white text-sm font-extrabold tracking-wide">
                            Historial Médico
                        </h2>
                    </div>
                </div>

                <div className="space-y-4">
                    {hasMedicalInfo(ficha.enfermedades) && (
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Stethoscope size={13} className="text-red-400/70" />
                                <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Enfermedades</span>
                            </div>
                            <p className="text-white/80 text-sm">{ficha.enfermedades}</p>
                        </div>
                    )}

                    {hasMedicalInfo(ficha.alergias) && (
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <AlertCircle size={13} className="text-yellow-400/70" />
                                <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Alergias</span>
                            </div>
                            <p className="text-white/80 text-sm">{ficha.alergias}</p>
                        </div>
                    )}

                    {hasMedicalInfo(ficha.medicamentos) && (
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Pill size={13} className="text-blue-400/70" />
                                <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Medicamentos</span>
                            </div>
                            <p className="text-white/80 text-sm">{ficha.medicamentos}</p>
                        </div>
                    )}

                    {hasMedicalInfo(ficha.observaciones) && (
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <FileText size={13} className="text-white/40" />
                                <span className="text-white/40 text-[9px] uppercase tracking-wider font-semibold">Observaciones</span>
                            </div>
                            <p className="text-white/80 text-sm whitespace-pre-wrap">{ficha.observaciones}</p>
                        </div>
                    )}

                    {!hasMedicalInfo(ficha.enfermedades) && !hasMedicalInfo(ficha.alergias) && !hasMedicalInfo(ficha.medicamentos) && !hasMedicalInfo(ficha.observaciones) && (
                        <p className="text-white/40 text-sm">Sin información médica adicional registrada.</p>
                    )}
                </div>
            </div>
        </div>
    );
}