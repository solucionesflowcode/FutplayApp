"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Upload,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import {
  getCapsulasAdmin,
  getModulosOptions,
  createCapsula,
  updateCapsula,
  deleteCapsula,
  setCapsulaDestacada,
  type CapsulaAdmin,
  type ModuloOption,
} from "@/data/capsulas-admin";
import { getProfesoresDropdown, type ProfesorDropdown } from "@/data/profesores";
import { getDocumentosByCapsula, createDocumento, deleteDocumento } from "@/data/documentos-admin";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

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

const allowedExtensions = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".ogg", ".wmv"];
const allowedMimePrefix = "video/";

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

  // Estados del Wizard & Upload
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [videoProcessing, setVideoProcessing] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; titulo: string } | null>(null);
  const [togglingDestacada, setTogglingDestacada] = useState<string | null>(null);
  const [encodeProgress, setEncodeProgress] = useState<number>(0);
  const [videoStatus, setVideoStatus] = useState<number | null>(null);
  const [showManualId, setShowManualId] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  // Estados para Miniatura (S3)
  const [miniaturaFile, setMiniaturaFile] = useState<File | null>(null);
  const [miniaturaUploading, setMiniaturaUploading] = useState<boolean>(false);
  const [miniaturaProgress, setMiniaturaProgress] = useState<number>(0);
  const [miniaturaStatus, setMiniaturaStatus] = useState<string>("");
  const [isDragMiniActive, setIsDragMiniActive] = useState<boolean>(false);

  // Estados para Documento (PDF S3 — tabla documento)
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [documentoUploading, setDocumentoUploading] = useState<boolean>(false);
  const [documentoProgress, setDocumentoProgress] = useState<number>(0);
  const [documentoStatus, setDocumentoStatus] = useState<string>("");
  const [isDragDocActive, setIsDragDocActive] = useState<boolean>(false);
  const [pendingDoc, setPendingDoc] = useState<{ filePath: string; nombre: string } | null>(null);
  const [existingDoc, setExistingDoc] = useState<{ id: string; nombre: string; url_archivo: string } | null>(null);
  const docIdToDeleteRef = useRef<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    const [c, m, p] = await Promise.all([getCapsulasAdmin(), getModulosOptions(), getProfesoresDropdown()]);
    setCapsulas(c);
    setModulos(m);
    setProfesores(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchData]);

  const filtered = capsulas.filter(
    (c) =>
      c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      c.modulo_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setForm(emptyForm);
    setError(null);
    setCurrentStep(1);
    setVideoFile(null);
    setUploadProgress(0);
    setUploading(false);
    setUploadStatus("");
    setVideoProcessing(false);
    setEncodeProgress(0);
    setVideoStatus(null);
    setShowManualId(false);
    setIsDragActive(false);
    setMiniaturaFile(null);
    setMiniaturaUploading(false);
    setMiniaturaProgress(0);
    setMiniaturaStatus("");
    setIsDragMiniActive(false);
    setDocumentoFile(null);
    setDocumentoUploading(false);
    setDocumentoProgress(0);
    setDocumentoStatus("");
    setIsDragDocActive(false);
    setPendingDoc(null);
    setExistingDoc(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
    setModal("edit");
    setShowManualId(true);
    const docs = await getDocumentosByCapsula(c.id);
    if (docs.length > 0) {
      setExistingDoc({ id: docs[0].id, nombre: docs[0].nombre, url_archivo: docs[0].url_archivo });
      docIdToDeleteRef.current = null;
    }
  };

  const validateVideoFile = (file: File): { isValid: boolean; error?: string } => {
    const fileName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
    const hasValidMime = file.type.startsWith(allowedMimePrefix);
    
    if (!hasValidExt && !hasValidMime) {
      return {
        isValid: false,
        error: `Archivo no permitido. Selecciona un video válido (${allowedExtensions.join(", ")})`
      };
    }
    return { isValid: true };
  };

  const startPollingVideoStatus = (videoId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setVideoProcessing(true);
    setEncodeProgress(0);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/bunny/get-video?videoId=${videoId}`);
        if (!res.ok) return;
        const data = await res.json();
        setVideoStatus(data.status);
        setEncodeProgress(data.encodeProgress || 0);

        if (data.status === 4 || data.status === 8) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setVideoProcessing(false);
        } else if (data.status === 5 || data.status === 6) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setVideoProcessing(false);
          setError("Error en el procesamiento del video en Bunny Stream.");
        }
      } catch (err) {
        console.error("Error polling video status", err);
      }
    }, 4000);
  };

  const handleUploadVideo = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Iniciando subida a Bunny...");
    setError(null);
    
    try {
      const createRes = await fetch("/api/bunny/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.titulo || file.name }),
      });
      
      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "No se pudo crear el registro de video en Bunny");
      }
      
      const { videoId } = await createRes.json();
      setForm(p => ({ ...p, bunny_video_id: videoId }));
      
      setUploadStatus("Subiendo archivo binario...");
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", `/api/bunny/upload?videoId=${videoId}`, true);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || `Error en la subida: ${xhr.statusText}`));
            } catch {
              reject(new Error(`Error en la subida con código ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error("Error de red durante la subida."));
        xhr.send(file);
      });
      
      setUploadStatus("¡Subida completada!");
      setUploadProgress(100);
      startPollingVideoStatus(videoId);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error inesperado al subir el video");
      setUploadStatus("Fallo en la subida");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateVideoFile(file);
      if (!validation.isValid) {
        setError(validation.error || "Archivo no válido");
        return;
      }
      setVideoFile(file);
      handleUploadVideo(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateVideoFile(file);
      if (!validation.isValid) {
        setError(validation.error || "Archivo no válido");
        return;
      }
      setVideoFile(file);
      handleUploadVideo(file);
    }
  };

  // ─── Miniatura Upload ──────────────────────────────
  const handleUploadMiniatura = async (file: File) => {
    setMiniaturaUploading(true);
    setMiniaturaProgress(0);
    setMiniaturaStatus("Subiendo miniatura...");
    setError(null);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload-miniatura", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setMiniaturaProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              setForm((p) => ({ ...p, imagen: data.url }));
              resolve();
            } catch {
              reject(new Error("Error al procesar la respuesta"));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || "Error al subir miniatura"));
            } catch {
              reject(new Error(`Error en la subida: ${xhr.statusText}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Error de red durante la subida"));

        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      });

      setMiniaturaStatus("¡Miniatura subida!");
      setMiniaturaProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al subir miniatura");
      setMiniaturaStatus("Fallo en la subida");
    } finally {
      setMiniaturaUploading(false);
    }
  };

  const handleDragMini = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragMiniActive(true);
    } else if (e.type === "dragleave") {
      setIsDragMiniActive(false);
    }
  };

  const handleDropMini = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragMiniActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        setError("Formato no permitido. Usa JPG, PNG, WebP o GIF");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("La imagen no debe superar 2MB");
        return;
      }
      setMiniaturaFile(file);
      handleUploadMiniatura(file);
    }
  };

  const handleMiniaturaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) {
        setError("Formato no permitido. Usa JPG, PNG, WebP o GIF");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("La imagen no debe superar 2MB");
        return;
      }
      setMiniaturaFile(file);
      handleUploadMiniatura(file);
    }
  };

  // ─── Documento (PDF) Upload ───────────────────────
  const handleUploadDocumento = async (file: File) => {
    setDocumentoUploading(true);
    setDocumentoProgress(0);
    setDocumentoStatus("Subiendo documento...");
    setError(null);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload-documento", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setDocumentoProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (existingDoc) {
                docIdToDeleteRef.current = existingDoc.id;
              }
              setPendingDoc({ filePath: data.filePath, nombre: data.nombre });
              setExistingDoc(null);
              resolve();
            } catch {
              reject(new Error("Error al procesar la respuesta"));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || "Error al subir documento"));
            } catch {
              reject(new Error(`Error en la subida: ${xhr.statusText}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Error de red durante la subida"));

        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      });

      setDocumentoStatus("¡Documento subido!");
      setDocumentoProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al subir documento");
      setDocumentoStatus("Fallo en la subida");
    } finally {
      setDocumentoUploading(false);
    }
  };

  const handleDragDoc = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragDocActive(true);
    } else if (e.type === "dragleave") {
      setIsDragDocActive(false);
    }
  };

  const handleDropDoc = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragDocActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== "application/pdf") {
        setError("Solo se permiten archivos PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("El PDF no debe superar 10MB");
        return;
      }
      setDocumentoFile(file);
      handleUploadDocumento(file);
    }
  };

  const handleDocumentoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setError("Solo se permiten archivos PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("El PDF no debe superar 10MB");
        return;
      }
      setDocumentoFile(file);
      handleUploadDocumento(file);
    }
  };

  const handleSave = async () => {
    if (!form.titulo) {
      setError("El título de la cápsula es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);

    // Si no se especifica imagen y tenemos bunny_video_id, usamos el thumbnail por defecto de Bunny Stream
    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
    const finalImagen = form.imagen || (libraryId && form.bunny_video_id ? `https://vz-${libraryId}.b-cdn.net/${form.bunny_video_id}/thumbnail.jpg` : "");

    const payload: any = {
      titulo: form.titulo,
      imagen: finalImagen || undefined,
      creado: form.creado || undefined,
      duracion: form.duracion || undefined,
      modulo_id: form.modulo_id || undefined,
      profesor_id: form.profesor_id || undefined,
      bunny_video_id: form.bunny_video_id || undefined,
      order_index: form.order_index || undefined,
      descripcion: form.descripcion || undefined,
    };

    let savedCapsulaId = form.id;
    if (modal === "create") {
      const res = await createCapsula(payload);
      if (!res.success) {
        setError(res.error || "Error al guardar");
        setSaving(false);
        return;
      }
      savedCapsulaId = res.data?.id || savedCapsulaId;
    } else {
      const res = await updateCapsula({ ...payload, id: form.id! });
      if (!res.success) {
        setError(res.error || "Error al guardar");
        setSaving(false);
        return;
      }
    }

    if (pendingDoc && savedCapsulaId) {
      if (docIdToDeleteRef.current) {
        await deleteDocumento(docIdToDeleteRef.current);
        docIdToDeleteRef.current = null;
      }
      const docRes = await createDocumento({
        capsula_id: savedCapsulaId,
        nombre: pendingDoc.nombre,
        url_archivo: pendingDoc.filePath,
      });
      if (!docRes.success) {
        console.error("Error al guardar documento:", docRes.error);
      }
    }

    setSaving(false);
    setModal(null);
    resetForm();
    if (modal === "create") {
      fetchData();
    } else {
      setCapsulas((prev) =>
        prev.map((c) =>
          c.id === form.id
            ? {
                ...c,
                titulo: form.titulo,
                imagen: form.imagen,
                creado: form.creado,
                duracion: form.duracion || null,
                modulo_id: form.modulo_id || null,
                profesor_id: form.profesor_id || null,
                bunny_video_id: form.bunny_video_id || null,
                order_index: form.order_index,
              }
            : c
        )
      );
    }
  };

  const handleToggleDestacada = async (c: CapsulaAdmin) => {
    setTogglingDestacada(c.id);
    setError(null);
    const newId = c.destacada ? null : c.id;
    const res = await setCapsulaDestacada(newId);
    if (!res.success) {
      setError(res.error || "Error al cambiar cápsula destacada");
      setTogglingDestacada(null);
      return;
    }
    setCapsulas((prev) =>
      prev.map((x) => ({ ...x, destacada: x.id === newId }))
    );
    setTogglingDestacada(null);
  };

  const handleDelete = async (id: string, _titulo: string) => {
    setDeleteTarget(null);
    setError(null);

    const res = await deleteCapsula(id);
    if (!res.success) {
      setError(res.error || "Error al eliminar");
      return;
    }
    setCapsulas((prev) => prev.filter((c) => c.id !== id));
  };

  const nextStep = () => {
    if (currentStep === 1 && !form.titulo.trim()) {
      setError("Por favor ingresa un título");
      return;
    }
    if (currentStep === 2 && !form.bunny_video_id.trim()) {
      setError("Debes subir un video o ingresar un ID de Bunny antes de continuar");
      return;
    }
    setError(null);
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => prev - 1);
  };

  if (loading && capsulas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-[#F28C28]" />
      </div>
    );
  }

  return (
    <>
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-6 w-full max-w-[1216px] mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Gestión de Cápsulas</h1>
            <p className="text-gray-500 text-sm mt-1">
              Administra las cápsulas de video y contenido E-learning
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus size={16} />
            Nueva Cápsula
          </button>
        </div>

        {/* ─── TABLE ─── */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cápsula o módulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <span className="text-sm text-gray-500 self-end sm:self-auto">{filtered.length} cápsula{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                    <th className="p-3 font-semibold">Título</th>
                    <th className="p-3 font-semibold">Coach</th>
                    <th className="p-3 font-semibold">Duración</th>
                    <th className="p-3 font-semibold">Módulo</th>
                    <th className="p-3 font-semibold">Profesor</th>
                    <th className="p-3 font-semibold">Video ID</th>
                    <th className="p-3 font-semibold">Orden</th>
                    <th className="p-3 font-semibold">Destacar</th>
                    <th className="p-3 font-semibold">Acciones</th>
                  </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
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
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleDestacada(c)}
                        disabled={togglingDestacada === c.id}
                        className={`p-1.5 rounded-lg ${
                          c.destacada
                            ? "text-yellow-500 hover:bg-yellow-50"
                            : "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                        }`}
                        title={c.destacada ? "Quitar destacada" : "Marcar como destacada"}
                      >
                        {togglingDestacada === c.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={c.destacada ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        )}
                      </button>
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
                          onClick={() => setDeleteTarget({ id: c.id, titulo: c.titulo })}
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

      {/* ─── MODAL WIZARD ─── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-xl max-h-[95vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {modal === "create" ? "Nueva Cápsula" : "Editar Cápsula"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Organiza tu cápsula en sencillos pasos</p>
              </div>
              <button onClick={() => { setModal(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="flex justify-between items-center mb-6 bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-100">
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${currentStep === 1 ? "bg-blue-600 text-white animate-pulse" : currentStep > 1 ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {currentStep > 1 ? <Check size={14} /> : "1"}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${currentStep === 1 ? "text-blue-600" : "text-gray-500"}`}>Información</span>
              </div>
              <div className="h-[1px] w-4 sm:w-8 bg-gray-200 shrink-0" />
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${currentStep === 2 ? "bg-blue-600 text-white" : currentStep > 2 ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {currentStep > 2 ? <Check size={14} /> : "2"}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${currentStep === 2 ? "text-blue-600" : "text-gray-500"}`}>Video, Miniatura y Documento</span>
              </div>
              <div className="h-[1px] w-4 sm:w-8 bg-gray-200 shrink-0" />
              <div className="flex-1 flex items-center justify-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${currentStep === 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {currentStep === 3 ? <Settings size={14} className="text-white" /> : "3"}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${currentStep === 3 ? "text-blue-600" : "text-gray-500"}`}>Configuración</span>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5">
              
              {/* STEP 1: Información básica */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Título *</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                      placeholder="Ej: Técnicas de Regate"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Descripción</label>
                    <textarea
                      value={form.descripcion}
                      onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 min-h-[80px] resize-y"
                      placeholder="Describe el contenido de la cápsula..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Coach / Instructor</label>
                    <input
                      type="text"
                      value={form.creado}
                      onChange={(e) => setForm((p) => ({ ...p, creado: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                      placeholder="Ej: Coach Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Módulo</label>
                    <select
                      value={form.modulo_id}
                      onChange={(e) => setForm((p) => ({ ...p, modulo_id: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">Sin módulo</option>
                      {modulos.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Profesor</label>
                    <select
                      value={form.profesor_id}
                      onChange={(e) => setForm((p) => ({ ...p, profesor_id: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">Sin profesor asignado</option>
                      {profesores.map((pr) => (
                        <option key={pr.id} value={pr.id}>{pr.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: Video & Multimedia */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Cargar Video</label>
                    <button 
                      type="button"
                      onClick={() => setShowManualId(!showManualId)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      {showManualId ? "Usar cargador directo" : "Ingresar ID manualmente"}
                    </button>
                  </div>

                  {showManualId ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Bunny Video ID</label>
                      <input
                        type="text"
                        value={form.bunny_video_id}
                        onChange={(e) => setForm((p) => ({ ...p, bunny_video_id: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 font-mono"
                        placeholder="GUID del video en Bunny Stream (ej: a83b2...)"
                      />
                    </div>
                  ) : (
                    <div>
                      {/* Caso 1: Subiendo archivo */}
                      {uploading && (
                        <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-6 text-center space-y-3">
                          <Loader2 className="animate-spin text-blue-600 mx-auto" size={24} />
                          <div className="text-sm font-semibold text-blue-900">{uploadStatus}</div>
                          <div className="max-w-md mx-auto bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <div className="text-xs text-blue-500 font-bold">{uploadProgress}% subido</div>
                        </div>
                      )}

                      {/* Caso 2: Procesamiento/Polling */}
                      {!uploading && form.bunny_video_id && (
                        <div className="bg-green-50/50 border border-green-200 rounded-xl p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                              {videoProcessing ? (
                                <Loader2 className="animate-spin text-green-600" size={16} />
                              ) : (
                                <CheckCircle2 className="text-green-500" size={16} />
                              )}
                              {videoProcessing ? `Procesando video en Bunny (${encodeProgress}%)` : "Video listo para reproducir"}
                            </span>
                            <span className="text-xs font-mono text-gray-500">ID: {form.bunny_video_id.slice(0, 8)}...</span>
                          </div>
                          
                          {videoProcessing && (
                            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${encodeProgress}%` }} />
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2">
                            <span className="text-xs text-gray-400">Thumbnail automático de Bunny configurado</span>
                            <button
                              type="button"
                              onClick={() => {
                                setForm(p => ({ ...p, bunny_video_id: "" }));
                                setVideoFile(null);
                                setUploadProgress(0);
                                setVideoProcessing(false);
                                if (pollingIntervalRef.current) {
                                  clearInterval(pollingIntervalRef.current);
                                  pollingIntervalRef.current = null;
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                            >
                              Eliminar y subir otro
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Caso 3: Zona de Dropbox */}
                      {!uploading && !form.bunny_video_id && (
                        <div 
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                            isDragActive 
                              ? "border-blue-500 bg-blue-50/50" 
                              : "border-gray-300 hover:border-blue-400 bg-gray-50/30"
                          }`}
                        >
                          <input
                            type="file"
                            id="video-upload-input"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label htmlFor="video-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                              <Upload size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-700">Arrastra tu video aquí o haz clic para buscar</p>
                              <p className="text-xs text-gray-400 mt-1">Archivos soportados: .mp4, .mov, .webm, .avi, etc. Sin límite de tamaño.</p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campo de imagen/thumbnail */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Imagen de Portada (URL manual)</label>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={form.imagen}
                          onChange={(e) => setForm((p) => ({ ...p, imagen: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono"
                          placeholder="https://..."
                        />
                      </div>
                      {form.imagen ? (
                        <div className="w-16 h-10 rounded border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                          <img src={form.imagen} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : form.bunny_video_id && process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ? (
                        <div className="w-16 h-10 rounded border border-blue-200 bg-blue-50 overflow-hidden shrink-0 flex flex-col items-center justify-center p-0.5 text-center leading-none">
                          <span className="font-extrabold text-[7px] text-blue-600 uppercase tracking-tighter">PORTADA</span>
                          <span className="text-[7px] text-blue-500 font-medium">BUNNY AUTO</span>
                        </div>
                      ) : null}
                    </div>
                    {(!form.imagen && form.bunny_video_id) && (
                      <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle size={10} className="text-blue-500" />
                        No has especificado una URL de imagen. Usaremos automáticamente la portada autogenerada por Bunny Stream.
                      </p>
                    )}
                  </div>

                  {/* ─── MINIATURA UPLOAD (S3) ─── */}
                  <div className="border-t border-gray-100 pt-5">
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Miniatura (Subir a S3)</label>

                    {miniaturaUploading ? (
                      <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 text-center space-y-3">
                        <Loader2 className="animate-spin text-blue-600 mx-auto" size={24} />
                        <div className="text-sm font-semibold text-blue-900">{miniaturaStatus}</div>
                        <div className="max-w-xs mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${miniaturaProgress}%` }} />
                        </div>
                        <div className="text-xs text-blue-500 font-bold">{miniaturaProgress}% subido</div>
                      </div>
                    ) : form.imagen ? (
                      <div className="bg-green-50/50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-10 rounded border border-green-300 bg-white overflow-hidden shrink-0">
                              <img src={form.imagen} alt="Miniatura" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                                <CheckCircle2 size={16} className="text-green-500" />
                                Miniatura lista
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5">Subida a S3 correctamente</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setForm((p) => ({ ...p, imagen: "" }));
                              setMiniaturaFile(null);
                              setMiniaturaProgress(0);
                              setMiniaturaStatus("");
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragEnter={handleDragMini}
                        onDragOver={handleDragMini}
                        onDragLeave={handleDragMini}
                        onDrop={handleDropMini}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                          isDragMiniActive
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-gray-300 hover:border-blue-400 bg-gray-50/30"
                        }`}
                      >
                        <input
                          type="file"
                          id="miniatura-upload-input"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleMiniaturaFileChange}
                          className="hidden"
                        />
                        <label htmlFor="miniatura-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Upload size={20} />
                          </div>
                          <p className="text-sm font-bold text-gray-700">Arrastra una imagen o haz clic para buscar</p>
                          <p className="text-xs text-gray-400">JPG, PNG, WebP o GIF · Máx 2MB</p>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* ─── DOCUMENTO (PDF) S3 → tabla documento ─── */}
                  <div className="border-t border-gray-100 pt-5">
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Documento PDF (Material de apoyo)</label>

                    {documentoUploading ? (
                      <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 text-center space-y-3">
                        <Loader2 className="animate-spin text-blue-600 mx-auto" size={24} />
                        <div className="text-sm font-semibold text-blue-900">{documentoStatus}</div>
                        <div className="max-w-xs mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${documentoProgress}%` }} />
                        </div>
                        <div className="text-xs text-blue-500 font-bold">{documentoProgress}% subido</div>
                      </div>
                    ) : pendingDoc ? (
                      <div className="bg-green-50/50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-red-600">PDF</span>
                            </div>
                            <div>
                              <span className="text-sm font-bold text-green-900 flex items-center gap-1.5">
                                <CheckCircle2 size={16} className="text-green-500" />
                                Documento listo (pendiente de guardar)
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5">{pendingDoc.nombre}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`/api/download-documento?filePath=${encodeURIComponent(pendingDoc.filePath)}&nombre=${encodeURIComponent(pendingDoc.nombre)}`}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                              Ver
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingDoc(null);
                                setDocumentoFile(null);
                                setDocumentoProgress(0);
                                setDocumentoStatus("");
                              }}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : existingDoc ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-red-600">PDF</span>
                            </div>
                            <div>
                              <span className="text-sm font-bold text-gray-800">{existingDoc.nombre}</span>
                              <p className="text-xs text-gray-400 mt-0.5">Documento actual</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`/api/download-documento?id=${existingDoc.id}`}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                              Ver
                            </a>
                            <button
                              type="button"
                              onClick={async () => {
                                const delRes = await deleteDocumento(existingDoc.id);
                                if (delRes.success) {
                                  setExistingDoc(null);
                                } else {
                                  setError(delRes.error || "Error al eliminar documento");
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragEnter={handleDragDoc}
                        onDragOver={handleDragDoc}
                        onDragLeave={handleDragDoc}
                        onDrop={handleDropDoc}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                          isDragDocActive
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-gray-300 hover:border-blue-400 bg-gray-50/30"
                        }`}
                      >
                        <input
                          type="file"
                          id="documento-upload-input"
                          accept=".pdf,application/pdf"
                          onChange={handleDocumentoFileChange}
                          className="hidden"
                        />
                        <label htmlFor="documento-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <Upload size={20} />
                          </div>
                          <p className="text-sm font-bold text-gray-700">Arrastra tu PDF aquí o haz clic para buscar</p>
                          <p className="text-xs text-gray-400">Solo PDF · Máx 10MB</p>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Configuración final */}
              {currentStep === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Duración (HH:MM:SS)</label>
                      <input
                        type="text"
                        value={form.duracion}
                        onChange={(e) => setForm((p) => ({ ...p, duracion: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        placeholder="00:45:00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">Orden (Order Index)</label>
                      <input
                        type="number"
                        value={form.order_index}
                        onChange={(e) => setForm((p) => ({ ...p, order_index: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Resumen de la Cápsula */}
                  <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1.5">Resumen de Cápsula</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div>
                        <span className="text-gray-400">Título:</span>{" "}
                        <span className="font-semibold text-gray-900">{form.titulo}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Instructor:</span>{" "}
                        <span className="font-semibold text-gray-900">{form.creado || "No especificado"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Módulo:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          {modulos.find(m => m.id === form.modulo_id)?.nombre || "Sin módulo"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Profesor:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          {profesores.find(p => p.id === form.profesor_id)?.nombre || "Sin profesor"}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-400">Descripción:</span>{" "}
                        <span className="font-semibold text-gray-900 truncate block">
                          {form.descripcion || "Sin descripción"}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-400">Video Link ID:</span>{" "}
                        <span className="font-mono text-blue-600 font-semibold">{form.bunny_video_id || "Ninguno"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-400">Imagen Portada:</span>{" "}
                        <span className="font-semibold text-gray-900 truncate block">
                          {form.imagen ? form.imagen : "Thumbnail automático de Bunny Stream"}
                        </span>
                      </div>
                      {(pendingDoc || existingDoc) && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-400">Documento PDF:</span>{" "}
                          <a
                            href={existingDoc ? `/api/download-documento?id=${existingDoc.id}` : `/api/download-documento?filePath=${encodeURIComponent(pendingDoc!.filePath)}&nombre=${encodeURIComponent(pendingDoc!.nombre)}`}
                            className="font-semibold text-red-600 hover:underline"
                          >
                            {pendingDoc?.nombre || existingDoc?.nombre || "Ver PDF"}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error view */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100 shrink-0">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={saving || uploading}
                    className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setModal(null); resetForm(); }}
                  disabled={saving || uploading}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving || uploading || videoProcessing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors font-semibold"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {modal === "create" ? "Crear Cápsula" : "Guardar Cambios"}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar cápsula"
        message={`¿Eliminar la cápsula "${deleteTarget?.titulo}"?`}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.titulo)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
