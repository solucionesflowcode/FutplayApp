"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TopNavBarUser from "@/components/navbars/TopNavBarUser";
import { useAuthUser } from "@/context";
import {
    getMisClasesInscripciones,
    type ClaseInscripcionRow,
} from "@/data/misclases-calendario";
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

type VisualEstado = "proxima" | "presente" | "ausente" | "neutral";

type SessionItem = {
    inscripcionId: string;
    fecha_hora: string;
    asistencia: string | boolean | null;
    titulo: string;
    descripcion: string | null;
    sede: string;
    claseId: string;
};

function flattenInscripciones(rows: ClaseInscripcionRow[]): SessionItem[] {
    const out: SessionItem[] = [];
    for (const row of rows) {
        if (!row.clase?.fecha_hora) continue;
        out.push({
            inscripcionId: row.id,
            fecha_hora: row.clase.fecha_hora,
            asistencia: row.asistencia,
            titulo: row.clase.titulo,
            descripcion: row.clase.descripcion,
            sede: row.clase.sede?.nombre ?? "",
            claseId: row.clase.id,
        });
    }
    return out;
}

function normalizeAsistencia(
    a: string | boolean | null | undefined,
): "sin_confirmar" | "pendiente" | "presente" | "ausente" {
    if (a === true || a === "presente" || a === "asistio" || a === "confirmado_whatsapp")
        return "presente";
    if (a === false || a === "ausente" || a === "no_asistio" || a === "cancelado" || a === "cancelado_sin_reembolso")
        return "ausente";
    if (a === "pendiente") return "pendiente";
    return "sin_confirmar";
}

