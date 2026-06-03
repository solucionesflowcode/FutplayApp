"use client";

import { User, Mail, Shield } from "lucide-react";
import { useAuthUser } from "@/context";
import TopNavBarUser from "@/components/navbars/TopNavBarUser";

export default function ConfiguracionPage() {
    const { usuario, user } = useAuthUser();

    return (
        <>
            <TopNavBarUser />
            <div className="w-full flex flex-col h-full px-7">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-1.5 h-12 bg-gradient-to-b from-[#F39200] to-[#60A5FA] rounded-full" />
                    <div>
                        <h1 className="text-[30px] font-black text-[#001220] tracking-tight leading-none">
                            Mi Perfil
                        </h1>
                        <p className="text-[#64748B] text-[15px] mt-1 font-medium">
                            Información personal y configuración de tu cuenta
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-[#002447] to-[#00305B] rounded-2xl shadow-xl border border-white/10 p-6 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-[#F39200]/20 border-2 border-[#F39200]/30 flex items-center justify-center mb-4">
                                <User size={36} className="text-[#F39200]" />
                            </div>
                            <h2 className="text-white text-lg font-bold">{usuario?.nombre || "Sin nombre"}</h2>
                            <p className="text-white/50 text-sm mt-1">{user?.email}</p>
                            <span className="mt-3 px-4 py-1.5 rounded-full bg-[#F39200]/10 text-[#F39200] text-xs font-bold uppercase tracking-wider">
                                {usuario?.rol || "jugador"}
                            </span>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-[#00305B]/10 p-2.5 rounded-xl">
                                    <User size={18} className="text-[#00305B]" />
                                </div>
                                <h3 className="text-[#00305B] text-sm font-extrabold tracking-wide uppercase">
                                    Información Personal
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1">Nombre</p>
                                    <p className="text-[#001220] text-sm font-medium">{usuario?.nombre || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1">Rol</p>
                                    <p className="text-[#001220] text-sm font-medium capitalize">{usuario?.rol || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1">Email</p>
                                    <p className="text-[#001220] text-sm font-medium">{user?.email || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
