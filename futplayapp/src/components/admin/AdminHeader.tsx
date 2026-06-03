"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, Settings, Download, X } from "lucide-react";
import type { Student } from "./StudentsTable";

type Props = {
  students: Student[];
  search?: string;
  onSearchChange?: (value: string) => void;
  onView?: (student: Student) => void;
};

function exportCSV(students: Student[]) {
  const headers = ["Nombre", "Usuario", "RUT", "Teléfono", "Plan", "Tokens", "Estado"];
  const rows = students.map((s) => [
    s.name,
    s.role,
    s.rut || "",
    s.phone || "",
    s.plan,
    String(s.tokens),
    s.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alumnos_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminHeader({ students, search, onSearchChange, onView }: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const vencidos = students.filter((s) => s.status === "Vencido");

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, teléfono, plan..."
            value={search || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm text-black focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
              className="p-2 rounded-lg hover:bg-gray-200 transition relative cursor-pointer"
            >
              <Bell size={20} className="text-gray-700 hover:text-black transition" />
              {vencidos.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {vencidos.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-900">Notificaciones</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                {vencidos.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">No hay notificaciones</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {vencidos.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { onView?.(s); setShowNotifications(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer"
                      >
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-red-500">Pago vencido — {s.plan}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
              className="p-2 rounded-lg hover:bg-gray-200 transition cursor-pointer"
            >
              <Settings size={20} className="text-gray-700 hover:text-black transition" />
            </button>

            {showSettings && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-900">Opciones</h3>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { exportCSV(students); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <Download size={16} className="text-gray-500" />
                    Exportar CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="text-sm leading-tight">
              <p className="text-gray-500 text-xs">Admin Principal</p>
              <p className="font-bold text-black">Pablo Escobar</p>
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold text-black">
        Directorio de Alumnos
      </h1>
    </div>
  );
}
