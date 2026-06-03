"use client";

import { X } from "lucide-react";
import type { Student } from "./StudentsTable";

type Props = {
  student: Student | null;
  open: boolean;
  onClose: () => void;
};

export default function ViewStudentModal({ student, open, onClose }: Props) {
  if (!open || !student) return null;

  const statusColor =
    student.status === "Activo"
      ? "bg-green-100 text-green-600"
      : student.status === "Inactivo"
      ? "bg-yellow-100 text-yellow-600"
      : "bg-red-100 text-red-600";

  const roleColor =
    student.role === "Alumno"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Detalle del Alumno</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Nombre</label>
            <p className="text-gray-900 font-semibold">{student.name}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">ID</label>
            <p className="text-gray-600 text-sm break-all">{student.id}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Usuario</label>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${roleColor}`}>
              {student.role}
            </span>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">RUT</label>
            <p className="text-gray-900">{student.rut || "—"}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Teléfono</label>
            <p className="text-gray-900">{student.phone || "—"}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Plan</label>
            <p className="text-gray-900">{student.plan}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Tokens</label>
            <p className="text-gray-900 font-mono">{student.tokens}</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Estado</label>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
              {student.status}
            </span>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
