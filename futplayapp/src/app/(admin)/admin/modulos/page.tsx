"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Video,
  BookOpen,
} from "lucide-react";
import {
  getModulos,
  getCategorias,
  createModulo,
  updateModulo,
  deleteModulo,
  type Modulo,
  type Categoria,
} from "@/data/modulos";

type ModalMode = "create" | "edit" | null;

type FormData = {
  id?: string;
  nombre: string;
  descripcion: string;
  categoria_id: string;
};

const emptyForm: FormData = {
  nombre: "",
  descripcion: "",
  categoria_id: "",
};

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModulos = useCallback(async () => {
    const [m, c] = await Promise.all([getModulos(), getCategorias()]);
    setModulos(m);
    setCategorias(c);
    setLoading(false);
  }, []);

  useEffect(() => { fetchModulos(); }, [fetchModulos]);

  const filtered = modulos.filter(
    (m) =>
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.categoria_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm(emptyForm); setError(null); };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (m: Modulo) => {
    setForm({
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion,
      categoria_id: m.categoria_id || "",
    });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.nombre) {
      setError("El nombre del módulo es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      categoria_id: form.categoria_id || undefined,
    };

    const res = modal === "create"
      ? await createModulo(payload)
      : await updateModulo({ ...payload, id: form.id! });

    if (!res.success) {
      setError(res.error || "Error al guardar");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModal(null);
    resetForm();
    fetchModulos();
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el módulo "${nombre}"?`)) return;
    setError(null);

    const res = await deleteModulo(id);
    if (!res.success) {
      setError(res.error || "Error al eliminar");
      return;
    }
    fetchModulos();
  };

  if (loading && modulos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#F28C28]" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6 w-full" style={{ maxWidth: "1216px" }}>

        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Módulos</h1>
            <p className="text-gray-500 text-sm mt-1">
              Organiza los módulos de aprendizaje y sus cápsulas por categoría
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            Nuevo Módulo
          </button>
        </div>

        {/* ─── TABLE ─── */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar módulo o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} módulo{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                  <th className="p-3 font-semibold">Nombre</th>
                  <th className="p-3 font-semibold">Descripción</th>
                  <th className="p-3 font-semibold">Categoría</th>
                  <th className="p-3 font-semibold">Cápsulas</th>
                  <th className="p-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      {search ? "No se encontraron módulos" : "No hay módulos creados aún"}
                    </td>
                  </tr>
                ) : filtered.map((m) => (
                  <tr key={m.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-900">{m.nombre}</td>
                    <td className="p-3 text-gray-500 max-w-[280px] truncate">
                      {m.descripcion || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                        <BookOpen size={12} />
                        {m.categoria_nombre}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Video size={14} />
                        {m.total_capsulas}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.nombre)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
      </div>

      {/* ─── MODAL ─── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {modal === "create" ? "Nuevo Módulo" : "Editar Módulo"}
              </h2>
              <button onClick={() => { setModal(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ej: Módulo de Entrenamiento"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                  rows={3}
                  placeholder="Describe el contenido del módulo..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría</label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm((p) => ({ ...p, categoria_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
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
                {modal === "create" ? "Crear Módulo" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
