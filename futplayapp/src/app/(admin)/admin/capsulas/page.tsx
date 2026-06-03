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
  Image,
  Hash,
  ExternalLink,
  PersonStanding,
} from "lucide-react";
import {
  getCapsulasAdmin,
  getModulosOptions,
  createCapsula,
  updateCapsula,
  deleteCapsula,
  type CapsulaAdmin,
  type ModuloOption,
} from "@/data/capsulas-admin";
import { getProfesoresDropdown, type ProfesorDropdown } from "@/data/profesores";

type ModalMode = "create" | "edit" | null;

type FormData = {
  id?: string;
  titulo: string;
  imagen: string;
  creado: string;
  duracion: string;
  modulo_id: string;
  profesor_id: string;
  bunny_video_id: string;
  order_index: number;
};

const emptyForm: FormData = {
  titulo: "",
  imagen: "",
  creado: "",
  duracion: "",
  modulo_id: "",
  profesor_id: "",
  bunny_video_id: "",
  order_index: 0,
};

export default function CapsulasPage() {
  const [capsulas, setCapsulas] = useState<CapsulaAdmin[]>([]);
  const [modulos, setModulos] = useState<ModuloOption[]>([]);
  const [profesores, setProfesores] = useState<ProfesorDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [c, m, p] = await Promise.all([getCapsulasAdmin(), getModulosOptions(), getProfesoresDropdown()]);
    setCapsulas(c);
    setModulos(m);
    setProfesores(p);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = capsulas.filter(
    (c) =>
      c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      c.modulo_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm(emptyForm); setError(null); };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (c: CapsulaAdmin) => {
    setForm({
      id: c.id,
      titulo: c.titulo,
      imagen: c.imagen,
      creado: c.creado,
      duracion: c.duracion || "",
      modulo_id: c.modulo_id || "",
      profesor_id: c.profesor_id || "",
      bunny_video_id: c.bunny_video_id || "",
      order_index: c.order_index ?? 0,
    });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.titulo) {
      setError("El título de la cápsula es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      titulo: form.titulo,
      imagen: form.imagen || undefined,
      creado: form.creado || undefined,
      duracion: form.duracion || undefined,
      modulo_id: form.modulo_id || undefined,
      profesor_id: form.profesor_id || undefined,
      bunny_video_id: form.bunny_video_id || undefined,
      order_index: form.order_index || undefined,
    };

    const res = modal === "create"
      ? await createCapsula(payload)
      : await updateCapsula({ ...payload, id: form.id! });

    if (!res.success) {
      setError(res.error || "Error al guardar");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModal(null);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar la cápsula "${titulo}"?`)) return;
    setError(null);

    const res = await deleteCapsula(id);
    if (!res.success) {
      setError(res.error || "Error al eliminar");
      return;
    }
    fetchData();
  };

  if (loading && capsulas.length === 0) {
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
            <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Cápsulas</h1>
            <p className="text-gray-500 text-sm mt-1">
              Administra las cápsulas de video y contenido E-learning
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            Nueva Cápsula
          </button>
        </div>

        {/* ─── TABLE ─── */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cápsula o módulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} cápsula{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                  <th className="p-3 font-semibold">Título</th>
                  <th className="p-3 font-semibold">Coach</th>
                  <th className="p-3 font-semibold">Duración</th>
                  <th className="p-3 font-semibold">Módulo</th>
                  <th className="p-3 font-semibold">Profesor</th>
                  <th className="p-3 font-semibold">Video ID</th>
                  <th className="p-3 font-semibold">Orden</th>
                  <th className="p-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      {search ? "No se encontraron cápsulas" : "No hay cápsulas creadas aún"}
                    </td>
                  </tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 rounded bg-gray-100 overflow-hidden shrink-0">
                          {c.imagen ? (
                            <img src={c.imagen} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Image size={14} />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">{c.titulo}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{c.creado || <span className="text-gray-300">—</span>}</td>
                    <td className="p-3 text-gray-600">{c.duracion || <span className="text-gray-300">—</span>}</td>
                    <td className="p-3">
                      {c.modulo_nombre ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">
                          <BookOpen size={12} />
                          {c.modulo_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {c.profesor_nombre ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">
                          <PersonStanding size={12} />
                          {c.profesor_nombre}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {c.bunny_video_id ? (
                        <a
                          href={`https://dash.bunny.net/stream/library/${c.bunny_video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-mono"
                        >
                          <Video size={12} />
                          {c.bunny_video_id.slice(0, 8)}...
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-gray-500 text-xs">
                        <Hash size={12} />
                        {c.order_index ?? 0}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.titulo)}
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
                {modal === "create" ? "Nueva Cápsula" : "Editar Cápsula"}
              </h2>
              <button onClick={() => { setModal(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ej: Técnicas de Regate"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">URL de Imagen (thumbnail)</label>
                <input
                  type="text"
                  value={form.imagen}
                  onChange={(e) => setForm((p) => ({ ...p, imagen: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Coach / Instructor</label>
                  <input
                    type="text"
                    value={form.creado}
                    onChange={(e) => setForm((p) => ({ ...p, creado: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Duración</label>
                  <input
                    type="text"
                    value={form.duracion}
                    onChange={(e) => setForm((p) => ({ ...p, duracion: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                    placeholder="00:45:00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Módulo</label>
                <select
                  value={form.modulo_id}
                  onChange={(e) => setForm((p) => ({ ...p, modulo_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">Sin módulo</option>
                  {modulos.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Profesor</label>
                <select
                  value={form.profesor_id}
                  onChange={(e) => setForm((p) => ({ ...p, profesor_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">Sin profesor asignado</option>
                  {profesores.map((pr) => (
                    <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Bunny Video ID</label>
                <input
                  type="text"
                  value={form.bunny_video_id}
                  onChange={(e) => setForm((p) => ({ ...p, bunny_video_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                  placeholder="GUID del video en Bunny Stream"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Orden</label>
                <input
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm((p) => ({ ...p, order_index: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="0"
                />
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
                {modal === "create" ? "Crear Cápsula" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
