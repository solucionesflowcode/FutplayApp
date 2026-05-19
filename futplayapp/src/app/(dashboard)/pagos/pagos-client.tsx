"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    ArrowUpRight,
    Ban,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    Crown,
    Download,
    ExternalLink,
    Landmark,
    Loader2,
    Lock,
    Shield,
    ShieldCheck,
    Smartphone,
    Building2,
    AlertCircle,
    Receipt,
    RotateCcw,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Zap,
    X,
    Calendar,
    Clock,
    CreditCard as CreditCardIcon,
    MoreHorizontal,
    Wallet,
    Search,
    Filter,
    ChevronDown,
    Eye,
    FileText,
    RefreshCw,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import TopNavBarUser from "../../../components/navbars/TopNavBarUser";
import { getPlanes, type Plan } from "@/data/plans";
import { useAuthUser } from "@/context";

// ─── Types ────────────────────────────────────────────────────────────

type CheckoutState = "idle" | "processing" | "success" | "error";

type PaymentRecord = {
    id: string;
    fecha: string;
    descripcion: string;
    monto: number;
    estado: "aprobado" | "rechazado" | "pendiente" | "anulado";
    metodo: "tarjeta" | "transferencia" | "wallet";
    factura_url?: string;
};

type ActiveSubscription = {
    plan: string;
    planId: string;
    estado: "activa" | "vencida" | "pendiente";
    fecha_inicio: string;
    fecha_vencimiento: string;
    tokens_totales: number;
    tokens_usados: number;
    precio: number;
    renovacion_automatica: boolean;
    metodo_pago: string;
    metodo_pago_icon: string;
};

// ─── Mock Data ────────────────────────────────────────────────────────

const MOCK_SUSCRIPCION: ActiveSubscription = {
    plan: "Plan Pro",
    planId: "pro",
    estado: "activa",
    fecha_inicio: "2026-04-01",
    fecha_vencimiento: "2026-05-31",
    tokens_totales: 12,
    tokens_usados: 5,
    precio: 24990,
    renovacion_automatica: true,
    metodo_pago: "•••• 4242",
    metodo_pago_icon: "visa",
};

