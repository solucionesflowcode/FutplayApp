"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Pencil, Trash2, Ban, UserPlus, BookOpen, Video, Camera, Upload } from "lucide-react";
import {
  getProfesores,
  updateProfesor,
  deleteProfesor,
  quitarRolProfesor,
  searchUsuarioPorEmail,
  cambiarRolAProfesor,
  type Profesor,
  type UsuarioSearchResult,
} from "@/data/profesores";
import { telefonoParaGuardar } from "@/lib/telefono";
import { formatoTelefono } from "@/components/admin/StudentsTable";
import {
  Button,
  CLASE_INPUT,
  ConfirmDialog,
  DataTable,
  FormField,
  Modal,
  PageHeader,
  PhoneInput,
  useAdminMutation,
  useToast,
  type Columna,
} from "@/components/admin/ui";

type Accion = { tipo: "quitar" | "eliminar"; profesor: Profesor };

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { timeZone: "America/Santiago" });

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function Avatar({ p, size = "w-9 h-9 text-sm" }: { p: { nombre: string; foto_url?: string | null }; size?: string }) {
  return p.foto_url ? (
    <img src={p.foto_url} alt="" className={`${size} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${size} rounded-full bg-acento/10 flex items-center justify-center text-orange-800 font-bold shrink-0`} aria-hidden>
      {p.nombre.charAt(0).toUpperCase()}
    </div>
  );
}

const asignado = (p: Profesor) => p.clases.length + p.capsulas.length > 0;

