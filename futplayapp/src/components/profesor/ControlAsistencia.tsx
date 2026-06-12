"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAlumnosPorClase,
  updateAsistencia,
  autoCerrarConfirmados,
  type AlumnoAsistencia,
} from "@/data/profesor-clases";
import { Loader2 } from "lucide-react";

interface ControlAsistenciaProps {
  claseId: string;
  fecha_hora: string;
  isMine: boolean;
}

function normalizeEstado(e: string | boolean | null): string {
  const s = String(e ?? "").toLowerCase().replace(/\s+/g, "_");
  if (s === "asistio" || s === "true" || s === "presente") return "asistio";
  if (s === "no_asistio" || s === "false" || s === "ausente") return "no_asistio";
  return "pendiente";
}

export default function ControlAsistencia({ claseId, fecha_hora, isMine }: ControlAsistenciaProps) {
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [estadoUI, setEstadoUI] = useState<"loading" | "ready" | "saving">("loading");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    async function init() {
      const data = await getAlumnosPorClase(claseId);
      const claseDate = new Date(fecha_hora);
      const unaHoraDespues = new Date(claseDate.getTime() + 60 * 60 * 1000);

      if (isMine && data.some((a) => normalizeEstado(a.estado) === "pendiente") && new Date() > unaHoraDespues) {
        await autoCerrarConfirmados(claseId);
        const dataActualizada = await getAlumnosPorClase(claseId);
        setAlumnos(dataActualizada);
        setMensaje({ tipo: "ok", texto: "Asistencia cerrada automáticamente (pasó más de 1h desde la clase)." });
      } else {
        setAlumnos(data);
      }
      setEstadoUI("ready");
    }
    init();
  }, [claseId, fecha_hora, isMine]);

  const handleToggle = useCallback(async (alumno: AlumnoAsistencia) => {
    setMensaje(null);
    const estadoActual = normalizeEstado(alumno.estado);
    const nuevoEstado = estadoActual === "asistio" ? "no_asistio" : "asistio";

    setAlumnos((prev) =>
      prev.map((a) =>
        a.claseUsuarioId === alumno.claseUsuarioId ? { ...a, estado: nuevoEstado } : a,
      ),
    );

    const ok = await updateAsistencia(alumno.claseUsuarioId, nuevoEstado);
    if (!ok) {
      setAlumnos((prev) =>
        prev.map((a) =>
          a.claseUsuarioId === alumno.claseUsuarioId ? { ...a, estado: alumno.estado } : a,
        ),
      );
      setMensaje({ tipo: "error", texto: "Error al actualizar asistencia" });
    }
  }, []);

  const asistentes = alumnos.filter((a) => normalizeEstado(a.estado) === "asistio").length;

  if (estadoUI === "loading") {
    return (
      <div className="bg-white p-6 rounded-[1.5rem] border border-[#edeef0] flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando alumnos…</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_12px_40px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#00305b]">
            Control de Asistencia
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} ·{" "}
            {asistentes} presente{asistentes !== 1 ? "s" : ""}
          </p>
        </div>
        {!isMine && (
          <div className="px-4 py-2 bg-slate-100 rounded-xl text-xs text-slate-500 font-medium">
            Solo lectura — no eres el profesor encargado de esta clase.
          </div>
        )}
      </div>

      {mensaje && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            mensaje.tipo === "ok"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {alumnos.length === 0 ? (
        <p className="text-center text-slate-400 py-8 text-sm">
          No hay alumnos para esta clase.
        </p>
      ) : (
        <div className="space-y-1">
          {alumnos.map((alumno) => {
            const estado = normalizeEstado(alumno.estado);
            const esAsistio = estado === "asistio";

            return (
              <div
                key={alumno.claseUsuarioId}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  esAsistio ? "bg-emerald-50" : "bg-red-50"
                }`}
              >
                <span className={`text-sm font-semibold ${esAsistio ? "text-emerald-800" : "text-red-800"}`}>
                  {alumno.nombre}
                </span>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase ${esAsistio ? "text-emerald-600" : "text-red-600"}`}>
                    {esAsistio ? "Asistió" : "No asistió"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(alumno)}
                    disabled={!isMine}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      !isMine ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    } ${esAsistio ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      esAsistio ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
