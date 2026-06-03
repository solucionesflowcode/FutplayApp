"use client";

import { useState, useEffect } from "react";
import type { Student } from "./StudentsTable";

type Props = {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditStudentModal({ student, open, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name);
      setRut(student.rut || "");
      setPhone(student.phone || "");
      setError(null);
      setSaving(false);
    }
  }, [student]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !student) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          nombre: name.trim(),
          rut: rut.trim() || undefined,
          telefono: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al actualizar");
        setSaving(false);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Error de conexión al servidor");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Alumno</h2>

        <input
          type="text"
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        <input
          type="text"
          placeholder="RUT"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        <input
          type="text"
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