export default function ProfesoresPage() {
  const toast = useToast();
  const { ejecutar } = useAdminMutation();
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const reintentar = () => {
    setLoading(true);
    fetchProfesores();
  };
  const [search, setSearch] = useState("");
  const [detalle, setDetalle] = useState<Profesor | null>(null);

  // Agregar profesor: busca un jugador por email y le da el rol (PRO-03).
  const [agregarAbierto, setAgregarAbierto] = useState(false);
  const [buscarEmail, setBuscarEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<UsuarioSearchResult[] | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [convertir, setConvertir] = useState<UsuarioSearchResult | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);

  // Edición
  const [editProfesor, setEditProfesor] = useState<Profesor | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", telefono: "" });
  const [editFotoUrl, setEditFotoUrl] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorEdit, setErrorEdit] = useState<string | null>(null);

  // Quitar rol / eliminar cuenta (PRO-01)
  const [accion, setAccion] = useState<Accion | null>(null);
  const [ejecutando, setEjecutando] = useState(false);

  const fetchProfesores = useCallback(async () => {
    try {
      const data = await getProfesores();
      setProfesores(data);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfesores(); }, [fetchProfesores]);

  const q = search.toLowerCase().trim();
  const filtered = profesores.filter((p) => p.nombre.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));

  const cerrarAgregar = () => {
    setAgregarAbierto(false);
    setBuscarEmail("");
    setResultados(null);
    setErrorBusqueda(null);
  };

  const handleBuscar = async () => {
    const texto = buscarEmail.trim();
    if (texto.length < 3) return setErrorBusqueda("Ingresa al menos 3 caracteres para buscar");
    setBuscando(true);
    setErrorBusqueda(null);
    setResultados(null);
    try {
      const encontrados = await searchUsuarioPorEmail(texto);
      setResultados(encontrados);
      if (encontrados.length === 0) setErrorBusqueda("No hay jugadores con ese email");
    } catch (err: unknown) {
      setErrorBusqueda(err instanceof Error ? err.message : "Error al buscar");
    } finally {
      setBuscando(false);
    }
  };

  const handleConvertir = async () => {
    if (!convertir) return;
    setConvirtiendo(true);
    const ok = await ejecutar(() => cambiarRolAProfesor(convertir.id), {
      exito: `${convertir.nombre} ahora es profesor`,
      error: "No se pudo cambiar el rol",
    });
    setConvirtiendo(false);
    setConvertir(null);
    if (ok) {
      cerrarAgregar();
      fetchProfesores();
    }
  };

  const cambiarPreview = (url: string | null) => {
    setEditPreview((anterior) => {
      if (anterior?.startsWith("blob:")) URL.revokeObjectURL(anterior);
      return url;
    });
  };

  const openEdit = (p: Profesor) => {
    setEditProfesor(p);
    setEditForm({ nombre: p.nombre, email: p.email, telefono: p.telefono || "" });
    setEditFotoUrl(p.foto_url || null);
    setEditFile(null);
    cambiarPreview(p.foto_url || null);
    setErrorEdit(null);
  };

  const cerrarEdit = () => {
    setEditProfesor(null);
    setEditFile(null);
    cambiarPreview(null);
    setErrorEdit(null);
  };

  const quitarFoto = () => {
    setEditFile(null);
    setEditFotoUrl(null);
    cambiarPreview(null);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setErrorEdit(data.error || "Error al subir la foto");
        return null;
      }
      return data.url;
    } catch {
      setErrorEdit("Error de conexión al subir la foto");
      return null;
    }
  };

  const handleEditSave = async () => {
    if (!editProfesor) return;
    const nombre = editForm.nombre.trim();
    const email = editForm.email.trim();
    if (!nombre || !email) return setErrorEdit("Nombre y email son obligatorios");
    // PRO-02: mismo formato que los alumnos; vacío borra el teléfono.
    const telefono = telefonoParaGuardar(editForm.telefono);
    if (telefono && typeof telefono === "object") return setErrorEdit(telefono.error);

    setSaving(true);
    setErrorEdit(null);
    let fotoUrl = editFotoUrl;
    if (editFile) {
      fotoUrl = await uploadFile(editFile);
      if (!fotoUrl) return setSaving(false);
    }

    const res = await updateProfesor({ id: editProfesor.id, nombre, email, telefono, foto_url: fotoUrl });
    setSaving(false);
    if (!res.success) return setErrorEdit(res.error || "Error al guardar");

    const id = editProfesor.id;
    setProfesores((prev) => prev.map((p) => (p.id === id ? { ...p, nombre, email, telefono: telefono ?? "", foto_url: fotoUrl ?? "" } : p)));
    toast.exito("Profesor actualizado");
    cerrarEdit();
  };

  const pedirAccion = (tipo: Accion["tipo"], p: Profesor) => {
    // Con clases o cápsulas asignadas no se puede: la API lo rechaza igual (409).
    if (asignado(p)) {
      toast.error(
        tipo === "quitar" ? "No se puede quitar el rol" : "No se puede eliminar la cuenta",
        `${p.nombre} tiene ${plural(p.clases.length, "clase", "clases")} y ${plural(p.capsulas.length, "cápsula", "cápsulas")} asignadas. Reasígnalas primero.`
      );
      return;
    }
    setAccion({ tipo, profesor: p });
  };

  const handleAccion = async () => {
    if (!accion) return;
    const { tipo, profesor: p } = accion;
    const anterior = profesores;
    setEjecutando(true);
    setProfesores((prev) => prev.filter((x) => x.id !== p.id));
    await ejecutar(() => (tipo === "quitar" ? quitarRolProfesor(p.id) : deleteProfesor(p.id)), {
      exito: tipo === "quitar" ? `${p.nombre} ya no es profesor: su cuenta sigue como jugador` : `Cuenta de ${p.nombre} eliminada`,
      error: tipo === "quitar" ? "No se pudo quitar el rol" : "No se pudo eliminar la cuenta",
      revertir: () => setProfesores(anterior),
    });
    setEjecutando(false);
    setAccion(null);
  };

  const asignacionesBoton = (p: Profesor) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setDetalle(p); }}
      disabled={!asignado(p)}
      className="inline-flex items-center gap-2 text-xs font-semibold disabled:cursor-default"
      aria-label={`Ver clases y cápsulas de ${p.nombre}`}
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg"><BookOpen size={12} aria-hidden /> {plural(p.clases.length, "clase", "clases")}</span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg"><Video size={12} aria-hidden /> {plural(p.capsulas.length, "cápsula", "cápsulas")}</span>
    </button>
  );

  const acciones = (p: Profesor) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => openEdit(p)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar ${p.nombre}`}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => pedirAccion("quitar", p)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Quitar rol de profesor" aria-label={`Quitar rol de profesor a ${p.nombre}`}>
        <Ban size={16} />
      </button>
      <button type="button" onClick={() => pedirAccion("eliminar", p)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar cuenta" aria-label={`Eliminar cuenta de ${p.nombre}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columnas: Columna<Profesor>[] = [
    {
      id: "nombre",
      encabezado: "Profesor",
      celda: (p) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar p={p} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{p.nombre}</p>
            <p className="text-xs text-gray-500 truncate">{p.email}</p>
          </div>
        </div>
      ),
      valorOrden: (p) => p.nombre,
    },
    { id: "telefono", encabezado: "Teléfono", celda: (p) => <span className="whitespace-nowrap text-gray-600">{formatoTelefono(p.telefono)}</span> },
    { id: "asignaciones", encabezado: "Asignaciones", celda: asignacionesBoton, valorOrden: (p) => p.clases.length + p.capsulas.length },
    { id: "registro", encabezado: "Registro", celda: (p) => <span className="whitespace-nowrap text-gray-600">{fechaCorta(p.created_at)}</span>, valorOrden: (p) => p.created_at },
    { id: "acciones", encabezado: "Acciones", celda: acciones },
  ];

  const quitando = accion?.tipo === "quitar";

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de profesores"
          descripcion="Profesores que dictan clases y cápsulas. Para agregar uno, busca su cuenta de jugador."
          acciones={<Button icono={<UserPlus size={16} />} onClick={() => setAgregarAbierto(true)}>Agregar profesor</Button>}
        >
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
            <input type="search" aria-label="Buscar profesor" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${CLASE_INPUT} pl-9 py-2`} />
          </div>
        </PageHeader>

        <DataTable
          etiqueta="Profesores"
          filas={filtered}
          columnas={columnas}
          getId={(p) => p.id}
          cargando={loading}
          error={errorCarga}
          onReintentar={reintentar}
          resetKey={search}
          vacio={search ? "No se encontraron profesores" : "No hay profesores registrados aún"}
          tarjetaMovil={(p) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar p={p} size="w-8 h-8 text-xs" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{p.email} · {formatoTelefono(p.telefono)}</p>
                </div>
              </div>
              {asignacionesBoton(p)}
              {acciones(p)}
            </div>
          )}
        />
      </div>

      {/* Agregar profesor */}
      <Modal
        open={agregarAbierto}
        onClose={cerrarAgregar}
        title="Agregar profesor"
        description="Busca la cuenta de un jugador por su email. Solo los jugadores pueden pasar a ser profesores."
        footer={<Button variante="secundario" onClick={cerrarAgregar}>Cerrar</Button>}
      >
        <form
          className="flex gap-2 items-end"
          onSubmit={(e) => { e.preventDefault(); handleBuscar(); }}
        >
          <div className="flex-1">
            <FormField label="Email">
              {(p) => <input {...p} type="search" value={buscarEmail} onChange={(e) => setBuscarEmail(e.target.value)} placeholder="correo@ejemplo.com" className={CLASE_INPUT} />}
            </FormField>
          </div>
          <Button type="submit" icono={<Search size={16} />} cargando={buscando} textoCargando="Buscando...">Buscar</Button>
        </form>
        {errorBusqueda && <p role="alert" className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errorBusqueda}</p>}
        {resultados && resultados.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded-lg" aria-label="Jugadores encontrados">
            {resultados.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{u.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <Button variante="secundario" icono={<UserPlus size={14} />} onClick={() => setConvertir(u)} aria-label={`Hacer profesor a ${u.nombre}`}>
                  Hacer profesor
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={convertir !== null}
        variante="info"
        title="Hacer profesor"
        message={<>¿Dar el rol de profesor a <strong>{convertir?.nombre}</strong> ({convertir?.email})?</>}
        consecuencias={[
          "Podrá ser asignado a clases y cápsulas.",
          "Entra al portal de profesor en vez del de jugador.",
          "Sus membresías y reservas no cambian.",
        ]}
        confirmLabel="Hacer profesor"
        textoCargando="Guardando..."
        cargando={convirtiendo}
        onConfirm={handleConvertir}
        onCancel={() => setConvertir(null)}
      />

      {/* Clases y cápsulas asignadas */}
      <Modal
        open={detalle !== null}
        onClose={() => setDetalle(null)}
        title="Asignaciones"
        description={detalle?.nombre}
        cerrarConFondo
        footer={<Button variante="secundario" onClick={() => setDetalle(null)}>Cerrar</Button>}
      >
        <div className="space-y-4">
          {detalle && detalle.clases.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Clases que imparte</h3>
              <ul className="flex flex-wrap gap-2">
                {detalle.clases.map((c) => (
                  <li key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs"><BookOpen size={11} aria-hidden /> {c.titulo}</li>
                ))}
              </ul>
            </section>
          )}
          {detalle && detalle.capsulas.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Cápsulas que dirige</h3>
              <ul className="flex flex-wrap gap-2">
                {detalle.capsulas.map((c) => (
                  <li key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs"><Video size={11} aria-hidden /> {c.titulo}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Modal>

      {/* Editar */}
      <Modal
        open={editProfesor !== null}
        onClose={cerrarEdit}
        title="Editar profesor"
        bloquearCierre={saving}
        footer={
          <>
            <Button variante="secundario" onClick={cerrarEdit} disabled={saving}>Cancelar</Button>
            <Button onClick={handleEditSave} cargando={saving} textoCargando="Guardando...">Guardar cambios</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nombre" required>
            {(p) => <input {...p} type="text" value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))} className={CLASE_INPUT} />}
          </FormField>
          <FormField label="Email" required ayuda="También cambia el email con el que inicia sesión.">
            {(p) => <input {...p} type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className={CLASE_INPUT} />}
          </FormField>
          <FormField label="Teléfono" ayuda="Déjalo vacío para quitarlo.">
            {(p) => <PhoneInput {...p} value={editForm.telefono} onChange={(t) => setEditForm((f) => ({ ...f, telefono: t }))} />}
          </FormField>
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">Foto</p>
            <div className="flex items-center gap-4">
              {editPreview ? (
                <img src={editPreview} alt="Foto del profesor" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200" aria-hidden>
                  <Camera size={24} />
                </div>
              )}
              <label className="flex-1 min-w-0 cursor-pointer">
                <span className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg hover:border-marca hover:bg-blue-50/50 transition-colors">
                  <Upload size={16} className="text-gray-500 shrink-0" aria-hidden />
                  <span className="text-sm text-gray-600 truncate">{editFile ? editFile.name : "Seleccionar imagen..."}</span>
                </span>
                <input
                  type="file"
                  aria-label="Subir foto"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditFile(file);
                      cambiarPreview(URL.createObjectURL(file));
                      e.target.value = "";
                    }
                  }}
                  className="sr-only"
                />
              </label>
              {editPreview && (
                <Button variante="fantasma" onClick={quitarFoto}>Quitar foto</Button>
              )}
            </div>
          </div>
          {errorEdit && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errorEdit}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={accion !== null}
        variante={quitando ? "advertencia" : "peligro"}
        title={quitando ? "Quitar rol de profesor" : "Eliminar cuenta"}
        message={
          quitando
            ? <>¿Quitar el rol de profesor a <strong>{accion?.profesor.nombre}</strong>?</>
            : <>¿Eliminar la cuenta de <strong>{accion?.profesor.nombre}</strong>? No se puede deshacer.</>
        }
        consecuencias={
          quitando
            ? ["Vuelve a ser jugador: conserva su cuenta, membresías y reservas.", "Ya no se le pueden asignar clases ni cápsulas."]
            : [
                "Se borra su cuenta y ya no puede iniciar sesión.",
                "También se borran sus membresías, boletas, reservas y ficha médica.",
                "Si solo debe dejar de ser profesor, usa “Quitar rol de profesor”.",
              ]
        }
        confirmLabel={quitando ? "Quitar rol" : "Eliminar cuenta"}
        textoCargando={quitando ? "Quitando..." : "Eliminando..."}
        cargando={ejecutando}
        onConfirm={handleAccion}
        onCancel={() => setAccion(null)}
      />
    </div>
  );
}
