"use client";

import { useState } from "react";

type Child = {
  name: string;
  plan: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onSave?: (student: { id: string; email: string; nombre: string; rol: string }) => void;
};

export default function CreateStudentModal({
  open,
  onClose,
  onCreated,
  onSave: onSaveCallback,
}: Props) {

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("");
  const [userType, setUserType] = useState("Alumno");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [childrenCount, setChildrenCount] = useState(0);
  const [children, setChildren] = useState<Child[]>([]);

  const handleChildrenCount = (value: number) => {
    setChildrenCount(value);

    const newChildren = Array.from({ length: value }, () => ({
      name: "",
      plan: "",
    }));

    setChildren(newChildren);
  };

  const handleChildChange = (
    index: number,
    field: "name" | "plan",
    value: string
  ) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  const resetForm = () => {
    setName("");
    setLastName("");
    setEmail("");
    setRut("");
    setPhone("");
    setPlan("");
    setUserType("Alumno");
    setFile(null);
    setChildren([]);
    setChildrenCount(0);
    setError(null);
    setSuccess(null);
  };

  const saveStudent = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const fullName = `${name} ${lastName}`.trim();

    if (!email || !fullName) {
      setError("Nombre completo y email son obligatorios");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          nombre: fullName,
          rol: userType === "Alumno" ? "jugador" : "jugador",
          rut: rut || undefined,
          telefono: phone || undefined,
          plan_id: plan || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear estudiante");
        setSaving(false);
        return;
      }

      setSuccess(`Estudiante creado: ${data.user.nombre} (${data.user.rol})`);
      setSaving(false);

      onSaveCallback?.(data.user);

      setTimeout(() => {
        resetForm();
        onCreated();
        onClose();
      }, 1500);
    } catch {
      setError("Error de conexión al servidor");
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">

        {/* HEADER */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Registro de Usuarios
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Registro manual administrativo
          </p>
        </div>

        {/* NOMBRE */}
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        {/* APELLIDO */}
        <input
          type="text"
          placeholder="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Correo electrónico *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        {/* RUT */}
        <input
          type="text"
          placeholder="RUT"
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        {/* TELÉFONO */}
        <input
          type="text"
          placeholder="Teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        />

        {/* TIPO USUARIO */}
        <select
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        >
          <option>Alumno</option>
          <option>Profesor</option>
          <option>Administrador</option>
        </select>

        {/* PLAN */}
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full border border-gray-300 text-black p-3 rounded-xl mb-4"
        >
          <option value="">Seleccionar plan</option>
          <option value="Plan Híbrido">Plan Híbrido</option>
          <option value="Plan Online">Plan Online</option>
        </select>

        {/* FICHA MÉDICA */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subir ficha médica
        </label>

        <input
          type="file"
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
          className="w-full border border-gray-300 p-3 rounded-xl mb-4"
        />

        {/* 🔥 APODERADO */}
        {userType === "Apoderado" && (
          <div className="space-y-4">

            <input
              type="number"
              placeholder="Cantidad de hijos"
              min={1}
              value={childrenCount}
              onChange={(e) =>
                handleChildrenCount(Number(e.target.value))
              }
              className="w-full border border-gray-300 text-black p-3 rounded-xl"
            />

            {children.map((child, index) => (
              <div
                key={index}
                className="border rounded-xl p-4 bg-gray-50"
              >
                <p className="text-sm font-semibold mb-2">
                  Hijo {index + 1}
                </p>

                <input
                  type="text"
                  placeholder="Nombre del hijo"
                  value={child.name}
                  onChange={(e) =>
                    handleChildChange(index, "name", e.target.value)
                  }
                  className="w-full border border-gray-300 text-black p-2 rounded mb-2"
                />

                <select
                  value={child.plan}
                  onChange={(e) =>
                    handleChildChange(index, "plan", e.target.value)
                  }
                  className="w-full border border-gray-300 text-black p-2 rounded"
                >
                  <option value="">Seleccionar plan</option>
                  <option value="Plan Híbrido">Plan Híbrido</option>
                  <option value="Plan Online">Plan Online</option>
                </select>

              </div>
            ))}

          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm mb-4">
            {success}
          </div>
        )}

        {/* BOTONES */}
        <div className="flex justify-end gap-3 mt-6">

          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={saveStudent}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Guardando..." : "Guardar Registro"}
          </button>

        </div>

      </div>

    </div>
  );
}