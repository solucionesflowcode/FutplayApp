"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Capsula } from "@/data/capsules-client";
import { BookOpen, GraduationCap, Clock, Loader2 } from "lucide-react";

type CapsulaRow = {
  id: string;
  titulo: string;
  imagen: string | null;
  creado: string | null;
  duracion: string | null;
};

export default function ElearningPage() {
  const [capsulas, setCapsulas] = useState<Capsula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCapsulas() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("capsula")
        .select("id, titulo, imagen, creado, duracion")
        .order("order_index");

      if (error) {
        console.error("Error fetching capsules:", error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as CapsulaRow[];
      setCapsulas(
        rows.map((item) => ({
          id: item.id,
          titulo: item.titulo,
          imagen: item.imagen || "",
          coach: item.creado || "",
          categoria: "",
          duracion: formatDuration(item.duracion),
          bunny_video_id: null,
        })),
      );
      setLoading(false);
    }

    void fetchCapsulas();
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

        {/* Etiqueta de filtro mockeada */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#15477a]/10 text-[#15477a] rounded-full text-xs font-bold uppercase mb-8">
          <GraduationCap size={14} />
          <span>Filtro activo: etiqueta &quot;profesor&quot;</span>
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
              No hay c&aacute;psulas disponibles con la etiqueta &quot;profesor&quot;.
            </p>
            <p className="text-slate-300 text-xs mt-1">
              (La columna de etiquetas estar&aacute; disponible pr&oacute;ximamente.)
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capsulas.map((capsula) => (
              <div
                key={capsula.id}
                className="bg-white rounded-[1.5rem] border border-[#edeef0] overflow-hidden hover:shadow-lg transition-shadow"
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
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-[1.5rem]">
          <p className="text-sm text-amber-800 font-medium">
            🧪 Preparación técnica
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Esta sección está preparada para filtrar solo las cápsulas con la
            etiqueta <strong>&quot;profesor&quot;</strong>. Actualmente se muestran todas
            las c&aacute;psulas como vista previa. La columna de etiquetas se agregar&aacute;
            en la pr&oacute;xima migraci&oacute;n de base de datos.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDuration(interval: string | null): string {
  if (!interval) return "0 min";
  const match = interval.match(/(\d+):(\d+):(\d+)/);
  if (!match) return "0 min";
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
}
