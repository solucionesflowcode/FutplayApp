"use client";

import { useState, useMemo } from "react";
import { X, Loader2, HeartPulse, User, AlertCircle, CheckCircle2, Activity, Scale, Ruler, Phone, CreditCard, Pill, FileText, Droplets } from "lucide-react";
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
    planId?: string;
    planName?: string;
    userId: string;
};

function formatRut(value: string): string {
    const clean = value.replace(/[^0-9kK\-]/g, "").replace(/-/g, "").toUpperCase();
    if (clean.length <= 1) return clean;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    return `${cuerpo}-${dv}`;
}

function validateRut(rut: string): boolean {
    const clean = rut.replace(/-/g, "").toUpperCase();
    if (clean.length < 2) return false;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();
    return dv === dvCalculado;
}

export default function FichaMedicaModal({ open, onClose, onSuccess, planId, planName, userId }: Props) {
    const [rut, setRut] = useState("");
    const [rutError, setRutError] = useState("");
    const [telefono, setTelefono] = useState("+569");
    const [telefonoError, setTelefonoError] = useState("");
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
        setRutError("");
        setTelefono("+569");
        setTelefonoError("");
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

    const handleRutChange = (value: string) => {
        const formatted = formatRut(value);
        setRut(formatted);
        if (formatted.length >= 3) {
            setRutError(validateRut(formatted) ? "" : "RUT inválido");
        } else {
            setRutError("");
        }
    };

    const handleTelefonoChange = (value: string) => {
        const digits = value.replace(/[^0-9]/g, "");
        const formatted = `+569${digits.slice(3, 11)}`;
        setTelefono(formatted);
        const rest = formatted.slice(3);
        if (rest.length > 0 && rest.length < 8) {
            setTelefonoError("Deben ser 8 dígitos después del prefijo");
        } else {
            setTelefonoError("");
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateStep1 = () => {
        return rut.trim() !== "" && !rutError && telefono.length === 12 && !telefonoError && edad.trim() !== "" && peso.trim() !== "" && estatura.trim() !== "" && grupoSanguineo.trim() !== "";
    };

    const validateStep2 = () => {
        return enfermedades.trim() !== "" && alergias.trim() !== "" && medicamentos.trim() !== "" && observaciones.trim() !== "";
    };

    const handleSubmit = async () => {
        setError(null);
        setSaving(true);

        const imcValue = calculateIMC(parseFloat(peso), parseFloat(estatura));

        const cleanedRut = rut.replace(/[^0-9kK\-]/g, "").toUpperCase();
        const success = await updateUserProfile(userId, { rut: cleanedRut, telefono: telefono.trim() });
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
            <div className="absolute inset-0 bg-[#001220]/80 backdrop-blur-md" onClick={handleClose} />
            <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white animate-in fade-in zoom-in-95 duration-300">

                {/* Header con gradiente */}
                <div className="relative bg-gradient-to-br from-[#001220] via-[#00305B] to-[#001c37] px-8 py-6 shrink-0">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#F28C28] rounded-full mix-blend-multiply filter blur-3xl opacity-10 -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00A86B] rounded-full mix-blend-multiply filter blur-3xl opacity-10 translate-y-1/2 -translate-x-1/4" />

                    <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#F28C28]/20 border border-[#F28C28]/30 rounded-2xl p-3">
                                <HeartPulse size={24} className="text-[#F28C28]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    Ficha Médica
                                </h2>
                                {planName ? (
                                    <p className="text-white/60 text-sm mt-0.5">
                                        Plan <span className="text-[#F28C28] font-semibold">{planName}</span>
                                    </p>
                                ) : (
                                    <p className="text-white/60 text-sm mt-0.5">
                                        Completa tus datos para continuar
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/60 hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Stepper */}
                    <div className="relative z-10 flex items-center gap-3 mt-6">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 ${step === 1 ? "bg-[#F28C28] text-white shadow-lg shadow-[#F28C28]/30" : step > 1 ? "bg-[#00A86B]/20 text-[#00A86B] border border-[#00A86B]/30" : "bg-white/5 text-white/30 border border-white/10"}`}>
                            <User size={13} />
                            PERSONAL
                        </div>
                        <div className="flex-1 h-px bg-white/10 rounded overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#F28C28] to-[#00A86B] transition-all duration-500 ease-out"
                                style={{ width: step >= 2 ? "100%" : "0%" }}
                            />
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 ${step === 2 ? "bg-[#F28C28] text-white shadow-lg shadow-[#F28C28]/30" : "bg-white/5 text-white/30 border border-white/10"}`}>
                            <Activity size={13} />
                            MÉDICA
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {error && (
                        <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Grupo: Identificación */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <CreditCard size={16} className="text-[#00305B]" />
                                    <h3 className="text-sm font-bold text-[#00305B] uppercase tracking-wider">Identificación</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                                RUT <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={rut}
                                                    onChange={(e) => handleRutChange(e.target.value)}
                                                    placeholder="12345678-9"
                                                    maxLength={12}
                                                    className="w-full px-4 py-3 rounded-xl border-2 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-mono tracking-wider"
                                                    style={{
                                                        borderColor: rutError ? "#ef4444" : rut.length >= 3 && !rutError ? "#22c55e" : "#e2e8f0",
                                                        backgroundColor: rutError ? "#fef2f2" : rut.length >= 3 && !rutError ? "#f0fdf4" : undefined,
                                                    }}
                                                />
                                            </div>
                                            {rutError && (
                                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    {rutError}
                                                </p>
                                            )}
                                        </div>
                                    <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                                Teléfono <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={telefono}
                                                    onChange={(e) => handleTelefonoChange(e.target.value)}
                                                    placeholder="+56912345678"
                                                    className="w-full px-4 py-3 rounded-xl border-2 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all font-mono tracking-wider"
                                                    style={{
                                                        borderColor: telefonoError ? "#ef4444" : telefono.length === 12 ? "#22c55e" : "#e2e8f0",
                                                        backgroundColor: telefonoError ? "#fef2f2" : telefono.length === 12 ? "#f0fdf4" : undefined,
                                                    }}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                    <Phone size={14} />
                                                </div>
                                            </div>
                                            {telefonoError && (
                                                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    {telefonoError}
                                                </p>
                                            )}
                                        </div>
                                </div>
                            </div>

                            {/* Grupo: Datos Físicos */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Activity size={16} className="text-[#00305B]" />
                                    <h3 className="text-sm font-bold text-[#00305B] uppercase tracking-wider">Datos Físicos</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <InputField label="Edad" placeholder="25" value={edad} onChange={(v) => { const n = parseInt(v); if (v === "" || (n >= 0 && n <= 99)) setEdad(v); }} type="number" />
                                    <InputField label="Peso (kg)" placeholder="75.5" value={peso} onChange={setPeso} type="number" icon={<Scale size={14} />} />
                                    <InputField label="Estatura (cm)" placeholder="175" value={estatura} onChange={setEstatura} type="number" icon={<Ruler size={14} />} />
                                </div>

                                {/* IMC Badge */}
                                <div className={`mt-4 overflow-hidden transition-all duration-500 ${imc !== null ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
                                    {imc !== null && imcStatus && (
                                        <div className="bg-gradient-to-r from-[#001220] to-[#00305B] rounded-xl px-5 py-3 flex items-center gap-4">
                                            <div className="text-2xl font-black text-white">{imc}</div>
                                            <div className={`text-sm font-bold ${imcStatus.color.replace("text-", "text-")}`}>
                                                <span className="text-white/40 text-xs font-normal mr-1">IMC ·</span>
                                                {imcStatus.label}
                                            </div>
                                            <div className="ml-auto">
                                                <Droplets size={18} className={imcStatus.color} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Grupo Sanguíneo */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Droplets size={16} className="text-red-500" />
                                    <h3 className="text-sm font-bold text-[#00305B] uppercase tracking-wider">Grupo Sanguíneo</h3>
                                </div>
                                <select
                                    value={grupoSanguineo}
                                    onChange={(e) => setGrupoSanguineo(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#F28C28]/50 focus:bg-white focus:ring-4 focus:ring-[#F28C28]/10 transition-all"
                                >
                                    <option value="">Seleccionar tipo</option>
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
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <HeartPulse size={16} className="text-red-500" />
                                    <h3 className="text-sm font-bold text-[#00305B] uppercase tracking-wider">Historial Médico</h3>
                                </div>
                                <div className="space-y-3">
                                    <InputField label="Enfermedades Crónicas" placeholder="Si no tienes, escribe 'Ninguna'" value={enfermedades} onChange={setEnfermedades} />
                                    <InputField label="Alergias" placeholder="Si no tienes, escribe 'Ninguna'" value={alergias} onChange={setAlergias} />
                                    <InputField label="Medicamentos Habituales" placeholder="Si no tomas, escribe 'Ninguno'" value={medicamentos} onChange={setMedicamentos} icon={<Pill size={14} />} />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText size={16} className="text-[#00305B]" />
                                    <h3 className="text-sm font-bold text-[#00305B] uppercase tracking-wider">Observaciones</h3>
                                </div>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Cualquier información adicional relevante para tu entrenamiento..."
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#F28C28]/50 focus:bg-white focus:ring-4 focus:ring-[#F28C28]/10 transition-all resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-[#00305B] bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all"
                    >
                        {step > 1 ? "← Atrás" : "Cancelar"}
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={() => validateStep1() && setStep(2)}
                            disabled={!validateStep1()}
                            className={`px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${validateStep1()
                                ? "bg-gradient-to-r from-[#F28C28] to-[#e07d1f] text-white shadow-lg shadow-[#F28C28]/30 hover:shadow-xl hover:shadow-[#F28C28]/40 hover:-translate-y-0.5 active:translate-y-0"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                        >
                            Continuar →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!validateStep2() || saving}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${validateStep2() && !saving
                                ? "bg-gradient-to-r from-[#00A86B] to-[#009960] text-white shadow-lg shadow-[#00A86B]/30 hover:shadow-xl hover:shadow-[#00A86B]/40 hover:-translate-y-0.5 active:translate-y-0"
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
                                    <CheckCircle2 size={16} />
                                    Completar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InputField({
    label,
    placeholder,
    value,
    onChange,
    icon,
    type = "text",
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    icon?: React.ReactNode;
    type?: string;
}) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                {label} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    min={type === "number" ? 1 : undefined}
                    max={type === "number" && label === "Edad" ? 120 : undefined}
                    step={type === "number" && label.includes("Peso") ? "0.1" : undefined}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#F28C28]/50 focus:bg-white focus:ring-4 focus:ring-[#F28C28]/10 transition-all"
                />
                {icon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
