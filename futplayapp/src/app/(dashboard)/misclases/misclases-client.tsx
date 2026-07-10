"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TopNavBarUser from "@/components/navbars/TopNavBarUser";
import { useAuthUser } from "@/context";
import {
    getAllClasesConInscripcion,
    type ClaseConInscripcion,
} from "@/data/misclases-calendario";
import { getMembresiaByUser } from "@/data/membresia";
import ReservarClaseModal from "@/components/misclases/ReservarClaseModal";
import CancelarClaseModal from "@/components/misclases/CancelarClaseModal";
import { cancelarClase } from "@/data/clase_usuario";
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Lightbulb,
    ListChecks,
    XCircle,
} from "lucide-react";

type VisualEstado = "proxima" | "presente" | "ausente" | "cancelada" | "neutral";

type SessionItem = {
    inscripcionId: string | null;
    fecha_hora: string;
    asistencia: string | boolean | null;
    titulo: string;
    descripcion: string | null;
    sede: string;
    claseId: string;
    tipo_evento: "entrenamiento" | "partido";
};

function flattenClases(rows: ClaseConInscripcion[]): SessionItem[] {
    const out: SessionItem[] = [];
    for (const row of rows) {
        if (!row.fecha_hora) continue;
        out.push({
            inscripcionId: row.inscripcionId,
            fecha_hora: row.fecha_hora,
            asistencia: row.asistencia,
            titulo: row.titulo,
            descripcion: row.descripcion,
            sede: row.sede?.nombre ?? "",
            claseId: row.id,
            tipo_evento: row.tipo_evento,
        });
    }
    return out;
}

function normalizeAsistencia(
    a: string | boolean | null | undefined,
): "sin_confirmar" | "pendiente" | "presente" | "ausente" | "cancelada" {
    if (a === true || a === "presente" || a === "asistio" || a === "confirmado_whatsapp")
        return "presente";
    if (a === false || a === "ausente" || a === "no_asistio")
        return "ausente";
    if (a === "cancelado" || a === "cancelado_sin_reembolso")
        return "cancelada";
    if (a === "pendiente") return "pendiente";
    return "sin_confirmar";
}

function visualEstadoSesion(fechaHora: Date, asistencia: unknown): VisualEstado {
    const a = normalizeAsistencia(asistencia as string | boolean | null);
    const now = Date.now();
    if (a === "ausente") return "ausente";
    if (a === "presente") return "presente";
    if (a === "cancelada") return "cancelada";
    if (fechaHora.getTime() > now) return "proxima";
    return "neutral";
}

function dateKeyLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseFechaLocal(iso: string): Date {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}

