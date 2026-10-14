"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Image as ImageIcon,
  BookOpen,
  PersonStanding,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  TriangleAlert,
} from "lucide-react";
import {
  getCapsulasAdmin,
  getModulosOptions,
  createCapsula,
  updateCapsula,
  deleteCapsula,
  descartarVideoSubido,
  setCapsulaDestacada,
  type CapsulaAdmin,
  type ModuloOption,
} from "@/data/capsulas-admin";
import { getProfesoresDropdown, type ProfesorDropdown } from "@/data/profesores";
import { getDocumentosByCapsula, createDocumento, deleteDocumento } from "@/data/documentos-admin";
import {
  Button,
  CLASE_INPUT,
  ConfirmDialog,
  DataTable,
  FormField,
  Modal,
  NumberInput,
  PageHeader,
  useAdminMutation,
  useToast,
  type Columna,
} from "@/components/admin/ui";

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
  order_index: number | null;
  descripcion: string;
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
  descripcion: "",
};

type Subida = { progreso: number; estado: string } | null;
type DocPendiente = { filePath: string; nombre: string };
type DocExistente = { id: string; nombre: string };

const EXTENSIONES_VIDEO = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".ogg", ".wmv"];
const IMAGENES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DURACION = /^\d{1,2}(:\d{2}){1,2}$/;
const PASOS = ["Información", "Video y material", "Configuración"];

/** Error de una subida cancelada a propósito: no se muestra. */
class SubidaCancelada extends Error {}

function extraerIdBunny(input: string): string | null {
  const texto = input.trim();
  const guid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  return texto.match(guid)?.[0] ?? null;
}

/**
 * Sube con XHR para tener el progreso. El XHR queda en `ref` para poder
 * abortarlo al cerrar el formulario (CAP-02).
 */
function subirConXhr(
  ref: { current: XMLHttpRequest | null },
  metodo: "POST" | "PUT",
  url: string,
  cuerpo: XMLHttpRequestBodyInit,
  onProgreso: (n: number) => void,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    ref.current = xhr;
    xhr.open(metodo, url, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      ref.current = null;
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* respuesta vacía */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error((data.error as string) || `Error en la subida (código ${xhr.status})`));
    };
    xhr.onerror = () => { ref.current = null; reject(new Error("Error de red durante la subida")); };
    xhr.onabort = () => { ref.current = null; reject(new SubidaCancelada()); };
    xhr.send(cuerpo);
  });
}

