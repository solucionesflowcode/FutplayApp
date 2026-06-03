"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  BookOpen,
  Video,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Upload,
  Camera,
} from "lucide-react";
import {
  getProfesores,
  createProfesor,
  updateProfesor,
  deleteProfesor,
  type Profesor,
} from "@/data/profesores";

type ModalMode = "create" | "edit" | null;

type FormData = {
  id?: string;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  foto_url: string;
};

const emptyForm: FormData = {
  nombre: "",
  email: "",
  telefono: "",
  especialidad: "",
  foto_url: "",
};

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  const fetchProfesores = useCallback(async () => {
    const data = await getProfesores();
    setProfesores(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfesores(); }, [fetchProfesores]);

  const filtered = profesores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm(emptyForm);
    setError(null);
    setTempPassword(null);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = (p: Profesor) => {
    setForm({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      telefono: p.telefono,
      especialidad: p.especialidad,
      foto_url: p.foto_url,
    });
    setSelectedFile(null);
    setFilePreview(p.foto_url || null);
    setModal("edit");
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setFileUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al subir imagen");
        return null;
      }
      return data.url;
    } catch {
      setError("Error de conexión al subir imagen");
      return null;
    } finally {
      setFileUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.nombre || !form.email) {
      setError("Nombre y email son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);

    let fotoUrl = form.foto_url;

    if (selectedFile) {
      const uploaded = await uploadFile(selectedFile);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      fotoUrl = uploaded;
    }

    if (modal === "create") {
      const res = await createProfesor({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        especialidad: form.especialidad || undefined,
        foto_url: fotoUrl || undefined,
      });

      if (!res.success) {
        setError(res.error || "Error al crear profesor");
        setSaving(false);
        return;
      }

      setTempPassword(res.tempPassword || null);
      setSaving(false);
      fetchProfesores();
    } else {
      const res = await updateProfesor({
        id: form.id!,
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono || undefined,
        especialidad: form.especialidad || undefined,
        foto_url: fotoUrl || undefined,
      });

      if (!res.success) {
        setError(res.error || "Error al guardar");
        setSaving(false);
        return;
      }

      setSaving(false);
      setModal(null);
      resetForm();
      fetchProfesores();
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al profesor "${nombre}"?`)) return;
    setError(null);

    const res = await deleteProfesor(id);
    if (!res.success) {
      setError(res.error || "Error al eliminar");
      return;
    }
    fetchProfesores();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading && profesores.length === 0) {
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
            <h1 className="text-2xl font-extrabold text-gray-900">Profesores</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gestiona los profesores y entrenadores de la academia
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            Nuevo Profesor
          </button>
        </div>

        {/* ─── TABLE ─── */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar profesor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} profesor{filtered.length !== 1 ? "es" : ""}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                  <th className="p-3 font-semibold">Nombre</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Teléfono</th>
                  <th className="p-3 font-semibold">Especialidad</th>
                  <th className="p-3 font-semibold">Clases</th>
                  <th className="p-3 font-semibold">Cápsulas</th>
                  <th className="p-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      {search ? "No se encontraron profesores" : "No hay profesores registrados aún"}
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="border-b hover:bg-gray-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {p.foto_url ? (
                            <img src={p.foto_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#F28C28]/10 flex items-center justify-center text-[#F28C28] font-bold text-sm shrink-0">
                              {p.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{p.nombre}</span>
                              {p.especialidad && (
                                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-semibold">
                                  {p.especialidad}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {new Date(p.created_at).toLocaleDateString("es-CL")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Mail size={13} />
                          {p.email || <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Phone size={13} />
                          {p.telefono || <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                      <td className="p-3">
                        {p.especialidad ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
                            {p.especialidad}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors " + (p.total_clases > 0 ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-400")}
                        >
                          <BookOpen size={13} />
                          {p.total_clases}
                          {p.total_clases > 0 && (
                            expandedId === p.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold " + (p.total_capsulas > 0 ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-400")}>
                          <Video size={13} />
                          {p.total_capsulas}
                        </span>
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
                            onClick={() => handleDelete(p.id, p.nombre)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* ─── EXPANDED ROW: clases asociadas ─── */}
                    {expandedId === p.id && p.clases.length > 0 && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={6} className="p-3 pl-12">
                          <div className="text-xs font-semibold text-gray-500 mb-2">Clases que imparte:</div>
                          <div className="flex flex-wrap gap-2">
                            {p.clases.map((clase) => (
                              <span
                                key={clase.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs"
                              >
                                <BookOpen size={11} />
                                {clase.titulo}
                              </span>
                            ))}
                          </div>
                          {p.capsulas.length > 0 && (
                            <>
                              <div className="text-xs font-semibold text-gray-500 mt-3 mb-2">Cápsulas que dirige:</div>
                              <div className="flex flex-wrap gap-2">
                                {p.capsulas.map((capsula) => (
                                  <span
                                    key={capsula.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs"
                                  >
                                    <Video size={11} />
                                    {capsula.titulo}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
                {modal === "create" ? "Nuevo Profesor" : "Editar Profesor"}
              </h2>
              <button onClick={() => { setModal(null); resetForm(); fetchProfesores(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="profesor@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Especialidad</label>
                <input
                  type="text"
                  value={form.especialidad}
                  onChange={(e) => setForm((p) => ({ ...p, especialidad: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ej: Entrenador de arqueros, Preparador físico..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Foto de perfil</label>
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                        <Camera size={24} />
                      </div>
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                      <Upload size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : "Seleccionar archivo..."}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          setSelectedFile(file);
                          setFilePreview(URL.createObjectURL(file));
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {filePreview && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                        setForm((p) => ({ ...p, foto_url: "" }));
                      }}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {tempPassword && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 text-xs font-semibold mb-1">
                    <KeyRound size={14} />
                    Profesor creado exitosamente
                  </div>
                  <p className="text-xs text-green-600 mb-1">Contraseña temporal:</p>
                  <code className="block p-2 bg-white rounded border border-green-200 text-sm font-mono text-gray-800 select-all">{tempPassword}</code>
                  <p className="text-xs text-green-600 mt-1">El profesor debe cambiar su contraseña al iniciar sesión.</p>
                  <button
                    onClick={() => { setModal(null); resetForm(); }}
                    className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            {!tempPassword && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setModal(null); resetForm(); fetchProfesores(); }}
                  disabled={saving || fileUploading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || fileUploading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {(saving || fileUploading) && <Loader2 size={14} className="animate-spin" />}
                  {fileUploading ? "Subiendo imagen..." : saving ? "Guardando..." : modal === "create" ? "Crear Profesor" : "Guardar Cambios"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
