"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Video, BookOpen } from "lucide-react";
import {
  getModulos,
  getCategorias,
  createModulo,
  updateModulo,
  deleteModulo,
  type Modulo,
  type Categoria,
} from "@/data/modulos";
import {
  Button,
  CLASE_INPUT,
  ConfirmDialog,
  DataTable,
  FormField,
  Modal,
  PageHeader,
  useAdminMutation,
  useToast,
  type Columna,
} from "@/components/admin/ui";

type ModalMode = "create" | "edit" | null;

type FormData = {
  id?: string;
  nombre: string;
  descripcion: string;
  categoria_id: string;
};

const emptyForm: FormData = { nombre: "", descripcion: "", categoria_id: "" };

const SIN_CATEGORIA = "—";

export default function ModulosPage() {
  const toast = useToast();
  const { ejecutar } = useAdminMutation();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const reintentar = () => {
    setLoading(true);
    fetchModulos();
  };
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Modulo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchModulos = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([getModulos(), getCategorias()]);
      setModulos(m);
      setCategorias(c);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchModulos(); }, [fetchModulos]);

  const q = search.toLowerCase().trim();
  const filtered = modulos.filter((m) => m.nombre.toLowerCase().includes(q) || m.categoria_nombre.toLowerCase().includes(q));

  const cerrarModal = () => {
    setModal(null);
    setForm(emptyForm);
    setError(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    setModal("create");
  };

  const openEdit = (m: Modulo) => {
    setForm({ id: m.id, nombre: m.nombre, descripcion: m.descripcion || "", categoria_id: m.categoria_id || "" });
    setError(null);
    setModal("edit");
  };

  const handleSave = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) return setError("El nombre del módulo es obligatorio");
    setSaving(true);
    setError(null);

    const descripcion = form.descripcion.trim();
    const res = modal === "create"
      ? await createModulo({ nombre, descripcion, categoria_id: form.categoria_id || undefined })
      // MOD-01: null deja el módulo sin categoría.
      : await updateModulo({ id: form.id!, nombre, descripcion, categoria_id: form.categoria_id || null });
    setSaving(false);
    if (!res.success) return setError(res.error || "Error al guardar");

    if (modal === "create") {
      toast.exito("Módulo creado");
      fetchModulos();
    } else {
      // MOD-01: la tabla mostraba la categoría anterior.
      const categoria_nombre = categorias.find((c) => c.id === form.categoria_id)?.nombre ?? SIN_CATEGORIA;
      const id = form.id;
      setModulos((prev) => prev.map((m) => (m.id === id ? { ...m, nombre, descripcion, categoria_id: form.categoria_id || null, categoria_nombre } : m)));
      toast.exito("Módulo actualizado");
    }
    cerrarModal();
  };

  const pedirEliminar = (m: Modulo) => {
    // La API lo rechaza igual (409): un módulo con cápsulas no se borra.
    if (m.total_capsulas > 0) {
      toast.error("No se puede eliminar el módulo", `Tiene ${m.total_capsulas} cápsula${m.total_capsulas === 1 ? "" : "s"}. Muévelas a otro módulo o elimínalas primero.`);
      return;
    }
    setDeleteTarget(m);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const m = deleteTarget;
    const anterior = modulos;
    setEliminando(true);
    setModulos((prev) => prev.filter((x) => x.id !== m.id));
    await ejecutar(() => deleteModulo(m.id), {
      exito: `Módulo ${m.nombre} eliminado`,
      error: "No se pudo eliminar el módulo",
      revertir: () => setModulos(anterior),
    });
    setEliminando(false);
    setDeleteTarget(null);
  };

  const acciones = (m: Modulo) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => openEdit(m)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar ${m.nombre}`}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => pedirEliminar(m)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar" aria-label={`Eliminar ${m.nombre}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  const categoriaBadge = (m: Modulo) =>
    m.categoria_id ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold whitespace-nowrap">
        <BookOpen size={12} aria-hidden /> {m.categoria_nombre}
      </span>
    ) : (
      <span className="text-xs text-gray-500">Sin categoría</span>
    );

  const columnas: Columna<Modulo>[] = [
    { id: "nombre", encabezado: "Nombre", celda: (m) => <span className="font-semibold text-gray-900">{m.nombre}</span>, valorOrden: (m) => m.nombre },
    {
      id: "descripcion",
      encabezado: "Descripción",
      celda: (m) => (m.descripcion ? <span className="text-gray-500 line-clamp-2 max-w-[320px]">{m.descripcion}</span> : <span className="text-gray-500">—</span>),
    },
    { id: "categoria", encabezado: "Categoría", celda: categoriaBadge, valorOrden: (m) => (m.categoria_id ? m.categoria_nombre : "") },
    {
      id: "capsulas",
      encabezado: "Cápsulas",
      celda: (m) => <span className="inline-flex items-center gap-1 text-gray-600"><Video size={14} aria-hidden /> {m.total_capsulas}</span>,
      valorOrden: (m) => m.total_capsulas,
    },
    { id: "acciones", encabezado: "Acciones", celda: acciones },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de módulos"
          descripcion="Organiza los módulos de aprendizaje y sus cápsulas por categoría."
          acciones={<Button icono={<Plus size={16} />} onClick={openCreate}>Nuevo módulo</Button>}
        >
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
            <input type="search" aria-label="Buscar módulo" placeholder="Buscar módulo o categoría..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${CLASE_INPUT} pl-9 py-2`} />
          </div>
        </PageHeader>

        <DataTable
          etiqueta="Módulos"
          filas={filtered}
          columnas={columnas}
          getId={(m) => m.id}
          cargando={loading}
          error={errorCarga}
          onReintentar={reintentar}
          resetKey={search}
          vacio={search ? "No se encontraron módulos" : "No hay módulos creados aún"}
          tarjetaMovil={(m) => (
            <div className="space-y-1.5">
              <p className="font-semibold text-sm text-gray-900">{m.nombre}</p>
              {m.descripcion && <p className="text-xs text-gray-500 line-clamp-2">{m.descripcion}</p>}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {categoriaBadge(m)}
                <span className="inline-flex items-center gap-1 text-gray-600"><Video size={12} aria-hidden /> {m.total_capsulas} cápsula{m.total_capsulas === 1 ? "" : "s"}</span>
              </div>
              {acciones(m)}
            </div>
          )}
        />
      </div>

      <Modal
        open={modal !== null}
        onClose={cerrarModal}
        title={modal === "create" ? "Nuevo módulo" : "Editar módulo"}
        bloquearCierre={saving}
        footer={
          <>
            <Button variante="secundario" onClick={cerrarModal} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} cargando={saving} textoCargando="Guardando...">{modal === "create" ? "Crear módulo" : "Guardar cambios"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre" required>
            {(p) => <input {...p} type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Módulo de Entrenamiento" className={CLASE_INPUT} />}
          </FormField>
          <FormField label="Descripción">
            {(p) => <textarea {...p} rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Describe el contenido del módulo..." className={`${CLASE_INPUT} resize-none`} />}
          </FormField>
          <FormField label="Categoría">
            {(p) => (
              <select {...p} value={form.categoria_id} onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))} className={CLASE_INPUT}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
          </FormField>
          {error && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        variante="peligro"
        title="Eliminar módulo"
        message={<>¿Eliminar el módulo <strong>{deleteTarget?.nombre}</strong>? No se puede deshacer.</>}
        consecuencias={["No tiene cápsulas, así que ningún alumno pierde contenido."]}
        confirmLabel="Eliminar"
        textoCargando="Eliminando..."
        cargando={eliminando}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
