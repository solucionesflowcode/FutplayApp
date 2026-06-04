"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Search,
  X,
  Loader2,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Video,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  UserCheck,
  UserPlus,
  Camera,
  Upload,
} from "lucide-react";
import {
  getProfesores,
  updateProfesor,
  deleteProfesor,
  searchUsuarioPorEmail,
  cambiarRolAProfesor,
  type Profesor,
  type UsuarioSearchResult,
} from "@/data/profesores";

export default function ProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search user by email
  const [buscarEmail, setBuscarEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<UsuarioSearchResult[] | null>(null);
  const [convertiendoId, setConvirtiendoId] = useState<string | null>(null);

  // Edit modal state
  const [editProfesor, setEditProfesor] = useState<Profesor | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", telefono: "" });
  const [editFotoUrl, setEditFotoUrl] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handleBuscar = async () => {
    if (!buscarEmail.trim() || buscarEmail.trim().length < 3) {
      setError("Ingresa al menos 3 caracteres para buscar");
      return;
    }
    setBuscando(true);
    setError(null);
    setSuccess(null);
    setResultadosBusqueda(null);
    try {
      const resultados = await searchUsuarioPorEmail(buscarEmail.trim());
      setResultadosBusqueda(resultados);
      if (resultados.length === 0) {
        setError("No se encontraron usuarios con ese email");
      }
    } catch (err: any) {
      setError(err.message || "Error al buscar");
    } finally {
      setBuscando(false);
    }
  };

  const handleConvertir = async (id: string) => {
    setConvirtiendoId(id);
    setError(null);
    setSuccess(null);
    const res = await cambiarRolAProfesor(id);
    if (!res.success) {
      setError(res.error || "Error al cambiar rol");
    } else {
      setSuccess("Usuario convertido a profesor exitosamente");
      setResultadosBusqueda(null);
      setBuscarEmail("");
      fetchProfesores();
    }
    setConvirtiendoId(null);
  };

  const openEdit = (p: Profesor) => {
    setEditProfesor(p);
    setEditForm({ nombre: p.nombre, email: p.email, telefono: p.telefono });
    setEditFotoUrl(p.foto_url);
    setEditFile(null);
    setEditPreview(p.foto_url || null);
    setError(null);
    setSuccess(null);
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

  const handleEditSave = async () => {
    if (!editProfesor) return;
    if (!editForm.nombre || !editForm.email) {
      setError("Nombre y email son obligatorios");
      return;
    }
    setSaving(true);
    setError(null);

    let fotoUrl = editFotoUrl;
    if (editFile) {
      const uploaded = await uploadFile(editFile);
      if (!uploaded) {
        setSaving(false);
        return;
      }
      fotoUrl = uploaded;
    }

    const res = await updateProfesor({
      id: editProfesor.id,
      nombre: editForm.nombre,
      email: editForm.email,
      telefono: editForm.telefono || undefined,
      foto_url: fotoUrl || undefined,
    });

    if (!res.success) {
      setError(res.error || "Error al guardar");
    } else {
      setEditProfesor(null);
      setSuccess("Profesor actualizado exitosamente");
      fetchProfesores();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al profesor "${nombre}"?`)) return;
    setError(null);
    setSuccess(null);
    const res = await deleteProfesor(id);
    if (!res.success) {
      setError(res.error || "Error al eliminar");
      return;
    }
    setSuccess("Profesor eliminado exitosamente");
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
        </div>

        {/* ─── BUSCAR USUARIO POR EMAIL ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <UserPlus size={16} />
            Agregar profesor por email
          </h2>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Buscar usuario por email..."
                value={buscarEmail}
                onChange={(e) => setBuscarEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={handleBuscar}
              disabled={buscando}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Buscar
            </button>
          </div>

          {/* ─── RESULTADOS DE BÚSQUEDA ─── */}
          {resultadosBusqueda !== null && resultadosBusqueda.length > 0 && (
            <div className="mt-4 border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                    <th className="p-3 font-semibold">Nombre</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">Rol actual</th>
                    <th className="p-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosBusqueda.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="p-3 font-medium text-gray-900">{u.nombre}</td>
                      <td className="p-3 text-gray-600">{u.email}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold capitalize">
                          {u.rol}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleConvertir(u.id)}
                          disabled={convertiendoId === u.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          {convertiendoId === u.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <UserCheck size={14} />
                          )}
                          Convertir a Profesor
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── MENSAJES ─── */}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
            {success}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {/* ─── TABLA DE PROFESORES ─── */}
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
                  <th className="p-3 font-semibold">Clases</th>
                  <th className="p-3 font-semibold">Cápsulas</th>
                  <th className="p-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
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
                            <span className="font-semibold text-gray-900">{p.nombre}</span>
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
                    {expandedId === p.id && p.clases.length > 0 && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={5} className="p-3 pl-12">
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
      </div>

      {/* ─── MODAL EDITAR ─── */}
      {editProfesor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Editar Profesor</h2>
              <button onClick={() => { setEditProfesor(null); setError(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="profesor@email.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={editForm.telefono}
                  onChange={(e) => setEditForm((p) => ({ ...p, telefono: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Foto de perfil</label>
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    {editPreview ? (
                      <img src={editPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
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
                        {editFile ? editFile.name : "Seleccionar archivo..."}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          setEditFile(file);
                          setEditPreview(URL.createObjectURL(file));
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {editPreview && (
                    <button
                      onClick={() => {
                        setEditFile(null);
                        setEditPreview(null);
                        setEditFotoUrl("");
                      }}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => { setEditProfesor(null); setError(null); }}
                disabled={saving || fileUploading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving || fileUploading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {(saving || fileUploading) && <Loader2 size={14} className="animate-spin" />}
                {fileUploading ? "Subiendo imagen..." : saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
