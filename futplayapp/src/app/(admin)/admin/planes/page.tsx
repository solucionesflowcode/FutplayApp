"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Search,
} from "lucide-react";
import {
  getPlanesAdmin,
  createPlanAdmin,
  updatePlanAdmin,
  deletePlanAdmin,
  type Plan,
} from "@/data/plans";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type ModalMode = "create" | "edit" | null;

type PlanForm = {
  id?: string;
  nombre: string;
  precio: number;
  tokens_mensuales: number;
};

const emptyForm: PlanForm = {
  nombre: "",
  precio: 0,
  tokens_mensuales: 1,
};

function formatPrice(n: number) {
  return "$" + n.toLocaleString("es-CL");
}

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPlanes = useCallback(async () => {
    const { planes, error } = await getPlanesAdmin();
    setPlanes(planes);
    if (error) setError(error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlanes(); }, [fetchPlanes]);

  const filtered = planes.filter(
    (p) => p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm(emptyForm); setError(null); };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (p: Plan) => {
    setForm({
      id: p.id,
      nombre: p.nombre,
      precio: p.precio,
      tokens_mensuales: p.tokens_mensuales,
    });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.nombre || form.precio <= 0 || form.tokens_mensuales <= 0) {
      setError("Nombre, precio y tokens son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre,
      precio: form.precio,
      tokens_mensuales: form.tokens_mensuales,
    };

    const res = modal === "create"
      ? await createPlanAdmin(payload)
      : await updatePlanAdmin({ ...payload, id: form.id! });

    if (!res.success) {
      setError(res.error || "Error al guardar");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModal(null);
    resetForm();
    if (modal === "create") {
      fetchPlanes();
    } else {
      setPlanes((prev) =>
        prev.map((p) =>
          p.id === form.id ? { ...p, nombre: form.nombre, precio: form.precio, tokens_mensuales: form.tokens_mensuales } : p
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este plan? Los alumnos con este plan quedarán sin referencia.")) return;
    setPlanes((prev) => prev.filter((p) => p.id !== id));
    await deletePlanAdmin(id);
  };

  if (loading && planes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#F28C28]" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="flex flex-col gap-6 w-full" style={{ maxWidth: "1216px" }}>

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Planes</h1>
              <p className="text-gray-500 text-sm mt-1">Administra los planes de membresía</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus size={16} />
                Nuevo Plan
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          {/* LISTA */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <span className="text-sm text-gray-500">{filtered.length} plan{filtered.length !== 1 ? "es" : ""}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                    <th className="p-3 font-semibold">Nombre</th>
                    <th className="p-3 font-semibold">Precio</th>
                    <th className="p-3 font-semibold">Tokens Mensuales</th>
                    <th className="p-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">
                        {search ? "No se encontraron planes" : "No hay planes creados aún"}
                      </td>
                    </tr>
                  ) : filtered.map((p) => {
                    return (
                      <tr key={p.id} className="border-b hover:bg-gray-50/50">
                        <td className="p-3 font-semibold text-gray-900">{p.nombre}</td>
                        <td className="p-3 font-semibold text-gray-900">{formatPrice(p.precio)}</td>
                        <td className="p-3 text-gray-600">
                          <span className="font-semibold">{p.tokens_mensuales}</span>
                          <span className="text-gray-400"> sesiones</span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(p.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* MODAL */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {modal === "create" ? "Nuevo Plan" : "Editar Plan"}
                </h2>
                <button onClick={() => { setModal(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Ej: Plan Premium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Precio */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Precio *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                      <input
                        type="number"
                        value={form.precio || ""}
                        onChange={(e) => setForm((p) => ({ ...p, precio: parseInt(e.target.value) || 0 }))}
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        min={0}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Tokens */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tokens Mensuales</label>
                    <input
                      type="number"
                      value={form.tokens_mensuales || ""}
                      onChange={(e) => setForm((p) => ({ ...p, tokens_mensuales: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                      min={1}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setModal(null); resetForm(); }}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {modal === "create" ? "Crear Plan" : "Guardar Cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar plan"
        message="¿Eliminar este plan? Los alumnos con este plan quedarán sin referencia."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
