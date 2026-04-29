"use client";

import { useState, useMemo } from "react";
import { X, Loader2, HeartPulse, User, AlertCircle, CheckCircle } from "lucide-react";
import {
    createFichaMedica,
    updateUserProfile,
    calculateIMC,
    getIMCStatus,
} from "@/data/fichaMedica";

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    planId: string;
    planName: string;
    userId: string;
};

export default function FichaMedicaModal({ open, onClose, onSuccess, planId, planName, userId }: Props) {
    const [rut, setRut] = useState("");
    const [telefono, setTelefono] = useState("");
    const [edad, setEdad] = useState("");
    const [peso, setPeso] = useState("");
    const [estatura, setEstatura] = useState("");
    const [grupoSanguineo, setGrupoSanguineo] = useState("");
    const [enfermedades, setEnfermedades] = useState("");
    const [alergias, setAlergias] = useState("");
    const [medicamentos, setMedicamentos] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const imc = useMemo(() => {
        const pesoNum = parseFloat(peso);
        const estaturaNum = parseFloat(estatura);
        if (pesoNum > 0 && estaturaNum > 0) {
            return calculateIMC(pesoNum, estaturaNum);
        }
        return null;
    }, [peso, estatura]);

    const imcStatus = imc !== null ? getIMCStatus(imc) : null;

    const resetForm = () => {
        setRut("");
        setTelefono("");
        setEdad("");
        setPeso("");
        setEstatura("");
        setGrupoSanguineo("");
        setEnfermedades("");
        setAlergias("");
        setMedicamentos("");
        setObservaciones("");
        setStep(1);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateStep1 = () => {
        return rut.trim() !== "" && telefono.trim() !== "" && edad.trim() !== "" && peso.trim() !== "" && estatura.trim() !== "" && grupoSanguineo.trim() !== "";
    };

    const validateStep2 = () => {
        return enfermedades.trim() !== "" && alergias.trim() !== "" && medicamentos.trim() !== "" && observaciones.trim() !== "";
    };

    const handleSubmit = async () => {
        setError(null);
        setSaving(true);

        const imcValue = calculateIMC(parseFloat(peso), parseFloat(estatura));

        const success = await updateUserProfile(userId, { rut: rut.trim(), telefono: telefono.trim() });
        if (!success) {
            setError("Error al guardar datos personales. Intenta nuevamente.");
            setSaving(false);
            return;
        }

        const fichaSuccess = await createFichaMedica(userId, {
            edad: parseInt(edad),
            peso_kg: parseFloat(peso),
            estatura_cm: parseInt(estatura),
            imc: imcValue,
            grupo_sanguineo: grupoSanguineo.trim(),
            enfermedades: enfermedades.trim(),
            alergias: alergias.trim(),
            medicamentos: medicamentos.trim(),
            observaciones: observaciones.trim(),
        });

        if (!fichaSuccess) {
            setError("Error al guardar la ficha médica. Intenta nuevamente.");
            setSaving(false);
            return;
        }

        setSaving(false);
        handleClose();
        onSuccess();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-[#00305B]">
                            Ficha Médica Obligatoria
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Para adquirir <span className="font-semibold text-[#00A86B]">{planName}</span> necesitas completar tus datos.
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 pt-4 flex items-center gap-2">
                    <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${step >= 1 ? "bg-[#00A86B] text-white" : "bg-slate-100 text-slate-400"}`}>
                        <User size={14} />
                        Datos Personales
                    </div>
                    <div className="flex-1 h-0.5 bg-slate-200 rounded" />
                    <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${step >= 2 ? "bg-[#00A86B] text-white" : "bg-slate-100 text-slate-400"}`}>
                        <HeartPulse size={14} />
                        Datos Médicos
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                        RUT <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={rut}
                                        onChange={(e) => setRut(e.target.value)}
                                        placeholder="12.345.678-9"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                        Teléfono <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="+56912345678"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                        Edad <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={edad}
                                        onChange={(e) => setEdad(e.target.value)}
                                        placeholder="25"
                                        min={1}
                                        max={120}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                        Grupo Sanguíneo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={grupoSanguineo}
                                        onChange={(e) => setGrupoSanguineo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all bg-white"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                        Peso (kg) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={peso}
                                        onChange={(e) => setPeso(e.target.value)}
                                        placeholder="75.5"
                                        step="0.1"
                                        min={1}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                        Estatura (cm) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={estatura}
                                        onChange={(e) => setEstatura(e.target.value)}
                                        placeholder="175"
                                        min={1}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {imc !== null && imcStatus && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                                    <div className="text-3xl font-black text-[#00305B]">{imc}</div>
                                    <div className={`text-sm font-semibold ${imcStatus.color}`}>
                                        {imcStatus.label}
                                    </div>
                                    <div className="text-xs text-slate-400 ml-auto">IMC calculado automáticamente</div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                    Enfermedades Crónicas <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={enfermedades}
                                    onChange={(e) => setEnfermedades(e.target.value)}
                                    placeholder="Ninguna"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                    Alergias <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={alergias}
                                    onChange={(e) => setAlergias(e.target.value)}
                                    placeholder="Ninguna"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                    Medicamentos Habituales <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={medicamentos}
                                    onChange={(e) => setMedicamentos(e.target.value)}
                                    placeholder="Ninguno"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#00305B] mb-1.5">
                                    Observaciones <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Cualquier información adicional relevante..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-[#00305B] transition-colors"
                    >
                        {step > 1 ? "Atrás" : "Cancelar"}
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={() => validateStep1() && setStep(2)}
                            disabled={!validateStep1()}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${validateStep1()
                                ? "bg-[#00A86B] hover:bg-[#009960] text-white shadow-lg shadow-[#00A86B]/30"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!validateStep2() || saving}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${validateStep2() && !saving
                                ? "bg-[#00A86B] hover:bg-[#009960] text-white shadow-lg shadow-[#00A86B]/30"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    Completar y Continuar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