function visualEstadoSesion(fechaHora: Date, asistencia: unknown): VisualEstado {
    const a = normalizeAsistencia(asistencia as string | boolean | null);
    const now = Date.now();
    if (a === "ausente") return "ausente";
    if (a === "presente") return "presente";
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

    const load = useCallback(async () => {
        if (!usuario?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const rows = await getMisClasesInscripciones(usuario.id);
        setSessions(flattenInscripciones(rows));
        setLoading(false);
    }, [usuario?.id]);

    useEffect(() => {
        void load();
    }, [load]);

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
                        <button
                            type="button"
                            className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[#00305b] hover:bg-[#e7e8ea] rounded-xl transition-colors border border-transparent hover:border-[#c2c6d1]/60"
                        >
                            <Download className="w-4 h-4" />
                            Descargar reporte
                        </button>
                        <div className="flex items-center gap-3 pl-1 sm:border-l sm:border-[#e1e2e4] sm:pl-6">
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
                        <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_12px_40px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] mb-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 md:mb-8">
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
                                    const hasNeutral = estados.includes("neutral");

                                    let cellTone: "empty" | "presente" | "ausente" | "proxima" | "neutral" =
                                        "empty";
                                    if (daySessions.length) {
                                        if (hasAusente) cellTone = "ausente";
                                        else if (hasPresente && !hasProxima && !hasNeutral)
                                            cellTone = "presente";
                                        else if (hasProxima && !hasAusente) cellTone = "proxima";
                                        else if (hasNeutral || hasPresente) cellTone = "neutral";
                                    }

                                    const baseCell =
                                        "min-h-[4.5rem] sm:min-h-[5.5rem] md:min-h-24 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center relative transition-transform";

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
                                    } else if (cellTone === "proxima") {
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
                                        <div key={key} className={cellClass}>
                                            <span
                                                className={`text-sm sm:text-lg font-bold ${
                                                    cellTone === "presente"
                                                        ? "text-emerald-700"
                                                        : cellTone === "ausente"
                                                          ? "text-[#ba1a1a]"
                                                          : cellTone === "proxima"
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
                                                    {hasAusente && (
                                                        <XCircle
                                                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ba1a1a]"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasPresente && (
                                                        <CheckCircle2
                                                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasProxima && !hasAusente && (
                                                        <Clock
                                                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#fc9910]"
                                                            strokeWidth={2.5}
                                                        />
                                                    )}
                                                    {hasNeutral &&
                                                        !hasProxima &&
                                                        !hasAusente &&
                                                        !hasPresente && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Resumen y métricas — debajo del calendario */}
                        <div className="space-y-6 mb-10">
                            <div className="bg-[#15477a] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-white relative overflow-hidden">
                                <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                                    <ListChecks className="w-40 h-40" strokeWidth={1} />
                                </div>
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                                    <div>
                                        <h3
                                            className="font-[family-name:var(--font-futplay-headline),sans-serif] text-lg font-bold mb-1"
                                        >
                                            Resumen del mes
                                        </h3>
                                        <p className="text-white/70 text-sm max-w-md">
                                            Asistencias confirmadas respecto a sesiones ya registradas
                                            como presente o ausente.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center py-2">
                                        <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0">
                                            <svg
                                                className="w-full h-full -rotate-90"
                                                viewBox="0 0 160 160"
                                                aria-hidden
                                            >
                                                <circle
                                                    cx="80"
                                                    cy="80"
                                                    r="70"
                                                    fill="transparent"
                                                    stroke="currentColor"
                                                    strokeWidth="12"
                                                    className="text-blue-900/40"
                                                />
                                                <circle
                                                    cx="80"
                                                    cy="80"
                                                    r="70"
                                                    fill="transparent"
                                                    stroke="currentColor"
                                                    strokeWidth="12"
                                                    strokeDasharray={ringCirc}
                                                    strokeDashoffset={ringOffset}
                                                    strokeLinecap="round"
                                                    className="text-[#fc9910] transition-all duration-700"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                                    {stats.pct == null ? "—" : `${stats.pct}%`}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase opacity-70">
                                                    Asistencia
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white p-5 md:p-6 rounded-2xl border border-[#edeef0] border-l-4 border-l-[#00305b] flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Clases en el mes
                                        </p>
                                        <p className="text-2xl font-black text-[#00305b]">
                                            {stats.total}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#edeef0] rounded-xl flex items-center justify-center text-[#00305b]">
                                        <ListChecks className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="bg-white p-5 md:p-6 rounded-2xl border border-[#edeef0] border-l-4 border-l-emerald-500 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Asistencias
                                        </p>
                                        <p className="text-2xl font-black text-emerald-600">
                                            {stats.presentes}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="bg-white p-5 md:p-6 rounded-2xl border border-[#edeef0] border-l-4 border-l-[#ba1a1a] flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                            Inasistencias
                                        </p>
                                        <p className="text-2xl font-black text-[#ba1a1a]">
                                            {stats.ausentes}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-[#ba1a1a]" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 md:p-6 rounded-2xl border border-[#edeef0] flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-full bg-[#fc9910] shrink-0 flex items-center justify-center text-white">
                                    <Lightbulb className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#00305b] text-sm mb-1">
                                        Leyenda rápida
                                    </h4>
                                    <p className="text-xs text-[#42474f] leading-relaxed">
                                        <strong className="text-[#fc9910]">Amarillo/naranja</strong>{" "}
                                        indica una clase próxima (aún no ocurre o sin confirmar).
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
                            <div className="bg-white rounded-[1.25rem] md:rounded-[2rem] border border-[#edeef0] overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[520px]">
                                        <thead>
                                            <tr className="border-b border-[#edeef0] bg-[#f8f9fb]/80">
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Fecha
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Entrenamiento
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Estado
                                                </th>
                                                <th className="px-4 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:table-cell">
                                                    Sede
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f3f4f6]">
                                            {recentRows.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={4}
                                                        className="px-8 py-12 text-center text-slate-500 text-sm"
                                                    >
                                                        No hay clases inscritas todavía.
                                                    </td>
                                                </tr>
                                            ) : (
                                                recentRows.map((s) => {
                                                    const d = parseFechaLocal(s.fecha_hora);
                                                    const v = visualEstadoSesion(d, s.asistencia);
                                                    const label =
                                                        v === "presente"
                                                            ? "Presente"
                                                            : v === "ausente"
                                                              ? "Ausente"
                                                              : v === "proxima"
                                                                ? "Próxima"
                                                                : "Sin confirmar";
                                                    return (
                                                        <tr
                                                            key={`${s.inscripcionId}-${s.fecha_hora}`}
                                                            className="hover:bg-[#f8f9fb]/80 transition-colors"
                                                        >
                                                            <td className="px-4 md:px-8 py-4 font-bold text-[#00305b] whitespace-nowrap text-sm">
                                                                {d.toLocaleDateString("es-CL", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                                <span className="block text-[11px] font-semibold text-slate-400 sm:hidden">
                                                                    {s.sede}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4">
                                                                <span className="inline-block bg-[#d3e3ff] text-[#16487b] px-3 py-1 rounded-full text-[10px] font-bold uppercase max-w-[200px] truncate align-middle">
                                                                    {s.titulo}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4">
                                                                {v === "presente" && (
                                                                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                                        {label}
                                                                    </div>
                                                                )}
                                                                {v === "ausente" && (
                                                                    <div className="flex items-center gap-2 text-[#ba1a1a] font-bold text-sm">
                                                                        <XCircle className="w-4 h-4 shrink-0" />
                                                                        {label}
                                                                    </div>
                                                                )}
                                                                {v === "proxima" && (
                                                                    <div className="flex items-center gap-2 text-[#8a5100] font-bold text-sm">
                                                                        <Clock className="w-4 h-4 shrink-0" />
                                                                        {label}
                                                                    </div>
                                                                )}
                                                                {v === "neutral" && (
                                                                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                                                                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                                                                        {label}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 md:px-8 py-4 text-sm text-[#42474f] hidden sm:table-cell">
                                                                {s.sede || "—"}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
