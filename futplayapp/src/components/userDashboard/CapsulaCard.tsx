"use client";

import Link from "next/link";
import { Play, Clock } from "lucide-react";

type Props = {
    id: string;
    titulo: string;
    imagen: string;
    coach: string;
    categoria: string;
    duracion: string;
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1570498839593-e565b39455fc";

export default function CapsulaCard({
    id,
    titulo,
    imagen,
    coach,
    categoria,
    duracion,
}: Props) {
    const imgSrc = imagen || PLACEHOLDER;
    return (
        <Link href={`/capsules/${id}`} className="block h-full">
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:translate-y-[-3px] transition-all duration-300 cursor-pointer group ring-1 ring-inset ring-black/[0.03]">
                <img
                    src={imgSrc}
                    alt={titulo}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#001220]/85 via-[#001220]/30 to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md border border-white/40 rounded-full w-12 h-12 flex items-center justify-center text-white">
                        <Play size={18} />
                    </div>
                </div>

                <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={9} />
                    {duracion}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                    <span className="inline-block bg-[#F39200]/10 text-[#F39200] text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1">
                        {categoria}
                    </span>
                    <h3 className="text-white font-bold text-[0.85rem] leading-snug">
                        {titulo}
                    </h3>
                    <p className="text-white/60 text-[11px] mt-0.5">{coach}</p>
                </div>
            </div>
        </Link>
    );
}