"use client";

import { useEffect, useState } from "react";
import {
  getAlumnosPorClase,
  updateAsistencia,
  cerrarAsistencia,
  type AlumnoAsistencia,
} from "@/data/profesor-clases";
import { Loader2, ClipboardCheck } from "lucide-react";

interface ControlAsistenciaProps {
  claseId: string;
  isMine: boolean;
}

type EstadoUI = "loading" | "ready" | "saving" | "closing";

function normalizarEstado(
  e: string | boolean | null,
): "confirmado" | "asistio" | "no_asistio" {
  const s = String(e ?? "").toLowerCase().replace(/\s+/g, "_");
  if (s === "confirmado_whatsapp" || s === "confirmado") return "confirmado";
  if (s === "asistio" || s === "true" || s === "presente") return "asistio";
  if (s === "no_asistio" || s === "false" || s === "ausente") return "no_asistio";
  return "confirmado";
}

export default function ControlAsistencia({ claseId, isMine }: ControlAsistenciaProps) {
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [estadoUI, setEstadoUI] = useState<EstadoUI>("loading");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    getAlumnosPorClase(claseId).then((data) => {
      setAlumnos(data);
      const inicial = new Set<string>();
      for (const a of data) {
        const estado = normalizarEstado(a.estado);
        if (estado === "asistio") inicial.add(a.claseUsuarioId);
      }
      setMarcados(inicial);
      setEstadoUI("ready");
    });
  }, [claseId]);

  async function handleToggle(claseUsuarioId: string) {
    const nuevoMarcado = !marcados.has(claseUsuarioId);
    setMensaje(null);

    if (nuevoMarcado) {
      setMarcados((prev) => new Set(prev).add(claseUsuarioId));
      const ok = await updateAsistencia(claseUsuarioId, "asistio");
      if (!ok) {
        setMarcados((prev) => {
          const next = new Set(prev);
          next.delete(claseUsuarioId);
          return next;
        });
        setMensaje({ tipo: "error", texto: "Error al marcar asistencia" });
      }
    } else {
      setMarcados((prev) => {
        const next = new Set(prev);
        next.delete(claseUsuarioId);
        return next;
      });
      const ok = await updateAsistencia(claseUsuarioId, "confirmado_whatsapp");
      if (!ok) {
        setMarcados((prev) => new Set(prev).add(claseUsuarioId));
        setMensaje({ tipo: "error", texto: "Error al desmarcar asistencia" });
      }
    }
  }

  async function handleCerrarAsistencia() {
    setEstadoUI("closing");
    setMensaje(null);

    const noMarcados = alumnos
      .filter((a) => !marcados.has(a.claseUsuarioId))
      .map((a) => a.claseUsuarioId);

    if (noMarcados.length === 0) {
      setMensaje({ tipo: "ok", texto: "Todos los alumnos ya están marcados." });
      setEstadoUI("ready");
      return;
    }

    const ok = await cerrarAsistencia(claseId, noMarcados);
    if (ok) {
      setAlumnos((prev) =>
        prev.map((a) =>
          noMarcados.includes(a.claseUsuarioId)
            ? { ...a, estado: "no asistio" }
            : a,
        ),
      );
      setMensaje({ tipo: "ok", texto: "Asistencia cerrada correctamente." });
    } else {
      setMensaje({ tipo: "error", texto: "Error al cerrar asistencia." });
    }
    setEstadoUI("ready");
  }

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
            {marcados.size} presente{marcados.size !== 1 ? "s" : ""}
          </p>
        </div>
        {!isMine && (
          <div className="px-4 py-2 bg-slate-100 rounded-xl text-xs text-slate-500 font-medium">
            Solo lectura — no eres el profesor encargado de esta clase.
          </div>
        )}
        {isMine && (
          <button
            type="button"
            onClick={handleCerrarAsistencia}
            disabled={estadoUI === "closing"}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#15477a] text-white text-sm font-bold rounded-xl hover:bg-[#0f355a] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {estadoUI === "closing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ClipboardCheck className="w-4 h-4" />
            )}
            Cerrar Asistencia
          </button>
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
          No hay alumnos con estados pendientes para esta clase.
        </p>
      ) : (
        <div className="space-y-1">
          {alumnos.map((alumno) => {
            const marcado = marcados.has(alumno.claseUsuarioId);
            const esPendiente = normalizarEstado(alumno.estado) === "confirmado";

            return (
              <div
                key={alumno.claseUsuarioId}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-xl transition-colors
                  ${marcado
                    ? "bg-emerald-50"
                    : esPendiente
                      ? "bg-amber-50"
                      : "bg-red-50"
                  }
                `}
              >
                <span
                  className={`text-sm font-semibold ${
                    marcado
                      ? "text-emerald-800"
                      : esPendiente
                        ? "text-amber-800"
                        : "text-red-800"
                  }`}
                >
                  {alumno.nombre}
                </span>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      marcado
                        ? "text-emerald-600"
                        : esPendiente
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {marcado
                      ? "Asistió"
                      : esPendiente
                        ? "Sin marcar"
                        : "No asistió"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(alumno.claseUsuarioId)}
                    disabled={estadoUI === "saving" || !isMine}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors shrink-0
                      ${!isMine ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                      ${marcado ? "bg-emerald-500" : "bg-slate-300"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                        ${marcado ? "translate-x-5" : "translate-x-0"}
                      `}
                    />
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
