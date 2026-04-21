"use client";

import { useState, useMemo } from "react";
import { Search, Play, Clock, Zap } from "lucide-react";
import { capsulasMock, type Capsula } from "@/data/capsulas.mocks";

const CATEGORIES = ["Todas", ...Array.from(new Set(capsulasMock.map((c) => c.categoria)))];

function FeaturedHero({ capsula }: { capsula: Capsula }) {
    return (
        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group mb-10">
            <img
                src={capsula.imagen}
                alt={capsula.titulo}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-[#001220]/95 via-[#001220]/60 to-transparent" />

            <div className="absolute top-5 left-6 flex items-center gap-2 bg-[#00A86B] text-white text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full">
                <Zap size={12} />
                Cápsula Destacada
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between flex-wrap gap-4">
                <div>
                    <span className="inline-block mb-3 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                        {capsula.categoria}
                    </span>

                    <h2 className="text-white text-[1.85rem] font-extrabold leading-tight max-w-lg mb-2">
                        {capsula.titulo}
                    </h2>

                    <p className="text-white/65 text-sm">
                        Con <span className="text-white font-semibold">{capsula.coach}</span> · Nivel Intermedio
                    </p>

                    <div className="flex items-center gap-5 mt-3">
                        <span className="flex items-center gap-1.5 text-white/75 text-xs">
                            <Clock size={13} />
                            {capsula.duracion}
                        </span>
                        <span className="text-white/50 text-xs">🎯 Técnica individual</span>
                    </div>
                </div>

                <button className="flex items-center gap-2 bg-[#00A86B] hover:bg-[#009960] text-white font-bold text-sm px-6 py-3 rounded-full shadow-lg shadow-[#00A86B]/40 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap">
                    <Play size={16} />
                    Ver Cápsula
                </button>
            </div>
        </div>
    );
}

function CapsulaCard({ capsula }: { capsula: Capsula }) {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
            <div className="relative w-full h-44 overflow-hidden">
                <img
                    src={capsula.imagen}
                    alt={capsula.titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001220]/60 to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-full w-12 h-12 flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-110">
                        <Play size={18} />
                    </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/75 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock size={10} />
                    {capsula.duracion}
                </div>
            </div>

            <div className="p-4">
                <span className="inline-block bg-green-50 text-[#00A86B] text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full mb-2">
                    {capsula.categoria}
                </span>
                <h3 className="text-[#00305B] font-bold text-[0.93rem] leading-snug mb-1">
                    {capsula.titulo}
                </h3>
                <p className="text-slate-400 text-xs">{capsula.coach}</p>
            </div>
        </div>
    );
}

export default function CapsulesPage() {
    const [search, setSearch] = useState<string>("");
    const [activeCategory, setActiveCategory] = useState<string>("Todas");

    const featured = capsulasMock[0];
    const rest = capsulasMock.slice(1);

    const filtered = useMemo<Capsula[]>(() => {
        return rest.filter((c) => {
            const matchCat = activeCategory === "Todas" || c.categoria === activeCategory;
            const q = search.toLowerCase();
            const matchSearch =
                c.titulo.toLowerCase().includes(q) ||
                c.coach.toLowerCase().includes(q) ||
                c.categoria.toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
    }, [search, activeCategory]);

    return (
        <div className="px-10 py-8 min-h-screen bg-slate-50">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <div>
                    <h1 className="text-[2rem] font-extrabold text-[#00305B] leading-none tracking-tight">
                        Cápsulas <span className="text-[#00A86B]">EdTech</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Perfecciona tu técnica con entrenamientos diseñados por expertos
                    </p>
                </div>

                <div className="relative flex items-center">
                    <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar cápsula, coach..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/20 transition-all w-64"
                    />
                </div>
            </div>

            <FeaturedHero capsula={featured} />

            <div className="mb-5">
                <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
                    <h2 className="text-[1.1rem] font-bold text-[#00305B]">
                        Biblioteca de Cápsulas{" "}
                        <span className="text-slate-400 font-normal text-sm">
                            ({filtered.length} {filtered.length === 1 ? "resultado" : "resultados"})
                        </span>
                    </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-[0.8rem] font-semibold border-2 transition-all duration-200 ${isActive
                                    ? "bg-[#00A86B] border-[#00A86B] text-white shadow-md shadow-[#00A86B]/30"
                                    : "bg-white border-slate-200 text-slate-500 hover:border-[#00A86B] hover:text-[#00A86B]"
                                    }`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <p className="text-base">No se encontraron cápsulas con esos filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-5">
                    {filtered.map((capsula) => (
                        <CapsulaCard key={capsula.id} capsula={capsula} />
                    ))}
                </div>
            )}
        </div>
    );
}