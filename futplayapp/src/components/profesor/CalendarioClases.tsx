"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import type { ClaseEvent } from "@/data/profesor-clases";

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseFechaLocal(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function startOfCalendarGrid(view: Date): Date {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const dow = first.getDay();
  const mondayOffset = (dow + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return start;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarioClasesProps {
  clases: ClaseEvent[];
  selectedClaseId: string | null;
  onSelectClase: (claseId: string | null) => void;
}

export default function CalendarioClases({
  clases,
  selectedClaseId,
  onSelectClase,
}: CalendarioClasesProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const monthBounds = useMemo(() => {
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }, [viewMonth]);

  const clasesInView = useMemo(() => {
    return clases.filter((c) => {
      const d = parseFechaLocal(c.fecha_hora);
      return d >= monthBounds.start && d <= monthBounds.end;
    });
  }, [clases, monthBounds]);

  const clasesByDay = useMemo(() => {
    const map = new Map<string, ClaseEvent[]>();
    for (const c of clasesInView) {
      const d = parseFechaLocal(c.fecha_hora);
      const k = dateKeyLocal(d);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    for (const [, arr] of map) {
      arr.sort(
        (a, b) =>
          parseFechaLocal(a.fecha_hora).getTime() -
          parseFechaLocal(b.fecha_hora).getTime(),
      );
    }
    return map;
  }, [clasesInView]);

  const gridStart = useMemo(() => startOfCalendarGrid(viewMonth), [viewMonth]);
  const gridCells = useMemo(() => {
    const cells: Date[] = [];
    let cur = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return cells;
  }, [gridStart]);

  const today = new Date();
  const monthTitle = viewMonth.toLocaleString("es-CL", {
    month: "long",
    year: "numeric",
  });

  const stats = useMemo(() => {
    const total = clasesInView.length;
    const misClases = clasesInView.filter((c) => c.isMine).length;
    return { total, misClases, otras: total - misClases };
  }, [clasesInView]);

  return (
    <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_12px_40px_-4px_rgba(25,28,30,0.06)] border border-[#edeef0] mb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          <h2 className="text-lg md:text-xl font-bold text-[#00305b] capitalize">
            {monthTitle}
          </h2>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Mes anterior"
              className="p-1.5 hover:bg-[#f3f4f6] rounded-lg text-slate-400 transition-colors cursor-pointer"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              className="p-1.5 hover:bg-[#f3f4f6] rounded-lg text-slate-400 transition-colors cursor-pointer"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="ml-1 text-xs font-bold text-[#15477a] px-2 py-1 rounded-lg hover:bg-[#d3e3ff]/50 cursor-pointer"
              onClick={() => {
                const n = new Date();
                setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1));
              }}
            >
              Hoy
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-5 items-center">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Mis clases
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Otras clases
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-3">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center pb-2 sm:pb-4 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]"
          >
            {d}
          </div>
        ))}
        {gridCells.map((cellDate) => {
          const inMonth = cellDate.getMonth() === viewMonth.getMonth();
          const key = dateKeyLocal(cellDate);
          const dayClases = clasesByDay.get(key) ?? [];
          const isToday =
            dateKeyLocal(cellDate) === dateKeyLocal(today);

          const hasMine = dayClases.some((c) => c.isMine);
          const hasOthers = dayClases.some((c) => !c.isMine);

          let cellTone: "empty" | "mine" | "other" | "mixed" = "empty";
          if (dayClases.length > 0) {
            if (hasMine && hasOthers) cellTone = "mixed";
            else if (hasMine) cellTone = "mine";
            else cellTone = "other";
          }

          const baseCell =
            "min-h-[4.5rem] sm:min-h-[5.5rem] md:min-h-24 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center relative transition-transform";

          let cellClass = `${baseCell} `;
          if (!inMonth) {
            cellClass += "opacity-25 ";
          }
          if (dayClases.length === 0) {
            cellClass += inMonth ? "bg-[#f3f4f6] " : "bg-transparent ";
          } else if (cellTone === "mine") {
            cellClass +=
              "bg-emerald-500/10 border-2 border-emerald-500/25 ";
          } else if (cellTone === "other") {
            cellClass +=
              "bg-blue-500/10 border-2 border-blue-500/25 ";
          } else if (cellTone === "mixed") {
            cellClass +=
              "bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-2 border-emerald-500/25 ";
          }

          if (isToday) {
            cellClass += " ring-2 ring-[#15477a] ring-offset-2 ring-offset-[#f8f9fb] z-10 ";
          }

          const isSelectedDay = selectedClaseId && dayClases.some((c) => c.claseId === selectedClaseId);

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (dayClases.length === 0) return;
                const miClase = dayClases.find((c) => c.isMine);
                const targetId = miClase?.claseId ?? dayClases[0].claseId;
                onSelectClase(isSelectedDay ? null : targetId);
              }}
              disabled={dayClases.length === 0}
              className={`${cellClass} ${dayClases.length > 0 ? "cursor-pointer hover:scale-[1.02]" : "cursor-default"}`}
            >
              <span
                className={`text-sm sm:text-lg font-bold ${
                  cellTone === "mine"
                    ? "text-emerald-700"
                    : cellTone === "other"
                      ? "text-blue-700"
                      : inMonth
                        ? "text-[#00305b]"
                        : "text-slate-400"
                }`}
              >
                {cellDate.getDate()}
              </span>
              {isToday && (
                <span className="text-[7px] sm:text-[8px] font-black uppercase text-[#15477a] tracking-widest mt-0.5">
                  Hoy
                </span>
              )}
              {dayClases.length > 0 && (
                <span className="text-[8px] font-semibold text-slate-500 mt-0.5">
                  {dayClases.length} clase{dayClases.length > 1 ? "s" : ""}
                </span>
              )}
              {isSelectedDay && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#15477a]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Clases del mes */}
      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-bold text-[#00305b] mb-3">
          Clases del mes ({stats.total})
        </h3>
        {clasesInView.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No hay clases este mes.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clasesInView.map((clase, idx) => {
              const d = parseFechaLocal(clase.fecha_hora);
              const isSelected = selectedClaseId === clase.claseId;
              return (
                <button
                  key={`${clase.claseId}-${idx}`}
                  type="button"
                  onClick={() =>
                    onSelectClase(isSelected ? null : clase.claseId)
                  }
                  className={`
                    w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer
                    ${isSelected
                      ? "bg-[#15477a] text-white shadow-md"
                      : clase.isMine
                        ? "bg-emerald-50 hover:bg-emerald-100 text-[#00305b]"
                        : "bg-blue-50 hover:bg-blue-100 text-[#00305b]"
                    }
                  `}
                >
                  <Calendar size={16} className={isSelected ? "text-white" : "text-slate-400"} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">
                      {clase.titulo}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {d.toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {clase.sede ? ` · ${clase.sede}` : ""}
                    </span>
                  </div>
                  {clase.isMine && (
                    <span className="text-[9px] font-bold uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full shrink-0">
                      Mi clase
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
