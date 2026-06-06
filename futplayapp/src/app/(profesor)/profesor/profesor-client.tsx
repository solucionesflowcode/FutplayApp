"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/context";
import { getTodasLasClases, type ClaseEvent } from "@/data/profesor-clases";
import CalendarioClases from "@/components/profesor/CalendarioClases";
import ControlAsistencia from "@/components/profesor/ControlAsistencia";

export default function ProfesorClient() {
  const { usuario, user } = useAuthUser();
  const [clases, setClases] = useState<ClaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaseId, setSelectedClaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario?.id) return;
    getTodasLasClases(usuario.id).then((data) => {
      setClases(data);
      setLoading(false);
    });
  }, [usuario?.id]);

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined);
  const firstName = usuario?.nombre?.split(" ")[0] ?? "Profesor";

  return (
    <div className="min-h-full bg-[#f8f9fb] pb-12">
      <div className="px-4 md:px-8 lg:px-10 pt-6 md:pt-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="w-12 h-1 bg-[#fc9910] rounded-full mb-3" />
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#00305b]">
              Panel del Profesor
            </h1>
            <p className="text-[#42474f] mt-1.5 text-sm md:text-base font-medium">
              Calendario de clases y control de asistencia.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="flex items-center gap-3 pl-1 sm:border-l sm:border-[#e1e2e4] sm:pl-6">
              <div className="text-right hidden sm:block min-w-0">
                <p className="text-xs font-bold text-[#00305b] truncate max-w-[140px]">
                  {usuario?.nombre ?? firstName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {usuario?.rol ?? "profesor"}
                </p>
              </div>
              {avatarUrl ? (
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
            <CalendarioClases
              clases={clases}
              selectedClaseId={selectedClaseId}
              onSelectClase={setSelectedClaseId}
            />

            {selectedClaseId && (() => {
              const clase = clases.find((c) => c.claseId === selectedClaseId);
              if (!clase) return null;
              return (
                <div>
                  <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_12px_40px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${clase.isMine ? "bg-emerald-500" : "bg-blue-500"}`} />
                      <div>
                        <h3 className="text-lg font-bold text-[#00305b]">{clase.titulo}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(clase.fecha_hora).toLocaleDateString("es-CL", {
                            day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
                          })}
                          {clase.sede ? ` · ${clase.sede}` : ""}
                        </p>
                      </div>
                      {clase.isMine && (
                        <span className="ml-auto text-[10px] font-bold uppercase bg-emerald-500 text-white px-3 py-1 rounded-full">
                          Mi clase
                        </span>
                      )}
                    </div>
                  </div>
                  <ControlAsistencia
                    claseId={selectedClaseId}
                    fecha_hora={clase.fecha_hora}
                    isMine={clase.isMine}
                    key={selectedClaseId}
                  />
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
