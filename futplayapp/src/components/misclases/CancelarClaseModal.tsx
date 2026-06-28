"use client";

import { AlertCircle, Clock, Loader2, MapPin, Trash2, X } from "lucide-react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    loading: boolean;
    titulo: string;
    fecha_hora: string;
    sede: string;
};

function horasHasta(fechaHora: string): number {
    return (new Date(fechaHora).getTime() - Date.now()) / (1000 * 60 * 60);
}

export default function CancelarClaseModal({
    isOpen,
    onClose,
    onConfirm,
    loading,
    titulo,
    fecha_hora,
    sede,
}: Props) {
    if (!isOpen) return null;

    const date = new Date(fecha_hora);
    const formattedDate = date.toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
    const formattedTime = date.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const horas = horasHasta(fecha_hora);
    const devuelveToken = horas >= 3;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#edeef0]">
                    <h2 className="text-lg font-bold text-[#00305b]">
                        Cancelar clase
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1.5 hover:bg-[#f3f4f6] rounded-lg text-slate-400 transition-colors disabled:opacity-40"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-[#f8f9fb] rounded-xl p-4 space-y-3">
                        <div>
                            <h3 className="font-bold text-[#00305b] text-base">
                                {titulo}
                            </h3>
                        </div>

                        <div className="space-y-1.5 text-sm text-[#42474f]">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#fc9910] shrink-0" />
                                <span className="capitalize">
                                    {formattedDate} — {formattedTime}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-[#fc9910] shrink-0" />
                                <span>{sede || "Sin sede"}</span>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
                            devuelveToken
                                ? "bg-amber-50 border border-amber-200"
                                : "bg-red-50 border border-red-200"
                        }`}
                    >
                        <AlertCircle
                            className={`w-5 h-5 shrink-0 mt-0.5 ${
                                devuelveToken ? "text-amber-600" : "text-[#ba1a1a]"
                            }`}
                        />
                        <div>
                            <p
                                className={`font-bold ${
                                    devuelveToken
                                        ? "text-amber-800"
                                        : "text-[#ba1a1a]"
                                }`}
                            >
                                {devuelveToken
                                    ? "Se devolverá el token"
                                    : "No se devolverá el token"}
                            </p>
                            <p
                                className={
                                    devuelveToken
                                        ? "text-amber-700"
                                        : "text-red-700"
                                }
                            >
                                {devuelveToken
                                    ? "Faltan 3 horas o más para la clase. Al cancelar, recuperarás tu token."
                                    : "Faltan menos de 3 horas para la clase. Al cancelar, no se devolverá el token."}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl border border-[#e1e2e4] text-[#42474f] font-bold text-sm hover:bg-[#f3f4f6] transition-colors disabled:opacity-50"
                        >
                            Volver
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl bg-[#ba1a1a] text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cancelando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Cancelar clase
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