function startOfCalendarGrid(view: Date): Date {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const dow = first.getDay();
    const mondayOffset = (dow + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    return start;
}

function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function isSameLocalDate(a: Date, b: Date): boolean {
    return dateKeyLocal(a) === dateKeyLocal(b);
}

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function MisClasesClient() {
    const { usuario, user } = useAuthUser();
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMonth, setViewMonth] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const [tokensRestantes, setTokensRestantes] = useState<number | null>(null);
    const [selectedClases, setSelectedClases] = useState<{
        claseId: string;
        titulo: string;
        descripcion: string | null;
        fecha_hora: string;
        sede: string;
    }[] | null>(null);

    const [cancelandoId, setCancelandoId] = useState<string | null>(null);
    const [cancelMsg, setCancelMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [cancelTarget, setCancelTarget] = useState<SessionItem | null>(null);

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const load = useCallback(async () => {
        if (!usuario?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const [rows, membresia] = await Promise.all([
            getAllClasesConInscripcion(usuario.id),
            getMembresiaByUser(usuario.id),
        ]);
        setSessions(flattenClases(rows));
        setTokensRestantes(membresia?.tokens_restantes ?? null);
        setLoading(false);
    }, [usuario?.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleCancel = useCallback(async (inscripcionId: string, fechaHora: string) => {
        setCancelandoId(inscripcionId);
        setCancelMsg(null);

        const result = await cancelarClase(inscripcionId, usuario!.id, fechaHora);

        if (result.success) {
            setSessions((prev) =>
                prev.map((s) =>
                    s.inscripcionId === inscripcionId
                        ? { ...s, asistencia: "cancelado" }
                        : s
                )
            );
            const m = await getMembresiaByUser(usuario!.id);
            if (m) setTokensRestantes(m.tokens_restantes);
        }

        setCancelMsg({ type: result.success ? "success" : "error", text: result.message });
        setCancelandoId(null);
        setCancelTarget(null);
    }, [usuario]);

    const sessionsByDay = useMemo(() => {
        const map = new Map<string, SessionItem[]>();
        for (const s of sessions) {
            const d = parseFechaLocal(s.fecha_hora);
            const k = dateKeyLocal(d);
            const arr = map.get(k) ?? [];
            arr.push(s);
            map.set(k, arr);
        }
        for (const [, arr] of map) {
            arr.sort(
                (a, b) =>
                    parseFechaLocal(a.fecha_hora).getTime() -
                    parseFechaLocal(b.fecha_hora).getTime(),
            );
        }
        return map;
    }, [sessions]);

    const monthBounds = useMemo(() => {
        const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
        const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0, 23, 59, 59);
        return { start, end };
    }, [viewMonth]);

    const sessionsInViewMonth = useMemo(() => {
        return sessions.filter((s) => {
            const d = parseFechaLocal(s.fecha_hora);
            return d >= monthBounds.start && d <= monthBounds.end;
        });
    }, [sessions, monthBounds]);

    const stats = useMemo(() => {
        let presentes = 0;
        let ausentes = 0;
        let proximas = 0;
        for (const s of sessionsInViewMonth) {
            const d = parseFechaLocal(s.fecha_hora);
            const v = visualEstadoSesion(d, s.asistencia);
            if (v === "presente") presentes++;
            else if (v === "ausente") ausentes++;
            else if (v === "proxima") proximas++;
        }
        const total = sessionsInViewMonth.length;
        const decided = presentes + ausentes;
        const pct = decided > 0 ? Math.round((presentes / decided) * 100) : null;
        return { presentes, ausentes, proximas, total, pct };
    }, [sessionsInViewMonth]);

    const recentRows = useMemo(() => {
        return [...sessions]
            .filter((s) => s.inscripcionId !== null)
            .sort(
                (a, b) =>
                    parseFechaLocal(b.fecha_hora).getTime() -
                    parseFechaLocal(a.fecha_hora).getTime(),
            )
            .slice(0, 12);
    }, [sessions]);

    const gridStart = useMemo(() => startOfCalendarGrid(viewMonth), [viewMonth]);
    const gridCells = useMemo(() => {
        const cells: Date[] = [];
        let cur = new Date(gridStart);
        for (let i = 0; i < 42; i++) {
            cells.push(new Date(cur));
            cur = addDays(cur, 1);
        }
        return cells;
    }, [gridStart]);

    const today = new Date();
    const monthTitle = viewMonth.toLocaleString("es-CL", {
        month: "long",
        year: "numeric",
    });

    const avatarUrl =
        (user?.user_metadata?.avatar_url as string | undefined) ??
        (user?.user_metadata?.picture as string | undefined);
    const firstName = usuario?.nombre?.split(" ")[0] ?? "Atleta";

    const ringCirc = 2 * Math.PI * 70;
    const ringOffset =
        stats.pct == null ? ringCirc : ringCirc * (1 - stats.pct / 100);

    return (
        <div className="min-h-full bg-[#f8f9fb] pb-12">
            <TopNavBarUser />

            <div className="px-4 md:px-8 lg:px-10 pt-6 md:pt-8 max-w-6xl mx-auto w-full">
                {/* Barra contextual estilo mockup (complementa TopNavBarUser en móvil/desktop) */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <div className="w-12 h-1 bg-[#fc9910] rounded-full mb-3" />
                        <h1
                            className="font-[family-name:var(--font-futplay-headline),sans-serif] text-2xl md:text-4xl font-extrabold tracking-tight text-[#00305b]"
                        >
                            Mis clases y asistencia
                        </h1>
                        <p className="text-[#42474f] mt-1.5 text-sm md:text-base font-medium">
                            Calendario de sesiones y registro de asistencia del mes.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div className="flex items-center gap-3 pl-1 sm:pl-6">
                            <div className="text-right hidden sm:block min-w-0">
                                <p className="text-xs font-bold text-[#00305b] truncate max-w-[140px]">
                                    {usuario?.nombre ?? firstName}
                                </p>
                                <p className="text-[10px] text-slate-400 capitalize">
                                    {usuario?.rol ?? "jugador"}
                                </p>
                            </div>
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatarUrl}
                                    alt=""
                                    className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full border-2 border-white shadow-md bg-[#15477a] text-white text-sm font-bold flex items-center justify-center">
                                    {firstName.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <p className="text-center text-[#42474f] py-20">Cargando calendario…</p>
                ) : (
                    <>
                        {/* Calendario — ancho completo */}
                        <div className="bg-white p-5 md:p-8 shadow-[0_12px_40px_-4px_rgba(25,28,30,0.06)] ring-1 ring-inset ring-black/[0.03] border border-[#edeef0] mb-8 border-t-2 border-t-[#00305B]">
                            <div className="grid grid-cols-1 lg:grid-cols-3 items-center mb-6 md:mb-8 gap-4">
                                <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                                    <h2
                                        className="font-[family-name:var(--font-futplay-headline),sans-serif] text-lg md:text-xl font-bold text-[#00305b] capitalize"
                                    >
                                        {monthTitle}
                                    </h2>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            aria-label="Mes anterior"
                                            className="p-1.5 hover:bg-[#f3f4f6] rounded-lg text-slate-400 transition-colors"
                                            onClick={() =>
                                                setViewMonth(
                                                    new Date(
                                                        viewMonth.getFullYear(),
                                                        viewMonth.getMonth() - 1,
                                                        1,
                                                    ),
                                                )
                                            }
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Mes siguiente"
                                            className="p-1.5 hover:bg-[#f3f4f6] rounded-lg text-slate-400 transition-colors"
                                            onClick={() =>
                                                setViewMonth(
                                                    new Date(
                                                        viewMonth.getFullYear(),
                                                        viewMonth.getMonth() + 1,
                                                        1,
                                                    ),
                                                )
                                            }
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            className="ml-1 text-xs font-bold text-[#15477a] px-2 py-1 rounded-lg hover:bg-[#d3e3ff]/50"
                                            onClick={() => {
                                                const n = new Date();
                                                setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1));
                                            }}
                                        >
                                            Hoy
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <div className="bg-white px-3 py-1.5 border-t-2 border-t-[#F39200] shadow-sm flex items-center gap-2">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-tight">
                                                Tokens restantes
                                            </p>
                                            <p className="text-base font-black text-[#F39200] leading-none">
                                                {tokensRestantes ?? "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4 md:gap-5 items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Asistido
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-[#fc9910] shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Próxima
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-[#ba1a1a] shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Falta
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">🏋️</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Entrenamiento
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">⚽</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Partido
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3">
                                {DOW.map((d) => (
                                    <div
                                        key={d}
                                        className="text-center pb-2 sm:pb-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]"
                                    >
                                        {d}
                                    </div>
                                ))}
                                {gridCells.map((cellDate) => {
                                    const inMonth =
                                        cellDate.getMonth() === viewMonth.getMonth();
                                    const key = dateKeyLocal(cellDate);
                                    const daySessions = sessionsByDay.get(key) ?? [];
                                    const isToday = isSameLocalDate(cellDate, today);

                                    const estados = daySessions.map((s) =>
                                        visualEstadoSesion(
                                            parseFechaLocal(s.fecha_hora),
                                            s.asistencia,
                                        ),
                                    );
                                    const hasAusente = estados.includes("ausente");
                                    const hasPresente = estados.includes("presente");
                                    const hasProxima = estados.includes("proxima");
                                    const hasCancelada = estados.includes("cancelada");
                                    const hasPartido = daySessions.some((s) => s.tipo_evento === "partido");
                                    const hasEntrenamiento = daySessions.some((s) => s.tipo_evento === "entrenamiento");
                                    const hasNeutral = estados.includes("neutral");

                                    const unenrolledProximas = daySessions.filter(
                                        (s) =>
                                            (s.inscripcionId === null || normalizeAsistencia(s.asistencia as string | boolean | null) === "cancelada") &&
                                            parseFechaLocal(s.fecha_hora).getTime() > Date.now(),
                                    );

                                    let cellTone: "empty" | "presente" | "ausente" | "proxima" | "cancelada" | "neutral" =
                                        "empty";
                                    if (daySessions.length) {
                                        if (hasAusente) cellTone = "ausente";
                                        else if (hasPresente && !hasProxima && !hasNeutral && !hasCancelada)
                                            cellTone = "presente";
                                        else if (hasProxima && !hasAusente) cellTone = "proxima";
                                        else if (hasCancelada && !hasProxima && !hasPresente) cellTone = "cancelada";
                                        else if (hasNeutral || hasPresente) cellTone = "neutral";
                                    }

                                    const isClickable = unenrolledProximas.length > 0;
                                    const baseCell =
                                        `min-h-[4.5rem] sm:min-h-[5.5rem] md:min-h-24 rounded flex flex-col items-center justify-center relative transition-transform ${isClickable ? "cursor-pointer hover:scale-[1.02]" : ""}`;

                                    let cellClass = `${baseCell} `;
                                    if (!inMonth) {
                                        cellClass += "opacity-25 ";
                                    }
                                    if (daySessions.length === 0) {
                                        cellClass += inMonth
                                            ? "bg-[#f3f4f6] "
                                            : "bg-transparent ";
                                    } else if (cellTone === "presente") {
                                        cellClass +=
                                            "bg-emerald-500/10 border-2 border-emerald-500/25 ";
                                    } else if (cellTone === "ausente") {
                                        cellClass +=
                                            "bg-[#ba1a1a]/10 border-2 border-[#ba1a1a]/25 ";
                                    } else if (cellTone === "proxima" || cellTone === "cancelada") {
                                        cellClass +=
                                            "bg-[#fc9910]/15 border-2 border-[#fc9910]/35 shadow-sm shadow-orange-500/10 ";
                                    } else {
                                        cellClass +=
                                            "bg-white border-2 border-[#e1e2e4] ";
                                    }

                                    if (isToday) {
                                        cellClass += " ring-2 ring-[#15477a] ring-offset-2 ring-offset-[#f8f9fb] z-10 ";
                                    }

                                    return (
                                        <div
                                            key={key}
                                            className={cellClass}
                                            onClick={
                                                isClickable
                                                    ? () =>
                                                        setSelectedClases(
                                                            unenrolledProximas.map((s) => ({
                                                                claseId: s.claseId,
                                                                titulo: s.titulo,
                                                                descripcion: s.descripcion,
                                                                fecha_hora: s.fecha_hora,
                                                                sede: s.sede,
                                                                tipo_evento: s.tipo_evento,
                                                            })),
                                                        )
                                                    : undefined
                                            }
                                        >
                                            <span
                                                className={`text-sm sm:text-lg font-bold ${
                                                    cellTone === "presente"
                                                        ? "text-emerald-700"
                                                        : cellTone === "ausente"
                                                          ? "text-[#ba1a1a]"
                                                          : cellTone === "proxima" || cellTone === "cancelada"
                                                            ? "text-[#8a5100]"
                                                            : inMonth
                                                              ? "text-[#00305b]"
                                                              : "text-slate-400"
                                                }`}
                                            >
                                                {cellDate.getDate()}
                                            </span>
                                            {isToday && (
                                                <span className="text-[7px] sm:text-[8px] font-black uppercase text-[#15477a] tracking-widest mt-0.5">
                                                    Hoy
                                                </span>
                                            )}
                                            {daySessions.length > 0 && (
                                                <div className="flex items-center gap-0.5 mt-1">
                                                    {hasEntrenamiento && (
                                                        <span className="text-[9px] sm:text-xs">🏋️</span>
                                                    )}
                                                    {hasPartido && (
                                                        <span className="text-[9px] sm:text-xs ml-0.5">⚽</span>
                                                    )}
                                                    {hasAusente && (
                                                        <XCircle
                                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#ba1a1a]"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasPresente && (
                                                        <CheckCircle2
                                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasProxima && !hasAusente && (
                                                        <Clock
                                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#fc9910]"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasCancelada && !hasAusente && !hasProxima && (
                                                        <Clock
                                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#fc9910]"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasNeutral &&
                                                        !hasProxima &&
                                                        !hasAusente &&
                                                        !hasPresente && (
                                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <ReservarClaseModal
                            isOpen={selectedClases !== null}
                            onClose={() => setSelectedClases(null)}
                            clases={selectedClases ?? []}
                            onAgendada={async (_claseId, _inscripcionId) => {
                                if (!usuario?.id) return;
                                const [rows, membresia] = await Promise.all([
                                    getAllClasesConInscripcion(usuario.id),
                                    getMembresiaByUser(usuario.id),
                                ]);
                                setSessions(flattenClases(rows));
                                setTokensRestantes(membresia?.tokens_restantes ?? null);
                            }}
                        />

                        <CancelarClaseModal
                            isOpen={cancelTarget !== null}
                            onClose={() => setCancelTarget(null)}
                            onConfirm={async () => {
                                if (!cancelTarget?.inscripcionId) return;
                                await handleCancel(
                                    cancelTarget.inscripcionId,
                                    cancelTarget.fecha_hora,
                                );
                            }}
                            loading={cancelandoId !== null}
                            titulo={cancelTarget?.titulo ?? ""}
                            fecha_hora={cancelTarget?.fecha_hora ?? ""}
                            sede={cancelTarget?.sede ?? ""}
                        />

                        {/* Resumen y métricas — debajo del calendario */}
                        <div className="space-y-6 mb-10">

                            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                                <div className="bg-white border border-[#edeef0] shadow-sm ring-1 ring-inset ring-black/[0.03] border-t-4 border-t-[#00305B] aspect-square rounded-full flex flex-col items-center justify-center text-center p-3">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 leading-tight">
                                        Clases en el mes
                                    </span>
                                    <p className="text-sm font-black text-[#00305B] leading-tight mt-0.5">{stats.total}</p>
                                </div>
                                <div className="bg-white border border-[#edeef0] shadow-sm ring-1 ring-inset ring-black/[0.03] border-t-4 border-t-[#00A86B] aspect-square rounded-full flex flex-col items-center justify-center text-center p-3">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 leading-tight">
                                        Asistencias
                                    </span>
                                    <p className="text-sm font-black text-[#00305B] leading-tight mt-0.5">{stats.presentes}</p>
                                </div>
                                <div className="bg-white border border-[#edeef0] shadow-sm ring-1 ring-inset ring-black/[0.03] border-t-4 border-t-[#ba1a1a] aspect-square rounded-full flex flex-col items-center justify-center text-center p-3">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 leading-tight">
                                        Inasistencias
                                    </span>
                                    <p className="text-sm font-black text-[#00305B] leading-tight mt-0.5">{stats.ausentes}</p>
                                </div>
                            </div>

                            <div className="bg-white p-5 md:p-6 border border-[#edeef0] flex gap-4 items-start border-t-2 border-t-[#00305B]">
                                <div className="w-10 h-10 rounded-full bg-[#fc9910] shrink-0 flex items-center justify-center text-white">
                                    <Lightbulb className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#00305b] text-sm mb-1">
                                        Leyenda rápida
                                    </h4>
                                    <p className="text-xs text-[#42474f] leading-relaxed">
                                        <strong className="text-[#fc9910]">Amarillo/naranja</strong>{" "}
                                        indica una clase disponible (aún no ocurre o cancelada).
                                        <strong className="text-emerald-600"> Verde</strong> es
                                        asistencia confirmada.
                                        <strong className="text-[#ba1a1a]"> Rojo</strong> marca
                                        inasistencia registrada.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabla reciente */}
                        <section>
                            <h3
                                className="font-[family-name:var(--font-futplay-headline),sans-serif] text-xl md:text-2xl font-extrabold text-[#00305b] mb-4 md:mb-6"
                            >
                                Detalle de sesiones
                            </h3>


                            {cancelMsg && (
                                <div
                                    className={`mb-4 px-5 py-3 rounded text-sm font-bold ${cancelMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-[#ba1a1a] border border-red-200"}`}
                                >
                                    {cancelMsg.text}
                                </div>
                            )}
                            <div className="bg-white border border-[#edeef0] overflow-hidden shadow-sm ring-1 ring-inset ring-black/[0.03] border-t-2 border-t-[#00305B]">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[520px]">
                                        <thead>
                                            <tr className="border-b border-[#edeef0] bg-[#f8f9fb]/80">
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Fecha
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Evento
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Estado
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">
                                                    Sede
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Acción
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f3f4f6]">
                                            {recentRows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-8 py-12 text-center text-slate-500 text-sm"
                                                    >
                                                        No hay clases disponibles todavía.
                                                    </td>
                                                </tr>
                                            ) : (
                                                recentRows.map((s) => {
                                                    const d = parseFechaLocal(s.fecha_hora);
                                                    const raw = s.asistencia as string | null | undefined;
                                                    let label: string;
                                                    let icon: React.ReactNode;
                                                    let color: string;
                                                    if (!raw || raw === "sin_confirmar") {
                                                        label = "Sin confirmar";
                                                        icon = <Clock className="w-4 h-4 shrink-0" />;
                                                        color = "text-[#8a5100]";
                                                    } else if (raw === "pendiente") {
                                                        label = "Pendiente";
                                                        icon = <Clock className="w-4 h-4 shrink-0" />;
                                                        color = "text-[#8a5100]";
                                                    } else if (raw === "confirmado_whatsapp") {
                                                        label = "Confirmado";
                                                        icon = <CheckCircle2 className="w-4 h-4 shrink-0" />;
                                                        color = "text-emerald-600";
                                                    } else if (raw === "asistio") {
                                                        label = "Presente";
                                                        icon = <CheckCircle2 className="w-4 h-4 shrink-0" />;
                                                        color = "text-emerald-600";
                                                    } else if (raw === "no_asistio") {
                                                        label = "Ausente";
                                                        icon = <XCircle className="w-4 h-4 shrink-0" />;
                                                        color = "text-[#ba1a1a]";
                                                    } else if (raw === "cancelado") {
                                                        label = "Cancelada";
                                                        icon = <XCircle className="w-4 h-4 shrink-0" />;
                                                        color = "text-slate-500";
                                                    } else if (raw === "cancelado_sin_reembolso") {
                                                        label = "Cancelada s/reemb.";
                                                        icon = <XCircle className="w-4 h-4 shrink-0" />;
                                                        color = "text-slate-500";
                                                    } else {
                                                        label = "Sin confirmar";
                                                        icon = <Clock className="w-4 h-4 shrink-0" />;
                                                        color = "text-[#8a5100]";
                                                    }
                                                    return (
                                                        <tr
                                                            key={`${s.inscripcionId ?? s.claseId}-${s.fecha_hora}`}
                                                            className="hover:bg-[#f8f9fb]/80 transition-colors"
                                                        >
                                                            <td className="px-4 md:px-8 py-4 font-bold text-[#00305b] whitespace-nowrap text-sm">
                                                                {d.toLocaleDateString("es-CL", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                                    {d.toLocaleTimeString("es-CL", {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </span>
                                                                <span className="block text-[11px] font-semibold text-slate-400 sm:hidden">
                                                                    {s.sede}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4">
                                                            <span className="inline-block bg-[#d3e3ff] text-[#16487b] px-3 py-1 rounded-full text-[10px] font-bold uppercase max-w-[200px] truncate align-middle">
                                                                    {s.tipo_evento === "partido" ? "⚽ Partido" : "🏋️ Entrenamiento"}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4">
                                                                <div className={`flex items-center gap-2 font-bold text-sm ${color}`}>
                                                                    {icon}
                                                                    {label}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4 text-sm text-[#42474f] hidden sm:table-cell">
                                                                {s.sede || "—"}
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4">
                                                            {s.inscripcionId !== null &&
                                                                new Date(s.fecha_hora) > new Date() &&
                                                                (raw === "sin_confirmar" || raw === "pendiente" || raw === "confirmado_whatsapp") && (
                                                                        <button
                                                                            onClick={() =>
                                                                                setCancelTarget(s)
                                                                            }
                                                                            disabled={
                                                                                cancelandoId === s.inscripcionId
                                                                            }
                                                                            className="text-xs font-bold text-[#ba1a1a] hover:text-red-700 underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                                                                        >
                                                                            {cancelandoId === s.inscripcionId
                                                                                ? "Cancelando..."
                                                                                : "Cancelar"}
                                                                        </button>
                                                                    )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Leyenda de Estados de Asistencia */}
                            <div className="bg-white border border-[#edeef0] rounded-[1rem] p-5 mt-6 shadow-[0_4px_20px_-2px_rgba(25,28,30,0.04)]">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                                    Leyenda de estados de asistencia
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Estado: Sin confirmar / Pendiente */}
                                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#8a5100] bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-lg shrink-0">
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                            <span>Sin confirmar / Pendiente</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Clase reservada en el calendario. Aún no se ha confirmado asistencia por WhatsApp o plataforma.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estado: Confirmado */}
                                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-lg shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            <span>Confirmado</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                El alumno confirmó que asistirá al entrenamiento a través del bot de WhatsApp o manualmente.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estado: Presente */}
                                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-1 rounded-lg shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                            <span>Presente</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                El profesor ha registrado formalmente que el alumno estuvo presente en la sesión de entrenamiento.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estado: Ausente */}
                                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#ba1a1a] bg-red-50 border border-red-200/50 px-2.5 py-1 rounded-lg shrink-0">
                                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>Ausente</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                El alumno no se presentó al entrenamiento y tampoco canceló la sesión a tiempo.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estado: Cancelada */}
                                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>Cancelada</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Clase cancelada con más de 3 horas de anticipación. El cupo se liberó y se devolvió el token.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estado: Cancelada s/reemb */}
                                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>Cancelada s/reemb.</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Clase cancelada tarde (menos de 3 horas antes del inicio). No se devuelve el token de la membresía.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
