"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCapsulasClient, type Capsula } from "@/data/capsules-client";
import { BookOpen, GraduationCap, Clock, Loader2 } from "lucide-react";

export default function ElearningPage() {
  const [capsulas, setCapsulas] = useState<Capsula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCapsulasClient("profesor").then((data) => {
      setCapsulas(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-full bg-[#f8f9fb] pb-12">
      <div className="px-4 md:px-8 lg:px-10 pt-6 md:pt-8 max-w-6xl mx-auto w-full">
        <div className="w-12 h-1 bg-[#fc9910] rounded-full mb-3" />
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#00305b] mb-1">
          E-learning
        </h1>
        <p className="text-[#42474f] text-sm md:text-base font-medium mb-6">
          Material educativo y cápsulas formativas para profesores.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#15477a]/10 text-[#15477a] rounded-full text-xs font-bold uppercase mb-8">
          <GraduationCap size={14} />
          <span>Contenido exclusivo para profesores</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando cápsulas…</span>
          </div>
        ) : capsulas.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">
              No hay cápsulas disponibles para profesores.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capsulas.map((capsula) => (
              <Link
                key={capsula.id}
                href={`/capsules/${capsula.id}`}
                className="bg-white rounded-[1.5rem] border border-[#edeef0] overflow-hidden hover:shadow-lg transition-shadow block"
              >
                {capsula.imagen && (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img
                      src={capsula.imagen}
                      alt={capsula.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-[#00305b] text-sm mb-2 line-clamp-2">
                    {capsula.titulo}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    {capsula.coach && (
                      <span className="flex items-center gap-1">
                        <GraduationCap size={12} />
                        {capsula.coach}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {capsula.duracion}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="inline-block text-[9px] font-bold uppercase bg-[#15477a]/10 text-[#15477a] px-2 py-0.5 rounded-full">
                      Profesor
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
