"use client";

type Props = {
    titulo: string;
    imagen: string;
    coach: string;
    categoria: string;
    duracion: string;
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1570498839593-e565b39455fc";

export default function CapsulaCard({
    titulo,
    imagen,
    coach,
    categoria,
    duracion,
}: Props) {
    const imgSrc = imagen || PLACEHOLDER;
    return (
        <div className="w-full cursor-pointer">


            <div className="relative w-full h-[180px] rounded-2xl overflow-hidden group">

                <img
                    src={imgSrc}
                    alt={titulo}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />


                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/30 backdrop-blur-md p-4 rounded-full group-hover:scale-110 transition">
                        <div className="w-0 h-0 border-l-[10px] border-l-white border-y-[6px] border-y-transparent ml-1"></div>
                    </div>
                </div>


                <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-md">
                    {duracion}
                </div>
            </div>


            <div className="mt-3">
                <h3 className="text-[#00305B] font-semibold text-[16px] leading-snug">
                    {titulo}
                </h3>

                <p className="text-gray-400 text-sm mt-1">
                    {coach}
                    <span className="mx-2">•</span>
                    {categoria}
                </p>
            </div>
        </div>
    );
}