const MOCK_HISTORIAL: PaymentRecord[] = [
    {
        id: "FAC-2026-005",
        fecha: "2026-05-01T10:30:00",
        descripcion: "Plan Pro · Mayo 2026",
        monto: 24990,
        estado: "aprobado",
        metodo: "tarjeta",
        factura_url: "#",
    },
    {
        id: "FAC-2026-004",
        fecha: "2026-04-15T14:22:00",
        descripcion: "Token extra × 2",
        monto: 9980,
        estado: "aprobado",
        metodo: "tarjeta",
        factura_url: "#",
    },
    {
        id: "FAC-2026-003",
        fecha: "2026-04-01T09:15:00",
        descripcion: "Plan Pro · Abril 2026",
        monto: 24990,
        estado: "aprobado",
        metodo: "tarjeta",
        factura_url: "#",
    },
    {
        id: "FAC-2026-002",
        fecha: "2026-03-01T11:00:00",
        descripcion: "Plan Básico · Marzo 2026",
        monto: 14990,
        estado: "rechazado",
        metodo: "tarjeta",
    },
    {
        id: "FAC-2026-001",
        fecha: "2026-02-28T16:45:00",
        descripcion: "Plan Básico · Febrero 2026",
        monto: 14990,
        estado: "aprobado",
        metodo: "transferencia",
        factura_url: "#",
    },
    {
        id: "FAC-2025-012",
        fecha: "2025-12-15T08:30:00",
        descripcion: "Plan Básico · Diciembre 2025",
        monto: 14990,
        estado: "anulado",
        metodo: "tarjeta",
    },
    {
        id: "FAC-2025-011",
        fecha: "2025-12-01T10:00:00",
        descripcion: "Plan Básico · Noviembre 2025",
        monto: 14990,
        estado: "aprobado",
        metodo: "tarjeta",
        factura_url: "#",
    },
    {
        id: "FAC-2025-010",
        fecha: "2025-11-20T13:20:00",
        descripcion: "Token extra × 1",
        monto: 4990,
        estado: "pendiente",
        metodo: "wallet",
    },
    {
        id: "FAC-2025-009",
        fecha: "2025-11-01T09:00:00",
        descripcion: "Plan Básico · Octubre 2025",
        monto: 14990,
        estado: "aprobado",
        metodo: "tarjeta",
        factura_url: "#",
    },
    {
        id: "FAC-2025-008",
        fecha: "2025-10-05T17:10:00",
        descripcion: "Plan Básico · Septiembre 2025",
        monto: 14990,
        estado: "rechazado",
        metodo: "tarjeta",
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────

const BENEFICIOS_BASE = [
    "Acceso prioritario a reservas en todas nuestras sedes",
    "Acceso completo a biblioteca de cápsulas e-learning",
    "Análisis de métricas corporales y seguimiento de progreso",
];

const METODOS_PAGO = [
    { id: "card", label: "Tarjeta de crédito/débito", icon: CreditCard },
    { id: "transfer", label: "Transferencia bancaria", icon: Landmark },
    { id: "wallet", label: "Wallet / Pago móvil", icon: Smartphone },
];

function formatCLP(n: number) {
    return `$${n.toLocaleString("es-CL")}`;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function daysUntil(iso: string) {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
}

function estadoBadge(estado: PaymentRecord["estado"]) {
    const map = {
        aprobado: {
            label: "Aprobado",
            bg: "bg-[#00A86B]/10",
            text: "text-[#00A86B]",
            dot: "bg-[#00A86B]",
        },
        rechazado: {
            label: "Rechazado",
            bg: "bg-[#ba1a1a]/10",
            text: "text-[#ba1a1a]",
            dot: "bg-[#ba1a1a]",
        },
        pendiente: {
            label: "Pendiente",
            bg: "bg-[#F28C28]/10",
            text: "text-[#F28C28]",
            dot: "bg-[#F28C28]",
        },
        anulado: {
            label: "Anulado",
            bg: "bg-gray-100",
            text: "text-gray-500",
            dot: "bg-gray-400",
        },
    };
    return map[estado];
}

function metodoIcon(metodo: PaymentRecord["metodo"]) {
    switch (metodo) {
        case "tarjeta":
            return <CreditCardIcon className="w-3.5 h-3.5" />;
        case "transferencia":
            return <Landmark className="w-3.5 h-3.5" />;
        case "wallet":
            return <Wallet className="w-3.5 h-3.5" />;
    }
}

function suscripcionColor(estado: ActiveSubscription["estado"]) {
    switch (estado) {
        case "activa":
            return { bg: "bg-[#00A86B]/10", text: "text-[#00A86B]", dot: "bg-[#00A86B]", label: "Activa" };
        case "vencida":
            return { bg: "bg-[#ba1a1a]/10", text: "text-[#ba1a1a]", dot: "bg-[#ba1a1a]", label: "Vencida" };
        case "pendiente":
            return { bg: "bg-[#F28C28]/10", text: "text-[#F28C28]", dot: "bg-[#F28C28]", label: "Pendiente" };
    }
}

// ─── Dashboard Component ──────────────────────────────────────────────

function PagosDashboard({ onNavigateCompra }: { onNavigateCompra: () => void }) {
    const suscripcion = MOCK_SUSCRIPCION;
    const historial = MOCK_HISTORIAL;

    const stats = useMemo(() => {
        const activa = suscripcion.estado === "activa";
        const totalPagado = historial
            .filter((p) => p.estado === "aprobado")
            .reduce((s, p) => s + p.monto, 0);
        const pendientes = historial.filter((p) => p.estado === "pendiente").length;
        const rechazados = historial.filter((p) => p.estado === "rechazado").length;
        return { activa, totalPagado, pendientes, rechazados };
    }, [suscripcion, historial]);

    const sc = suscripcionColor(suscripcion.estado);
    const pctTokens = Math.round((suscripcion.tokens_usados / suscripcion.tokens_totales) * 100);

    const [busqueda, setBusqueda] = useState("");
    const [filtroEstado, setFiltroEstado] = useState<"todos" | PaymentRecord["estado"]>("todos");

    const historialFiltrado = useMemo(() => {
        return historial.filter((p) => {
            const matchBusqueda =
                p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
                p.id.toLowerCase().includes(busqueda.toLowerCase());
            const matchEstado = filtroEstado === "todos" || p.estado === filtroEstado;
            return matchBusqueda && matchEstado;
        });
    }, [historial, busqueda, filtroEstado]);

    return (
        <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#001c37] to-[#00305B] flex items-center justify-center shadow-lg">
                            <Receipt className="w-5 h-5 text-[#F28C28]" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-[#00305B] tracking-tight">
                            Pagos y suscripción
                            </h1>
                            <p className="text-gray-500 text-sm mt-0.5">
                                Administra tu plan, revisa tus pagos e historial de facturación.
                            </p>
                        </div>
                    </div>
                </div>
                <Link
                    href="/planes"
                    className="inline-flex items-center gap-2 bg-[#F28C28] hover:bg-[#e07d1f] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#F28C28]/20 hover:shadow-xl hover:shadow-[#F28C28]/30 shrink-0"
                >
                    <Crown className="w-4 h-4" />
                    Comprar plan
                </Link>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-[#edeef0] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Membresía
                        </span>
                        <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center`}>
                            <Shield className={`w-4 h-4 ${sc.text}`} />
                        </div>
                    </div>
                    <p className="text-lg font-black text-[#00305B] capitalize">{suscripcion.plan}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        <span className={`text-xs font-bold ${sc.text}`}>{sc.label}</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#edeef0] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Total pagado
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#00A86B]/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#00A86B]" />
                        </div>
                    </div>
                    <p className="text-lg font-black text-[#00305B]">{formatCLP(stats.totalPagado)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {historial.filter((p) => p.estado === "aprobado").length} transacciones
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#edeef0] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Pendientes
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#F28C28]/10 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-[#F28C28]" />
                        </div>
                    </div>
                    <p className="text-lg font-black text-[#00305B]">{stats.pendientes}</p>
                    <p className="text-xs text-gray-400 mt-1">por confirmar</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#edeef0] shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Rechazados
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-[#ba1a1a]/10 flex items-center justify-center">
                            <Ban className="w-4 h-4 text-[#ba1a1a]" />
                        </div>
                    </div>
                    <p className="text-lg font-black text-[#00305B]">{stats.rechazados}</p>
                    <p className="text-xs text-gray-400 mt-1">sin éxito</p>
                </div>
            </div>

            {/* Active subscription + Next billing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active plan card */}
                <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_32px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] p-6 md:p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-[#001c37] to-[#00305B] p-3.5 rounded-2xl shadow-lg">
                                <Crown className="w-7 h-7 text-[#F28C28]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-black text-[#00305B] capitalize">
                                        {suscripcion.plan}
                                    </h2>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text} border border-current/20`}
                                    >
                                        {sc.label}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    {formatCLP(suscripcion.precio)} / mes
                                </p>
                            </div>
                        </div>
                        <button
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                suscripcion.renovacion_automatica
                                    ? "bg-[#00A86B]"
                                    : "bg-gray-200"
                            }`}
                            aria-label="Renovación automática"
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                    suscripcion.renovacion_automatica
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>

                    {/* Token progress */}
                    <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 font-medium">Tokens del mes</span>
                            <span className="font-bold text-[#00305B]">
                                {suscripcion.tokens_usados}/{suscripcion.tokens_totales} usados
                            </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#F28C28] to-[#e07d1f] transition-all duration-700"
                                style={{ width: `${pctTokens}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-gray-400">
                            {suscripcion.tokens_totales - suscripcion.tokens_usados} tokens disponibles
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-xl p-3.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                Inicio
                            </p>
                            <p className="text-sm font-bold text-[#00305B]">
                                {formatDate(suscripcion.fecha_inicio)}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                Vencimiento
                            </p>
                            <p className="text-sm font-bold text-[#00305B]">
                                {formatDate(suscripcion.fecha_vencimiento)}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3.5 col-span-2 sm:col-span-1">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                Método de pago
                            </p>
                            <p className="text-sm font-bold text-[#00305B]">
                                {suscripcion.metodo_pago}
                            </p>
                        </div>
                    </div>

                    {/* Next billing */}
                    {suscripcion.estado === "activa" && (
                        <div className="mt-5 flex items-center gap-3 bg-[#F28C28]/5 border border-[#F28C28]/15 rounded-xl px-4 py-3">
                            <Calendar className="w-4 h-4 text-[#F28C28] shrink-0" />
                            <p className="text-sm text-[#00305B]">
                                <span className="font-bold">Próximo cobro:</span>{" "}
                                {formatDate(suscripcion.fecha_vencimiento)}{" "}
                                <span className="text-gray-400">
                                    ({daysUntil(suscripcion.fecha_vencimiento)} días)
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Quick summary card */}
                <div className="bg-gradient-to-br from-[#001c37] to-[#00305B] rounded-2xl md:rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#F28C28] rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/4" />

                    <div className="relative z-10 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1">
                                Resumen rápido
                            </p>
                            <h3 className="text-lg font-bold">
                                {stats.activa ? "Todo al día" : "Sin membresía activa"}
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Facturas pagadas</span>
                                <span className="text-sm font-bold">
                                    {historial.filter((p) => p.estado === "aprobado").length}
                                </span>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Membresía activa</span>
                                <span
                                    className={`text-sm font-bold ${stats.activa ? "text-[#00A86B]" : "text-[#ba1a1a]"}`}
                                >
                                    {stats.activa ? "Sí" : "No"}
                                </span>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Próximo vencimiento</span>
                                <span className="text-sm font-bold">
                                    {suscripcion.estado === "activa"
                                        ? formatDate(suscripcion.fecha_vencimiento)
                                        : "—"}
                                </span>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/70">Renovación automática</span>
                                <span className="text-sm font-bold">
                                    {suscripcion.renovacion_automatica ? "Activada" : "Desactivada"}
                                </span>
                            </div>
                        </div>

                        <Link
                            href="/planes"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Cambiar de plan
                        </Link>
                    </div>
                </div>
            </div>

            {/* Payment history */}
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_32px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] overflow-hidden">
                {/* Filters */}
                <div className="p-6 md:p-8 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                        <div>
                            <h3 className="text-lg font-black text-[#00305B]">Historial de pagos</h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {historial.length} transacciones registradas
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
                                <Download className="w-4 h-4" />
                                Exportar
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por descripción o factura..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#F28C28]/50 focus:bg-white focus:ring-4 focus:ring-[#F28C28]/10 transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(["todos", "aprobado", "pendiente", "rechazado", "anulado"] as const).map(
                                (f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFiltroEstado(f)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all capitalize ${
                                            filtroEstado === f
                                                ? "bg-[#00305B] text-white shadow-md"
                                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                                        }`}
                                    >
                                        {f === "todos" ? "Todos" : f}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Factura
                                </th>
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Descripción
                                </th>
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Fecha
                                </th>
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Monto
                                </th>
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Estado
                                </th>
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Método
                                </th>
                                <th className="px-6 md:px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {historialFiltrado.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-16 text-center">
                                        <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">
                                            No se encontraron transacciones
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Intenta con otros filtros de búsqueda.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                historialFiltrado.map((pago) => {
                                    const badge = estadoBadge(pago.estado);
                                    return (
                                        <tr
                                            key={pago.id}
                                            className="hover:bg-gray-50/80 transition-colors"
                                        >
                                            <td className="px-6 md:px-8 py-4">
                                                <span className="text-sm font-bold text-[#00305B]">
                                                    {pago.id}
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                <span className="text-sm text-gray-700">
                                                    {pago.descripcion}
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                <span className="text-sm text-gray-500">
                                                    {formatDate(pago.fecha)}
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                <span className="text-sm font-bold text-[#00305B]">
                                                    {formatCLP(pago.monto)}
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                                    {metodoIcon(pago.metodo)}
                                                    <span className="capitalize">{pago.metodo}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 md:px-8 py-4">
                                                {pago.factura_url ? (
                                                    <button className="flex items-center gap-1.5 text-sm font-semibold text-[#00305B] hover:text-[#F28C28] transition-colors">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Factura
                                                        <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                ) : (
                                                    <span className="text-sm text-gray-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        Mostrando {historialFiltrado.length} de {historial.length} transacciones
                    </p>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-40">
                            Anterior
                        </button>
                        <button className="px-3 py-1.5 text-xs font-bold text-white bg-[#00305B] rounded-lg hover:bg-[#001c37] transition-all">
                            1
                        </button>
                        <button className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-40">
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-white rounded-2xl border border-[#edeef0] p-5 md:p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#F28C28]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[#F28C28]" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-[#00305B] mb-1">
                        Próximamente: Pasarela de pago integrada
                    </h4>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Estamos trabajando para integrar Flow y Webpay Plus directamente en la
                        plataforma. Los pagos se procesarán de forma segura y recibirás tu factura
                        electrónica automáticamente. Mientras tanto, los registros se muestran como
                        historial de referencia.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Checkout View ────────────────────────────────────────────────────

function CheckoutView({
    plan,
    onBack,
}: {
    plan: Plan;
    onBack: () => void;
}) {
    const router = useRouter();
    const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
    const [selectedMethod, setSelectedMethod] = useState("card");
    const [aceptaTerminos, setAceptaTerminos] = useState(false);

    const handlePagar = useCallback(() => {
        setCheckoutState("processing");
        setTimeout(() => {
            setCheckoutState("success");
        }, 2000);
    }, []);

    const resetCheckout = useCallback(() => {
        setCheckoutState("idle");
    }, []);

    const renderPlanIcon = (nombre: string) => {
        const lower = nombre.toLowerCase();
        if (lower.includes("pro")) return <Shield className="w-12 h-12 text-[#F28C28]" />;
        if (lower.includes("vip") || lower.includes("premium"))
            return <Crown className="w-12 h-12 text-yellow-400" />;
        return <Zap className="w-12 h-12 text-gray-400" />;
    };

    return (
        <>
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        aria-label="Volver"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#00305B]" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-[#00305B] tracking-tight">
                            Finalizar compra
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Revisa los detalles y confirma tu plan
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_32px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] p-6 md:p-8">
                            <div className="flex items-start gap-4 md:gap-6">
                                <div className="bg-gradient-to-br from-[#001c37] to-[#00305B] p-4 rounded-2xl shrink-0 shadow-lg">
                                    {renderPlanIcon(plan.nombre)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-xl md:text-2xl font-black text-[#00305B] capitalize">
                                            {plan.nombre}
                                        </h2>
                                        <span className="px-2.5 py-0.5 bg-[#F28C28]/10 text-[#F28C28] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#F28C28]/20">
                                            Mensual
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mt-3">
                                        <span className="text-4xl md:text-5xl font-black text-[#00305B]">
                                            {formatCLP(plan.precio ?? 0)}
                                        </span>
                                        <span className="text-gray-400 font-medium">/mes</span>
                                    </div>
                                    <p className="text-gray-500 mt-2 text-sm">
                                        <span className="font-bold text-[#F28C28]">
                                            {plan.tokens_mensuales} Tokens
                                        </span>{" "}
                                        mensuales para canjear por clases y eventos.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_32px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] p-6 md:p-8">
                            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-5">
                                Beneficios incluidos
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-[#00A86B]/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
                                    </div>
                                    <p className="text-gray-700">
                                        <span className="font-bold">{plan.tokens_mensuales} Tokens</span>{" "}
                                        mensuales para canjear por clases y eventos.
                                    </p>
                                </div>
                                {BENEFICIOS_BASE.map((b, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-full bg-[#00A86B]/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <CheckCircle2 className="w-4 h-4 text-[#00A86B]" />
                                        </div>
                                        <p className="text-gray-700">{b}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center text-xs text-gray-400">
                            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-[#edeef0]">
                                <Lock className="w-3.5 h-3.5 text-[#00A86B]" />
                                Pago seguro SSL
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-[#edeef0]">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#00305B]" />
                                Datos protegidos
                            </div>
                            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-[#edeef0]">
                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                Flow / Webpay
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_32px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] p-6 md:p-8">
                            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-5">
                                Resumen de compra
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Crown className="w-4 h-4 text-[#F28C28] shrink-0" />
                                        <span className="text-gray-700 font-medium truncate capitalize">
                                            Plan {plan.nombre}
                                        </span>
                                    </div>
                                    <span className="text-gray-900 font-bold shrink-0 ml-2">
                                        {formatCLP(plan.precio ?? 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Tokens mensuales</span>
                                    <span className="text-gray-700 font-semibold">
                                        {plan.tokens_mensuales}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Duración</span>
                                    <span className="text-gray-700 font-semibold">1 mes</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 mt-5 pt-5">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-gray-900 font-bold text-lg">Total</span>
                                    <span className="text-2xl font-black text-[#00305B]">
                                        {formatCLP(plan.precio ?? 0)}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    IVA incluido. Factura electrónica disponible.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_32px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] p-6 md:p-8">
                            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-5">
                                Método de pago
                            </h3>
                            <div className="space-y-2.5">
                                {METODOS_PAGO.map((metodo) => {
                                    const Icon = metodo.icon;
                                    const isSelected = selectedMethod === metodo.id;
                                    return (
                                        <button
                                            key={metodo.id}
                                            onClick={() => setSelectedMethod(metodo.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                                                isSelected
                                                    ? "border-[#F28C28] bg-[#F28C28]/5 shadow-sm"
                                                    : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            <div
                                                className={`p-2 rounded-lg ${
                                                    isSelected
                                                        ? "bg-[#F28C28] text-white"
                                                        : "bg-gray-200 text-gray-500"
                                                } transition-all`}
                                            >
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span
                                                className={`flex-1 text-sm font-semibold ${
                                                    isSelected ? "text-[#00305B]" : "text-gray-600"
                                                }`}
                                            >
                                                {metodo.label}
                                            </span>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected
                                                        ? "border-[#F28C28]"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#F28C28]" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedMethod === "card" && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3 mb-3">
                                        <CreditCard className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm font-semibold text-gray-600">
                                            Datos de tarjeta
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="h-10 bg-white rounded-lg border border-gray-200 px-3 flex items-center">
                                            <span className="text-gray-300 text-sm">
                                                •••• •••• •••• ••••
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div className="h-10 bg-white rounded-lg border border-gray-200 px-3 flex items-center">
                                                <span className="text-gray-300 text-sm">MM/AA</span>
                                            </div>
                                            <div className="h-10 bg-white rounded-lg border border-gray-200 px-3 flex items-center">
                                                <span className="text-gray-300 text-sm">CVV</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2.5 text-center">
                                        Los datos de pago serán procesados de forma segura por Flow.
                                    </p>
                                </div>
                            )}

                            {selectedMethod === "transfer" && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-sm text-gray-500">
                                        Recibirás los datos de la cuenta bancaria para realizar la
                                        transferencia una vez confirmes tu compra.
                                    </p>
                                </div>
                            )}

                            {selectedMethod === "wallet" && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-sm text-gray-500">
                                        Podrás pagar con tu billetera digital preferida al confirmar.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={aceptaTerminos}
                                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#F28C28] focus:ring-[#F28C28]/30 accent-[#F28C28]"
                                />
                                <span className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                                    Acepto los{" "}
                                    <span className="text-[#00305B] font-semibold underline underline-offset-2">
                                        términos y condiciones
                                    </span>{" "}
                                    y la{" "}
                                    <span className="text-[#00305B] font-semibold underline underline-offset-2">
                                        política de privacidad
                                    </span>
                                    . El cobro se realizará de forma inmediata al confirmar la compra.
                                </span>
                            </label>

                            <button
                                onClick={handlePagar}
                                disabled={!aceptaTerminos}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                                    aceptaTerminos
                                        ? "bg-gradient-to-r from-[#F28C28] to-[#e07d1f] text-white shadow-lg shadow-[#F28C28]/30 hover:shadow-xl hover:shadow-[#F28C28]/40 hover:-translate-y-0.5 active:translate-y-0"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                Pagar {formatCLP(plan.precio ?? 0)}
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Processing overlay */}
            {checkoutState === "processing" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-3xl shadow-2xl p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-[#F28C28] mx-auto" />
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            Procesando pago
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Estamos procesando tu pago de forma segura. No cierres esta ventana.
                        </p>
                        <div className="flex justify-center gap-1 mt-6">
                            <span
                                className="w-2 h-2 rounded-full bg-[#F28C28] animate-bounce"
                                style={{ animationDelay: "0ms" }}
                            />
                            <span
                                className="w-2 h-2 rounded-full bg-[#F28C28] animate-bounce"
                                style={{ animationDelay: "150ms" }}
                            />
                            <span
                                className="w-2 h-2 rounded-full bg-[#F28C28] animate-bounce"
                                style={{ animationDelay: "300ms" }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Success overlay */}
            {checkoutState === "success" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-3xl shadow-2xl p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 rounded-full bg-[#00A86B]/10 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-[#00A86B]" />
                        </div>
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            ¡Pago exitoso!
                        </h3>
                        <p className="text-gray-500 text-sm">
                            Tu plan{" "}
                            <span className="font-bold text-[#00305B] capitalize">{plan.nombre}</span>{" "}
                            ha sido activado correctamente. Ya puedes disfrutar de todos los
                            beneficios.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="mt-8 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00A86B] to-[#009960] text-white font-bold shadow-lg shadow-[#00A86B]/30 hover:shadow-xl hover:shadow-[#00A86B]/40 transition-all"
                        >
                            Ir al Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {checkoutState === "error" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#001220]/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-3xl shadow-2xl p-10 md:p-14 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-10 h-10 text-[#ba1a1a]" />
                        </div>
                        <h3 className="text-xl font-black text-[#00305B] mt-6 mb-2">
                            Error en el pago
                        </h3>
                        <p className="text-gray-500 text-sm">
                            No se pudo procesar tu pago. Revisa los datos e intenta nuevamente. Si el
                            problema persiste, contacta a soporte.
                        </p>
                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                onClick={resetCheckout}
                                className="w-full py-3.5 rounded-xl bg-[#F28C28] hover:bg-[#e07d1f] text-white font-bold transition-all"
                            >
                                Intentar nuevamente
                            </button>
                            <button
                                onClick={() => router.push("/planes")}
                                className="text-sm text-gray-500 hover:text-[#00305B] font-semibold transition-colors"
                            >
                                Volver a planes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Main Entry Point ─────────────────────────────────────────────────

export default function PagosClient() {
    const searchParams = useSearchParams();
    const { usuario } = useAuthUser();
    const planId = searchParams.get("id");

    const [planes, setPlanes] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlanes = async () => {
            try {
                const data = await getPlanes();
                setPlanes(data);
            } catch (err) {
                console.error("Error obteniendo planes:", err);
            } finally {
                setLoading(false);
            }
        };
        if (planId) fetchPlanes();
        else setLoading(false);
    }, [planId]);

    const plan = useMemo(
        () => planes.find((p) => p.id === planId) ?? null,
        [planes, planId],
    );

    const handleBackToDashboard = useCallback(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete("id");
        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        window.history.pushState({}, "", newUrl);
    }, []);

    if (!planId) {
        return (
            <main className="min-h-screen bg-[#f8f9fb] flex flex-col">
                <TopNavBarUser />
                <PagosDashboard onNavigateCompra={() => {}} />
            </main>
        );
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f8f9fb] flex flex-col">
                <TopNavBarUser />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F28C28]" />
                        <p className="text-gray-500 font-medium">Cargando información del plan...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!plan) {
        return (
            <main className="min-h-screen bg-[#f8f9fb] flex flex-col">
                <TopNavBarUser />
                <div className="flex-1 flex items-center justify-center px-6">
                    <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md text-center">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-black text-[#00305B] mb-2">
                            Plan no encontrado
                        </h2>
                        <p className="text-gray-500 mb-6">
                            El plan seleccionado no existe o ha sido eliminado.
                        </p>
                        <button
                            onClick={handleBackToDashboard}
                            className="inline-flex items-center gap-2 bg-[#F28C28] hover:bg-[#e07d1f] text-white px-8 py-3 rounded-xl font-bold transition-all"
                        >
                            Volver al dashboard
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f8f9fb] flex flex-col">
            <TopNavBarUser />
            <CheckoutView plan={plan} onBack={handleBackToDashboard} />
        </main>
    );
}
