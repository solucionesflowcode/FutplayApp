"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Loader2,
    MapPin,
    MessageCircle,
    Ticket,
    X,
} from "lucide-react";
import { getMembresiaByUser, type MembresiaConPlan } from "@/data/membresia";
import { useAuthUser } from "@/context";

type ClaseInfo = {
    claseId: string;
    titulo: string;
    descripcion: string | null;
    fecha_hora: string;
    sede: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    clases: ClaseInfo[];
    onAgendada: (claseId: string) => void;
};

export default function ReservarClaseModal({ isOpen, onClose, clases, onAgendada }: Props) {
    const { usuario } = useAuthUser();
    const [membresia, setMembresia] = useState<MembresiaConPlan | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (!isOpen || !usuario?.id) return;
        setMembresia(null);
        setSuccessId(null);
        setErrorMsg("");
        setShowSuccessModal(false);
        getMembresiaByUser(usuario.id).then(setMembresia);
    }, [isOpen, usuario?.id]);

    const handleAgendar = useCallback(async (claseId: string) => {
        setLoadingId(claseId);
        setErrorMsg("");
        try {
            const res = await fetch("/api/clases/inscribir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ claseId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || "Error al agendar la clase");
                return;
            }
            setSuccessId(claseId);
            setShowSuccessModal(true);
            onAgendada(claseId);

            const updated = await getMembresiaByUser(usuario!.id);
            if (updated) setMembresia(updated);
        } catch {
            setErrorMsg("Error de conexión");
        } finally {
            setLoadingId(null);
        }
    }, [usuario, onAgendada]);

    if (!isOpen) return null;

    const tokensRestantes = membresia?.tokens_restantes ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="flex items-center justify-between p-5 border-b border-[#edeef0]">
                    <h2 className="text-lg font-bold text-[#00305b]">Reservar clase</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-[#f3f4f6] rounded-lg text-slate-400 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {clases.map((clase) => {
                        const date = new Date(clase.fecha_hora);
                        const formattedDate = date.toLocaleDateString("es-CL", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        });
                        const formattedTime = date.toLocaleTimeString("es-CL", {
                            hour: "2-digit",
                            minute: "2-digit",
                        });
                        const isSuccess = successId === clase.claseId;
                        const isLoading = loadingId === clase.claseId;
                        const puedeAgendar = tokensRestantes > 0 && !isSuccess;

                        return (
                            <div
                                key={clase.claseId}
                                className="bg-[#f8f9fb] rounded-xl p-4 space-y-3"
                            >
                                <div>
                                    <h3 className="font-bold text-[#00305b] text-base">{clase.titulo}</h3>
                                    {clase.descripcion && (
                                        <p className="text-sm text-[#42474f] mt-1">{clase.descripcion}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5 text-sm text-[#42474f]">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-[#fc9910] shrink-0" />
                                        <span className="capitalize">{formattedDate} — {formattedTime}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-[#fc9910] shrink-0" />
                                        <span>{clase.sede || "Sin sede"}</span>
                                    </div>
                                </div>

                                {isSuccess ? (
                                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3 text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        ¡Agendada!
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleAgendar(clase.claseId)}
                                        disabled={!puedeAgendar || isLoading}
                                        className="w-full px-4 py-3 rounded-xl bg-[#fc9910] text-white font-bold text-sm hover:bg-[#e08900] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Agendando...
                                            </>
                                        ) : (
                                            <>
                                                <Ticket className="w-4 h-4" />
                                                Agendar clase
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    <div className="bg-white border border-[#edeef0] rounded-xl p-4 flex items-center gap-3">
                        <Ticket className="w-5 h-5 text-[#15477a]" />
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Tus tokens disponibles</p>
                            <p className="text-lg font-bold text-[#00305b]">{tokensRestantes}</p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="flex items-center gap-2 text-[#ba1a1a] bg-[#ba1a1a]/5 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 rounded-xl border border-[#e1e2e4] text-[#42474f] font-bold text-sm hover:bg-[#f3f4f6] transition-colors"
                    >
                        Cerrar
                    </button>
                </div>

                {showSuccessModal && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                        <div className="bg-emerald-100 p-4 rounded-full mb-4">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xl font-black text-[#00305b] mb-2">
                            Clase agendada con éxito
                        </h3>
                        <p className="text-sm text-[#42474f] max-w-xs mb-6">
                            Recibirás un mensaje de <strong className="text-[#25D366]">WhatsApp</strong>{" "}
                            24 horas antes de la clase para confirmar tu asistencia.
                        </p>
                        <div className="flex items-center gap-3 bg-[#f0fdf4] border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 mb-6">
                            <MessageCircle className="w-5 h-5 shrink-0 text-[#25D366]" />
                            <span className="text-left text-xs">
                                Agrega el número de contacto a tu agenda para recibir la notificación.
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 rounded-xl bg-[#15477a] text-white font-bold text-sm hover:bg-[#0f3560] transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