function Estrella({ llena, size }: { llena: boolean; size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={llena ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function BarraSubida({ subida, color = "bg-marca" }: { subida: NonNullable<Subida>; color?: string }) {
  return (
    <div className="bg-blue-50/50 border border-blue-200 rounded p-5 text-center space-y-3" role="status">
      <Loader2 className="animate-spin text-marca mx-auto" size={24} aria-hidden />
      <p className="text-sm font-semibold text-blue-900">{subida.estado}</p>
      <div className="max-w-md mx-auto bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div className={`${color} h-2.5 rounded-full transition-all duration-300`} style={{ width: `${subida.progreso}%` }} />
      </div>
      <p className="text-xs text-marca font-bold">{subida.progreso}% subido</p>
    </div>
  );
}

function ZonaArchivo({ id, accept, titulo, ayuda, onArchivo }: { id: string; accept: string; titulo: string; ayuda: string; onArchivo: (f: File) => void }) {
  const [arrastrando, setArrastrando] = useState(false);
  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={(e) => { e.preventDefault(); setArrastrando(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onArchivo(f);
      }}
      className={`border-2 border-dashed rounded p-6 text-center transition-all ${arrastrando ? "border-marca bg-blue-50/50" : "border-gray-300 hover:border-marca bg-gray-50/30"}`}
    >
      <input
        type="file"
        id={id}
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
          e.target.value = "";
        }}
        className="sr-only"
      />
      <label htmlFor={id} className="cursor-pointer flex flex-col items-center gap-2">
        <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-marca"><Upload size={20} aria-hidden /></span>
        <span className="text-sm font-bold text-gray-700">{titulo}</span>
        <span className="text-xs text-gray-500">{ayuda}</span>
      </label>
    </div>
  );
}

export default function CapsulasPage() {
  const toast = useToast();
  const { ejecutar } = useAdminMutation();
  const [capsulas, setCapsulas] = useState<CapsulaAdmin[]>([]);
  const [modulos, setModulos] = useState<ModuloOption[]>([]);
  const [profesores, setProfesores] = useState<ProfesorDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showManualId, setShowManualId] = useState(false);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  // Subidas
  const [subidaVideo, setSubidaVideo] = useState<Subida>(null);
  const [subidaMiniatura, setSubidaMiniatura] = useState<Subida>(null);
  const [subidaDocumento, setSubidaDocumento] = useState<Subida>(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const xhrVideo = useRef<XMLHttpRequest | null>(null);
  const xhrMiniatura = useRef<XMLHttpRequest | null>(null);
  const xhrDocumento = useRef<XMLHttpRequest | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // CAP-02: video subido en este formulario que aún no se guarda. Si se cancela
  // o se reemplaza, se borra de Bunny para no dejarlo huérfano.
  const videoSinGuardar = useRef<string | null>(null);

  // Documento PDF: el actual solo se borra al guardar (antes se borraba al
  // instante, aunque después se cancelara el formulario).
  const [pendingDoc, setPendingDoc] = useState<DocPendiente | null>(null);
  const [existingDoc, setExistingDoc] = useState<DocExistente | null>(null);
  const [docAEliminar, setDocAEliminar] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CapsulaAdmin | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [togglingDestacada, setTogglingDestacada] = useState<string | null>(null);

  const subiendo = subidaVideo !== null || subidaMiniatura !== null || subidaDocumento !== null;

  const fetchData = useCallback(async () => {
    const [c, m, p] = await Promise.all([getCapsulasAdmin(), getModulosOptions(), getProfesoresDropdown()]);
    setCapsulas(c);
    setModulos(m);
    setProfesores(p);
    setLoading(false);
  }, []);

  const detenerPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  useEffect(() => {
    fetchData();
    return () => detenerPolling();
  }, [fetchData]);

  // CAP-02: avisar antes de salir de la página con una subida en curso o un video sin guardar.
  const hayTrabajoSinGuardar = subiendo || (modal !== null && form.bunny_video_id !== "" && form.bunny_video_id === videoSinGuardar.current);
  useEffect(() => {
    if (!hayTrabajoSinGuardar) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayTrabajoSinGuardar]);

  const q = search.toLowerCase().trim();
  const filtered = capsulas.filter((c) => c.titulo.toLowerCase().includes(q) || c.modulo_nombre.toLowerCase().includes(q));

  const resetForm = () => {
    setForm(emptyForm);
    setError(null);
    setCurrentStep(1);
    setShowManualId(false);
    setConfirmarCierre(false);
    setSubidaVideo(null);
    setSubidaMiniatura(null);
    setSubidaDocumento(null);
    setVideoProcessing(false);
    setEncodeProgress(0);
    setPendingDoc(null);
    setExistingDoc(null);
    setDocAEliminar(null);
    videoSinGuardar.current = null;
    detenerPolling();
  };

  /** Descarta el formulario: aborta las subidas y borra el video no guardado. */
  const descartarFormulario = () => {
    xhrVideo.current?.abort();
    xhrMiniatura.current?.abort();
    xhrDocumento.current?.abort();
    if (videoSinGuardar.current) descartarVideoSubido(videoSinGuardar.current);
    resetForm();
    setModal(null);
  };

  const cerrarWizard = () => {
    if (saving) return;
    if (subiendo) {
      setConfirmarCierre(true);
      return;
    }
    descartarFormulario();
  };

  const openCreate = () => {
    resetForm();
    setModal("create");
  };

  const openEdit = async (c: CapsulaAdmin) => {
    resetForm();
    setForm({
      id: c.id,
      titulo: c.titulo,
      imagen: c.imagen || "",
      creado: c.creado || "",
      duracion: c.duracion || "",
      modulo_id: c.modulo_id || "",
      profesor_id: c.profesor_id || "",
      bunny_video_id: c.bunny_video_id || "",
      order_index: c.order_index ?? 0,
      descripcion: c.descripcion || "",
    });
    setShowManualId(true);
    setModal("edit");
    const docs = await getDocumentosByCapsula(c.id);
    if (docs.length > 0) setExistingDoc({ id: docs[0].id, nombre: docs[0].nombre });
  };

  const startPollingVideoStatus = (videoId: string) => {
    detenerPolling();
    setVideoProcessing(true);
    setEncodeProgress(0);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/bunny/get-video?videoId=${videoId}`);
        if (!res.ok) return;
        const data = await res.json();
        setEncodeProgress(data.encodeProgress || 0);
        if (data.status === 4 || data.status === 8) {
          detenerPolling();
          setVideoProcessing(false);
        } else if (data.status === 5 || data.status === 6) {
          detenerPolling();
          setVideoProcessing(false);
          setError("Bunny Stream no pudo procesar el video. Elimínalo y súbelo de nuevo.");
        }
      } catch (err) {
        console.error("Error consultando el estado del video", err);
      }
    }, 4000);
  };

  /** Quita el video del formulario; si se subió aquí y no se guardó, lo borra de Bunny. */
  const quitarVideo = () => {
    xhrVideo.current?.abort();
    if (form.bunny_video_id && form.bunny_video_id === videoSinGuardar.current) {
      descartarVideoSubido(form.bunny_video_id);
      videoSinGuardar.current = null;
    }
    setForm((p) => ({ ...p, bunny_video_id: "" }));
    setVideoProcessing(false);
    detenerPolling();
  };

  const handleUploadVideo = async (file: File) => {
    const nombre = file.name.toLowerCase();
    if (!EXTENSIONES_VIDEO.some((ext) => nombre.endsWith(ext)) && !file.type.startsWith("video/")) {
      setError(`Archivo no permitido. Selecciona un video (${EXTENSIONES_VIDEO.join(", ")})`);
      return;
    }
    setError(null);
    setSubidaVideo({ progreso: 0, estado: "Creando el video en Bunny..." });
    let videoId: string | null = null;
    try {
      const createRes = await fetch("/api/bunny/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.titulo || file.name }),
      });
      const creado = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(creado.error || "No se pudo crear el video en Bunny");
      videoId = creado.videoId as string;
      videoSinGuardar.current = videoId;
      setForm((p) => ({ ...p, bunny_video_id: videoId! }));

      setSubidaVideo({ progreso: 0, estado: "Subiendo el video..." });
      await subirConXhr(xhrVideo, "PUT", `/api/bunny/upload?videoId=${videoId}`, file, (n) =>
        setSubidaVideo({ progreso: n, estado: "Subiendo el video..." }),
      );
      setSubidaVideo(null);
      startPollingVideoStatus(videoId);
    } catch (err: unknown) {
      setSubidaVideo(null);
      // El registro creado en Bunny quedó vacío: se borra.
      if (videoId && videoSinGuardar.current === videoId) {
        descartarVideoSubido(videoId);
        videoSinGuardar.current = null;
        setForm((p) => (p.bunny_video_id === videoId ? { ...p, bunny_video_id: "" } : p));
      }
      if (!(err instanceof SubidaCancelada)) setError(err instanceof Error ? err.message : "Error inesperado al subir el video");
    }
  };

  const handleUploadMiniatura = async (file: File) => {
    if (!IMAGENES.includes(file.type)) return setError("Formato no permitido. Usa JPG, PNG, WebP o GIF");
    if (file.size > 2 * 1024 * 1024) return setError("La imagen no debe superar 2 MB");
    setError(null);
    setSubidaMiniatura({ progreso: 0, estado: "Subiendo miniatura..." });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await subirConXhr(xhrMiniatura, "POST", "/api/admin/upload-miniatura", fd, (n) =>
        setSubidaMiniatura({ progreso: n, estado: "Subiendo miniatura..." }),
      );
      setForm((p) => ({ ...p, imagen: data.url as string }));
    } catch (err: unknown) {
      if (!(err instanceof SubidaCancelada)) setError(err instanceof Error ? err.message : "Error al subir la miniatura");
    } finally {
      setSubidaMiniatura(null);
    }
  };

  const handleUploadDocumento = async (file: File) => {
    if (file.type !== "application/pdf") return setError("Solo se permiten archivos PDF");
    if (file.size > 10 * 1024 * 1024) return setError("El PDF no debe superar 10 MB");
    setError(null);
    setSubidaDocumento({ progreso: 0, estado: "Subiendo documento..." });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await subirConXhr(xhrDocumento, "POST", "/api/admin/upload-documento", fd, (n) =>
        setSubidaDocumento({ progreso: n, estado: "Subiendo documento..." }),
      );
      // El documento actual se reemplaza al guardar.
      if (existingDoc) setDocAEliminar(existingDoc.id);
      setExistingDoc(null);
      setPendingDoc({ filePath: data.filePath as string, nombre: data.nombre as string });
    } catch (err: unknown) {
      if (!(err instanceof SubidaCancelada)) setError(err instanceof Error ? err.message : "Error al subir el documento");
    } finally {
      setSubidaDocumento(null);
    }
  };

  const validarPaso = (paso: number): string | null => {
    if (paso >= 1 && !form.titulo.trim()) return "El título de la cápsula es obligatorio";
    if (paso >= 2 && !form.bunny_video_id.trim()) return "Sube un video o ingresa su ID de Bunny antes de continuar";
    if (paso >= 2 && showManualId && !extraerIdBunny(form.bunny_video_id)) return "El ID de Bunny no es válido (debe ser un GUID)";
    if (paso >= 3 && form.duracion.trim() && !DURACION.test(form.duracion.trim())) return "La duración debe tener el formato MM:SS o HH:MM:SS";
    return null;
  };

  const handleSave = async () => {
    const invalido = validarPaso(3);
    if (invalido) return setError(invalido);
    setSaving(true);
    setError(null);

    // Sin imagen, la portada es la miniatura automática de Bunny.
    const bunnyVideoId = extraerIdBunny(form.bunny_video_id) || form.bunny_video_id.trim();
    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
    const imagen = form.imagen.trim() || (libraryId && bunnyVideoId ? `https://vz-${libraryId}.b-cdn.net/${bunnyVideoId}/thumbnail.jpg` : "");

    // CAP-04: los opcionales vacíos se envían como null para poder borrarlos.
    const campos = {
      titulo: form.titulo.trim(),
      imagen: imagen || null,
      creado: form.creado.trim() || null,
      duracion: form.duracion.trim() || null,
      modulo_id: form.modulo_id || null,
      profesor_id: form.profesor_id || null,
      bunny_video_id: bunnyVideoId || null,
      order_index: form.order_index ?? 0,
      descripcion: form.descripcion.trim() || null,
    };

    let capsulaId = form.id;
    if (modal === "create") {
      const res = await createCapsula({
        ...campos,
        imagen: campos.imagen ?? undefined,
        creado: campos.creado ?? undefined,
        duracion: campos.duracion ?? undefined,
        modulo_id: campos.modulo_id ?? undefined,
        profesor_id: campos.profesor_id ?? undefined,
        bunny_video_id: campos.bunny_video_id ?? undefined,
        descripcion: campos.descripcion ?? undefined,
      });
      if (!res.success) {
        setSaving(false);
        return setError(res.error || "Error al guardar");
      }
      capsulaId = res.data?.id;
    } else {
      const res = await updateCapsula({ ...campos, id: form.id! });
      if (!res.success) {
        setSaving(false);
        return setError(res.error || "Error al guardar");
      }
    }
    // El video ya quedó guardado en la cápsula: no se descarta al cerrar.
    videoSinGuardar.current = null;

    // CAP-01: un fallo al adjuntar el PDF se avisa (antes solo iba a la consola).
    let errorDocumento: string | null = null;
    if (capsulaId && docAEliminar) await deleteDocumento(docAEliminar);
    if (capsulaId && pendingDoc) {
      const docRes = await createDocumento({ capsula_id: capsulaId, nombre: pendingDoc.nombre, url_archivo: pendingDoc.filePath });
      if (!docRes.success) errorDocumento = `No se pudo adjuntar el PDF "${pendingDoc.nombre}"${docRes.error ? `: ${docRes.error}` : ""}. Edita la cápsula y vuelve a subirlo.`;
    }

    setSaving(false);
    if (modal === "create") {
      fetchData();
    } else {
      // CAP-03: la tabla mostraba la imagen, el módulo y el profesor anteriores.
      const id = form.id;
      setCapsulas((prev) => prev.map((c) => (c.id === id ? {
        ...c,
        titulo: campos.titulo,
        imagen: campos.imagen ?? "",
        creado: campos.creado ?? "",
        duracion: campos.duracion,
        modulo_id: campos.modulo_id,
        modulo_nombre: modulos.find((m) => m.id === campos.modulo_id)?.nombre ?? "",
        profesor_id: campos.profesor_id,
        profesor_nombre: profesores.find((p) => p.id === campos.profesor_id)?.nombre ?? "",
        bunny_video_id: campos.bunny_video_id,
        order_index: campos.order_index,
        descripcion: campos.descripcion,
      } : c)));
    }
    if (errorDocumento) toast.error("La cápsula se guardó, pero falta el PDF", errorDocumento);
    else toast.exito(modal === "create" ? "Cápsula creada" : "Cápsula actualizada");
    resetForm();
    setModal(null);
  };

  const handleToggleDestacada = async (c: CapsulaAdmin) => {
    const nuevoId = c.destacada ? null : c.id;
    const anterior = capsulas;
    setTogglingDestacada(c.id);
    setCapsulas((prev) => prev.map((x) => ({ ...x, destacada: x.id === nuevoId })));
    await ejecutar(() => setCapsulaDestacada(nuevoId), {
      exito: nuevoId ? `${c.titulo} es la cápsula destacada` : "Ya no hay cápsula destacada",
      error: "No se pudo cambiar la cápsula destacada",
      revertir: () => setCapsulas(anterior),
    });
    setTogglingDestacada(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const c = deleteTarget;
    const anterior = capsulas;
    setEliminando(true);
    setCapsulas((prev) => prev.filter((x) => x.id !== c.id));
    let avisos: string[] = [];
    const ok = await ejecutar(async () => {
      const res = await deleteCapsula(c.id);
      avisos = res.avisos ?? [];
      return res;
    }, {
      exito: `Cápsula ${c.titulo} eliminada`,
      error: "No se pudo eliminar la cápsula",
      revertir: () => setCapsulas(anterior),
    });
    if (ok && avisos.length > 0) toast.error("La cápsula se eliminó, pero quedó algo por limpiar", avisos.join(" "));
    setEliminando(false);
    setDeleteTarget(null);
  };

  const nextStep = () => {
    const invalido = validarPaso(currentStep);
    if (invalido) return setError(invalido);
    setError(null);
    setCurrentStep((p) => p + 1);
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((p) => p - 1);
  };

  const acciones = (c: CapsulaAdmin) => (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => openEdit(c)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar ${c.titulo}`}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar" aria-label={`Eliminar ${c.titulo}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  const botonDestacada = (c: CapsulaAdmin) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleToggleDestacada(c); }}
      disabled={togglingDestacada !== null}
      aria-pressed={c.destacada}
      aria-label={`Destacar ${c.titulo}`}
      title={c.destacada ? "Quitar destacada" : "Marcar como destacada"}
      className={`p-1.5 rounded-lg ${c.destacada ? "text-yellow-500 hover:bg-yellow-50" : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"}`}
    >
      {togglingDestacada === c.id ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Estrella llena={c.destacada} size={16} />}
    </button>
  );

  const miniatura = (c: CapsulaAdmin, tam = "w-12 h-8") => (
    <div className={`${tam} rounded bg-gray-100 overflow-hidden shrink-0`}>
      {c.imagen ? <img src={c.imagen} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={14} aria-hidden /></div>}
    </div>
  );

  const columnas: Columna<CapsulaAdmin>[] = [
    {
      id: "titulo",
      encabezado: "Cápsula",
      celda: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          {miniatura(c)}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{c.titulo}</p>
            <p className="text-xs text-gray-500 truncate">
              {c.creado || "Sin coach"}
              {!c.bunny_video_id && <span className="ml-2 text-amber-700 font-semibold">· Sin video</span>}
            </p>
          </div>
        </div>
      ),
      valorOrden: (c) => c.titulo,
    },
    {
      id: "modulo",
      encabezado: "Módulo",
      celda: (c) => c.modulo_nombre
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold whitespace-nowrap"><BookOpen size={12} aria-hidden /> {c.modulo_nombre}</span>
        : <span className="text-xs text-gray-400">Sin módulo</span>,
      valorOrden: (c) => c.modulo_nombre,
    },
    {
      id: "profesor",
      encabezado: "Profesor",
      celda: (c) => c.profesor_nombre
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold whitespace-nowrap"><PersonStanding size={12} aria-hidden /> {c.profesor_nombre}</span>
        : <span className="text-xs text-gray-400">Sin profesor</span>,
      valorOrden: (c) => c.profesor_nombre,
    },
    { id: "duracion", encabezado: "Duración", celda: (c) => c.duracion || <span className="text-gray-300">—</span>, valorOrden: (c) => c.duracion ?? "" },
    { id: "orden", encabezado: "Orden", celda: (c) => c.order_index ?? 0, valorOrden: (c) => c.order_index ?? 0 },
    { id: "destacada", encabezado: "Destacada", celda: botonDestacada, valorOrden: (c) => (c.destacada ? 1 : 0) },
    { id: "acciones", encabezado: "Acciones", celda: acciones },
  ];

  const urlDocumento = existingDoc
    ? `/api/download-documento?id=${existingDoc.id}`
    : pendingDoc
      ? `/api/download-documento?filePath=${encodeURIComponent(pendingDoc.filePath)}&nombre=${encodeURIComponent(pendingDoc.nombre)}`
      : null;

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de cápsulas"
          descripcion="Cápsulas de video y material de apoyo del E-learning."
          acciones={<Button icono={<Plus size={16} />} onClick={openCreate}>Nueva cápsula</Button>}
        >
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input type="search" aria-label="Buscar cápsula" placeholder="Buscar cápsula o módulo..." value={search} onChange={(e) => setSearch(e.target.value)} className={`${CLASE_INPUT} pl-9 py-2`} />
          </div>
        </PageHeader>

        <DataTable
          etiqueta="Cápsulas"
          filas={filtered}
          columnas={columnas}
          getId={(c) => c.id}
          cargando={loading}
          resetKey={search}
          vacio={search ? "No se encontraron cápsulas" : "No hay cápsulas creadas aún"}
          tarjetaMovil={(c) => (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                {miniatura(c, "w-10 h-7")}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900 truncate">{c.titulo}</p>
                  <p className="text-xs text-gray-500">{[c.modulo_nombre, c.profesor_nombre, c.duracion].filter(Boolean).join(" · ") || "Sin módulo"}</p>
                </div>
                {botonDestacada(c)}
              </div>
              {acciones(c)}
            </div>
          )}
        />
      </div>

      {/* Formulario por pasos */}
      <Modal
        open={modal !== null}
        onClose={cerrarWizard}
        title={modal === "create" ? "Nueva cápsula" : "Editar cápsula"}
        description={`Paso ${currentStep} de 3: ${PASOS[currentStep - 1]}`}
        size="lg"
        bloquearCierre={saving}
        footer={
          <>
            {currentStep > 1 && (
              <Button variante="secundario" icono={<ChevronLeft size={16} />} onClick={prevStep} disabled={saving} className="mr-auto">Anterior</Button>
            )}
            <Button variante="secundario" onClick={cerrarWizard} disabled={saving}>Cancelar</Button>
            {currentStep < 3 ? (
              <Button onClick={nextStep} disabled={subidaVideo !== null}>Siguiente <ChevronRight size={16} aria-hidden /></Button>
            ) : (
              <Button onClick={handleSave} cargando={saving} textoCargando="Guardando..." disabled={subiendo}>
                {modal === "create" ? "Crear cápsula" : "Guardar cambios"}
              </Button>
            )}
          </>
        }
      >
        {/* Pasos */}
        <ol className="flex items-center gap-2 mb-6 bg-gray-50 p-2 sm:p-3 rounded border border-gray-100" aria-label="Pasos">
          {PASOS.map((nombre, i) => {
            const n = i + 1;
            return (
              <li key={nombre} className="flex-1 flex items-center justify-center gap-2" aria-current={currentStep === n ? "step" : undefined}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === n ? "bg-marca text-white" : currentStep > n ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {currentStep > n ? <Check size={14} aria-hidden /> : n}
                </span>
                <span className={`text-xs font-bold hidden sm:inline ${currentStep === n ? "text-marca" : "text-gray-500"}`}>{nombre}</span>
              </li>
            );
          })}
        </ol>

        {/* CAP-02: cerrar con una subida en curso pide confirmación. */}
        {confirmarCierre && (
          <div role="alertdialog" aria-label="Subida en curso" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p className="text-sm text-amber-900 flex items-start gap-2">
              <TriangleAlert size={16} className="shrink-0 mt-0.5" aria-hidden />
              Hay una subida en curso. Si cierras, se cancela y el video subido se borra de Bunny.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variante="secundario" onClick={() => setConfirmarCierre(false)}>Seguir subiendo</Button>
              <Button variante="advertencia" onClick={descartarFormulario}>Cancelar subida y cerrar</Button>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <FormField label="Título" required>
              {(p) => <input {...p} type="text" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Técnicas de regate" className={CLASE_INPUT} />}
            </FormField>
            <FormField label="Descripción">
              {(p) => <textarea {...p} rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Describe el contenido de la cápsula..." className={`${CLASE_INPUT} min-h-[80px] resize-y`} />}
            </FormField>
            <FormField label="Coach / instructor" ayuda="Nombre que ve el alumno. Déjalo vacío para no mostrarlo.">
              {(p) => <input {...p} type="text" value={form.creado} onChange={(e) => setForm((f) => ({ ...f, creado: e.target.value }))} placeholder="Ej: Coach Juan Pérez" className={CLASE_INPUT} />}
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Módulo">
                {(p) => (
                  <select {...p} value={form.modulo_id} onChange={(e) => setForm((f) => ({ ...f, modulo_id: e.target.value }))} className={CLASE_INPUT}>
                    <option value="">Sin módulo</option>
                    {modulos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                )}
              </FormField>
              <FormField label="Profesor">
                {(p) => (
                  <select {...p} value={form.profesor_id} onChange={(e) => setForm((f) => ({ ...f, profesor_id: e.target.value }))} className={CLASE_INPUT}>
                    <option value="">Sin profesor asignado</option>
                    {profesores.map((pr) => <option key={pr.id} value={pr.id}>{pr.nombre}</option>)}
                  </select>
                )}
              </FormField>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <section className="space-y-2" aria-label="Video">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Video</h3>
                {!subidaVideo && !(form.bunny_video_id && !showManualId) && (
                  <button type="button" onClick={() => setShowManualId((v) => !v)} className="text-xs text-marca hover:underline font-semibold">
                    {showManualId ? "Subir un archivo" : "Ingresar ID de Bunny"}
                  </button>
                )}
              </div>
              {showManualId ? (
                <FormField label="ID del video en Bunny" ayuda="El GUID del video o su URL de Bunny Stream.">
                  {(p) => <input {...p} type="text" value={form.bunny_video_id} onChange={(e) => setForm((f) => ({ ...f, bunny_video_id: e.target.value }))} placeholder="a83b2c1d-..." className={`${CLASE_INPUT} font-mono`} />}
                </FormField>
              ) : subidaVideo ? (
                <div className="space-y-2">
                  <BarraSubida subida={subidaVideo} />
                  <div className="text-right">
                    <Button variante="fantasma" onClick={quitarVideo}>Cancelar subida</Button>
                  </div>
                </div>
              ) : form.bunny_video_id ? (
                <div className="bg-green-50/50 border border-green-200 rounded p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                      {videoProcessing ? <Loader2 className="animate-spin text-green-600" size={16} aria-hidden /> : <CheckCircle2 className="text-green-600" size={16} aria-hidden />}
                      {videoProcessing ? `Bunny está procesando el video (${encodeProgress}%)` : "Video listo"}
                    </span>
                    <span className="text-xs font-mono text-gray-500">ID: {form.bunny_video_id.slice(0, 8)}…</span>
                  </div>
                  {videoProcessing && (
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${encodeProgress}%` }} />
                    </div>
                  )}
                  <div className="text-right">
                    <Button variante="fantasma" onClick={quitarVideo}>Quitar y subir otro</Button>
                  </div>
                </div>
              ) : (
                <ZonaArchivo id="video-upload-input" accept="video/*" titulo="Arrastra el video aquí o haz clic para buscarlo" ayuda=".mp4, .mov, .webm, .avi, .mkv…" onArchivo={handleUploadVideo} />
              )}
            </section>

            <section className="border-t border-gray-100 pt-5 space-y-2" aria-label="Miniatura">
              <h3 className="text-sm font-semibold text-gray-700">Miniatura</h3>
              {subidaMiniatura ? (
                <BarraSubida subida={subidaMiniatura} />
              ) : form.imagen ? (
                <div className="flex items-center justify-between gap-3 bg-green-50/50 border border-green-200 rounded p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={form.imagen} alt="Miniatura de la cápsula" className="w-16 h-10 rounded border border-green-300 object-cover shrink-0" />
                    <span className="text-xs text-gray-500 truncate font-mono">{form.imagen}</span>
                  </div>
                  <Button variante="fantasma" onClick={() => setForm((f) => ({ ...f, imagen: "" }))}>Quitar</Button>
                </div>
              ) : (
                <>
                  <ZonaArchivo id="miniatura-upload-input" accept={IMAGENES.join(",")} titulo="Arrastra una imagen o haz clic para buscarla" ayuda="JPG, PNG, WebP o GIF · máx. 2 MB" onArchivo={handleUploadMiniatura} />
                  <FormField label="O pega la URL de una imagen">
                    {(p) => <input {...p} type="url" value={form.imagen} onChange={(e) => setForm((f) => ({ ...f, imagen: e.target.value }))} placeholder="https://..." className={`${CLASE_INPUT} font-mono`} />}
                  </FormField>
                  {form.bunny_video_id && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <AlertCircle size={12} className="text-marca" aria-hidden />
                      Sin miniatura se usa la portada automática de Bunny.
                    </p>
                  )}
                </>
              )}
            </section>

            <section className="border-t border-gray-100 pt-5 space-y-2" aria-label="Documento PDF">
              <h3 className="text-sm font-semibold text-gray-700">Documento PDF (material de apoyo)</h3>
              {subidaDocumento ? (
                <BarraSubida subida={subidaDocumento} />
              ) : pendingDoc || existingDoc ? (
                <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 text-xs font-black text-red-600">PDF</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{pendingDoc?.nombre ?? existingDoc?.nombre}</p>
                      <p className="text-xs text-gray-500">{pendingDoc ? "Se adjunta al guardar" : "Documento actual"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {urlDocumento && <a href={urlDocumento} className="text-xs text-marca font-semibold hover:underline px-2">Ver</a>}
                    <Button
                      variante="fantasma"
                      onClick={() => {
                        if (existingDoc) setDocAEliminar(existingDoc.id);
                        setExistingDoc(null);
                        setPendingDoc(null);
                      }}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ZonaArchivo id="documento-upload-input" accept=".pdf,application/pdf" titulo="Arrastra el PDF aquí o haz clic para buscarlo" ayuda="Solo PDF · máx. 10 MB" onArchivo={handleUploadDocumento} />
                  {docAEliminar && <p className="text-xs text-amber-700">El documento actual se borrará al guardar.</p>}
                </>
              )}
            </section>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Duración" ayuda="MM:SS o HH:MM:SS. Vacío si no aplica.">
                {(p) => <input {...p} type="text" inputMode="numeric" value={form.duracion} onChange={(e) => setForm((f) => ({ ...f, duracion: e.target.value }))} placeholder="00:45:00" className={CLASE_INPUT} />}
              </FormField>
              <FormField label="Orden" ayuda="Posición dentro del módulo (0 primero).">
                {(p) => <NumberInput {...p} value={form.order_index} onChange={(n) => setForm((f) => ({ ...f, order_index: n }))} />}
              </FormField>
            </div>

            <section className="bg-gray-50 border border-gray-200 rounded p-4" aria-label="Resumen">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-3">Resumen</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div><dt className="inline text-gray-500">Título: </dt><dd className="inline font-semibold text-gray-900">{form.titulo}</dd></div>
                <div><dt className="inline text-gray-500">Coach: </dt><dd className="inline font-semibold text-gray-900">{form.creado || "No especificado"}</dd></div>
                <div><dt className="inline text-gray-500">Módulo: </dt><dd className="inline font-semibold text-gray-900">{modulos.find((m) => m.id === form.modulo_id)?.nombre || "Sin módulo"}</dd></div>
                <div><dt className="inline text-gray-500">Profesor: </dt><dd className="inline font-semibold text-gray-900">{profesores.find((p) => p.id === form.profesor_id)?.nombre || "Sin profesor"}</dd></div>
                <div className="sm:col-span-2"><dt className="inline text-gray-500">Video: </dt><dd className="inline font-mono text-marca font-semibold break-all">{form.bunny_video_id || "Ninguno"}</dd></div>
                <div className="sm:col-span-2"><dt className="inline text-gray-500">Miniatura: </dt><dd className="inline font-semibold text-gray-900 break-all">{form.imagen || "Portada automática de Bunny"}</dd></div>
                <div className="sm:col-span-2"><dt className="inline text-gray-500">Documento: </dt><dd className="inline font-semibold text-gray-900">{pendingDoc?.nombre ?? existingDoc?.nombre ?? "Sin documento"}</dd></div>
              </dl>
            </section>
            {videoProcessing && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" aria-hidden />
                Bunny sigue procesando el video: puedes guardar igual, estará disponible cuando termine.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-1.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden />
            {error}
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        variante="peligro"
        title="Eliminar cápsula"
        message={<>¿Eliminar la cápsula <strong>{deleteTarget?.titulo}</strong>? No se puede deshacer.</>}
        consecuencias={[
          "Los alumnos dejan de verla.",
          ...(deleteTarget?.bunny_video_id ? ["Se borra su video en Bunny (si ninguna otra cápsula lo usa)."] : []),
          "Se borran su documento PDF y sus comentarios.",
        ]}
        confirmLabel="Eliminar"
        textoCargando="Eliminando..."
        cargando={eliminando}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
