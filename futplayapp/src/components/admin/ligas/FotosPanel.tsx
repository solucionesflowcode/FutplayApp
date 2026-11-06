"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Camera, Download, MessageCircle, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { actualizarFotoLiga, eliminarFotoLiga, getFotosLigaAdmin, subirFotoLiga, type LigaEquipoAdmin } from "@/data/ligas-admin";
import { borrarComentarioFoto, getComentariosFoto } from "@/data/ligas";
import { prepararFoto } from "@/lib/imagen-navegador";
import { etiquetaPartido, MAX_PIE, urlDescarga, type ComentarioFoto, type LigaFotoVista } from "@/lib/liga-fotos";
import type { LigaPartido } from "@/lib/liga-tabla";
import BorrarConConfirmacion from "@/components/liga/BorrarConConfirmacion";
import { Button, CLASE_INPUT, ConfirmDialog, FormField, Modal, useAdminMutation, useToast } from "@/components/admin/ui";

const SUBIDAS_SIMULTANEAS = 3;

type ItemCola = { id: string; archivo: File; partidoId: string | null; estado: "pendiente" | "subiendo" | "error"; error?: string };

type Props = { ligaId: string; partidos: LigaPartido[]; equipos: LigaEquipoAdmin[] };

/** Comentarios de una foto, con la opción de borrarlos. */
function ComentariosModal({ foto, onClose, onBorrado }: { foto: LigaFotoVista; onClose: () => void; onBorrado: () => void }) {
  const toast = useToast();
  const [comentarios, setComentarios] = useState<ComentarioFoto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    getComentariosFoto(foto.id)
      .then((lista) => { if (vigente) setComentarios(lista); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [foto.id]);

  const borrar = async (id: string) => {
    try {
      await borrarComentarioFoto(id);
      setComentarios((lista) => (lista ?? []).filter((c) => c.id !== id));
      onBorrado();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Modal open onClose={onClose} title="Comentarios de la foto" footer={<Button variante="secundario" onClick={onClose}>Cerrar</Button>}>
      {error && <p className="text-sm text-gray-600">No se pudieron cargar los comentarios.</p>}
      {!error && comentarios === null && <p className="text-sm text-gray-500">Cargando comentarios...</p>}
      {comentarios?.length === 0 && <p className="text-sm text-gray-500">Esta foto no tiene comentarios.</p>}
      <ul className="divide-y divide-gray-100">
        {comentarios?.map((c) => (
          <li key={c.id} className="py-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900">{c.autor.nombre}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.texto}</p>
            </div>
            <BorrarConConfirmacion etiqueta={`Borrar comentario de ${c.autor.nombre}`} onBorrar={() => borrar(c.id)} />
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** Subir y administrar las fotos del campeonato. Las fotos se publican al subirlas. */
export default function FotosPanel({ ligaId, partidos, equipos }: Props) {
  const toast = useToast();
  const { ejecutar, pendiente } = useAdminMutation();
  const inputFotos = useRef<HTMLInputElement>(null);

  const [fotos, setFotos] = useState<LigaFotoVista[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);

  const [destino, setDestino] = useState("");
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  const [editar, setEditar] = useState<{ foto: LigaFotoVista; pie: string; partidoId: string } | null>(null);
  const [aEliminar, setAEliminar] = useState<LigaFotoVista | null>(null);
  const [verComentarios, setVerComentarios] = useState<LigaFotoVista | null>(null);

  useEffect(() => {
    let vigente = true;
    getFotosLigaAdmin(ligaId)
      .then((p) => {
        if (!vigente) return;
        setFotos(p.fotos);
        setSiguiente(p.siguiente);
        setErrorCarga(false);
      })
      .catch(() => { if (vigente) setErrorCarga(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [ligaId, intento]);

  // Cerrar la página cancelaría las fotos que faltan.
  useEffect(() => {
    if (!subiendo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [subiendo]);

  const etiquetaDe = (partidoId: string | null) => {
    const partido = partidos.find((p) => p.id === partidoId);
    return partido ? etiquetaPartido(partido, equipos) : "General de la liga";
  };

  const subirUna = async (item: ItemCola): Promise<boolean> => {
    setCola((c) => c.map((i) => (i.id === item.id ? { ...i, estado: "subiendo", error: undefined } : i)));
    let error: string;
    try {
      const preparada = await prepararFoto(item.archivo);
      const form = new FormData();
      form.append("liga_id", ligaId);
      if (item.partidoId) form.append("partido_id", item.partidoId);
      form.append("ancho", String(preparada.ancho));
      form.append("alto", String(preparada.alto));
      form.append("foto", preparada.foto, "foto.jpg");
      form.append("miniatura", preparada.miniatura, "miniatura.jpg");
      const r = await subirFotoLiga(form);
      if (r.success && r.data) {
        const nueva = r.data;
        setFotos((actuales) => [nueva, ...actuales]);
        setCola((c) => c.filter((i) => i.id !== item.id));
        return true;
      }
      error = r.error ?? "No se pudo subir la foto";
    } catch (e) {
      error = e instanceof TypeError ? "Error de conexión" : (e as Error).message;
    }
    setCola((c) => c.map((i) => (i.id === item.id ? { ...i, estado: "error", error } : i)));
    return false;
  };

  const procesar = async (lote: ItemCola[]) => {
    setSubiendo(true);
    const pendientes = [...lote];
    let subidas = 0;
    const trabajador = async () => {
      for (let item = pendientes.shift(); item; item = pendientes.shift()) {
        if (await subirUna(item)) subidas++;
      }
    };
    await Promise.all(Array.from({ length: SUBIDAS_SIMULTANEAS }, trabajador));
    setSubiendo(false);
    if (subidas > 0) toast.exito(subidas === 1 ? "Foto publicada" : `${subidas} fotos publicadas`);
  };

  const elegirFotos = (archivos: FileList | null) => {
    if (!archivos?.length) return;
    const lote: ItemCola[] = [...archivos].map((archivo) => ({ id: crypto.randomUUID(), archivo, partidoId: destino || null, estado: "pendiente" }));
    setCola((c) => [...c, ...lote]);
    procesar(lote);
  };

  const cargarMas = async () => {
    if (!siguiente) return;
    setCargandoMas(true);
    try {
      const p = await getFotosLigaAdmin(ligaId, siguiente);
      setFotos((actuales) => [...actuales, ...p.fotos]);
      setSiguiente(p.siguiente);
    } catch {
      toast.error("No se pudieron cargar más fotos");
    } finally {
      setCargandoMas(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editar) return;
    const cambios = { pie: editar.pie.trim() || null, partido_id: editar.partidoId || null };
    const ok = await ejecutar(() => actualizarFotoLiga(editar.foto.id, cambios), { exito: "Foto actualizada" });
    if (ok) {
      setFotos((actuales) => actuales.map((f) => (f.id === editar.foto.id ? { ...f, ...cambios } : f)));
      setEditar(null);
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    const ok = await ejecutar(() => eliminarFotoLiga(aEliminar.id), { exito: "Foto eliminada" });
    if (ok) {
      setFotos((actuales) => actuales.filter((f) => f.id !== aEliminar.id));
      setAEliminar(null);
    }
  };

  const fallidas = cola.filter((i) => i.estado === "error");
  const enProceso = cola.length - fallidas.length;

  const opcionesPartido = (
    <>
      <option value="">General de la liga</option>
      {partidos.map((p) => <option key={p.id} value={p.id}>{etiquetaPartido(p, equipos)}</option>)}
    </>
  );

  return (
    <div>
      <section className="bg-white rounded-xl ring-1 ring-black/5 p-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <FormField label="Dónde publicar" ayuda="Se publican al subirlas. Se reducen a 2.000 px y se les quita la ubicación GPS.">
              {(p) => <select {...p} className={CLASE_INPUT} value={destino} onChange={(e) => setDestino(e.target.value)}>{opcionesPartido}</select>}
            </FormField>
          </div>
          <input ref={inputFotos} type="file" accept="image/*" multiple className="hidden" aria-label="Elegir fotos"
            onChange={(e) => { elegirFotos(e.target.files); e.target.value = ""; }} />
          <Button icono={<Upload size={15} />} cargando={subiendo} textoCargando="Subiendo..." className="sm:mb-6" onClick={() => inputFotos.current?.click()}>
            Elegir fotos
          </Button>
        </div>

        {cola.length > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3" aria-live="polite">
            {enProceso > 0 && <p className="text-sm text-gray-600">Subiendo {enProceso} foto(s). No cierres esta página.</p>}
            {fallidas.length > 0 && (
              <>
                <p className="text-sm font-semibold text-red-700 mt-1">No se pudieron subir {fallidas.length} foto(s):</p>
                <ul className="mt-1 space-y-1">
                  {fallidas.map((i) => <li key={i.id} className="text-xs text-gray-700 break-words"><strong>{i.archivo.name}:</strong> {i.error}</li>)}
                </ul>
                <div className="flex gap-2 mt-2">
                  <Button variante="secundario" icono={<RefreshCw size={14} />} disabled={subiendo} onClick={() => procesar(fallidas)}>Reintentar</Button>
                  <Button variante="fantasma" disabled={subiendo} onClick={() => setCola([])}>Descartar</Button>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {errorCarga && (
        <div className="bg-white rounded-xl ring-1 ring-black/5 p-8 text-center">
          <p className="text-gray-700">No se pudieron cargar las fotos.</p>
          <Button variante="secundario" className="mt-3" onClick={() => { setErrorCarga(false); setCargando(true); setIntento((n) => n + 1); }}>Reintentar</Button>
        </div>
      )}

      {cargando && <p className="py-12 text-center text-sm text-gray-500">Cargando fotos...</p>}

      {!cargando && !errorCarga && fotos.length === 0 && (
        <div className="bg-white rounded-xl ring-1 ring-black/5 p-10 text-center">
          <Camera className="mx-auto text-gray-300 mb-3" size={40} aria-hidden />
          <p className="text-sm text-gray-600">Aún no hay fotos en esta liga.</p>
        </div>
      )}

      {!cargando && fotos.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {fotos.map((f) => (
            <li key={f.id} className="bg-white rounded-xl ring-1 ring-black/5 overflow-hidden flex flex-col">
              <img src={f.miniatura_url} alt={f.pie ?? etiquetaDe(f.partido_id)} loading="lazy" className="w-full aspect-[4/3] object-cover bg-gray-100" />
              <div className="p-3 flex-1 flex flex-col gap-1">
                <p className="text-xs text-gray-500">{etiquetaDe(f.partido_id)}</p>
                {f.pie && <p className="text-sm text-gray-900 break-words">{f.pie}</p>}
                <div className="mt-auto pt-2 flex items-center gap-1">
                  <Button variante="fantasma" icono={<MessageCircle size={14} />} aria-label={`Ver comentarios (${f.comentarios_total})`} onClick={() => setVerComentarios(f)}>{f.comentarios_total}</Button>
                  <span className="text-xs text-gray-500 mr-auto">{f.me_gusta_total} me gusta</span>
                  <a href={urlDescarga(f)} aria-label="Descargar foto" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><Download size={14} aria-hidden /></a>
                  <Button variante="fantasma" aria-label="Editar foto" icono={<Pencil size={14} />} onClick={() => setEditar({ foto: f, pie: f.pie ?? "", partidoId: f.partido_id ?? "" })} />
                  <Button variante="fantasma" aria-label="Eliminar foto" icono={<Trash2 size={14} />} onClick={() => setAEliminar(f)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {siguiente && !cargando && (
        <div className="mt-4 text-center">
          <Button variante="secundario" cargando={cargandoMas} textoCargando="Cargando..." onClick={cargarMas}>Ver más</Button>
        </div>
      )}

      <Modal
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Editar foto"
        size="sm"
        bloquearCierre={pendiente}
        footer={
          <>
            <Button variante="secundario" onClick={() => setEditar(null)} disabled={pendiente}>Cancelar</Button>
            <Button onClick={guardarEdicion} cargando={pendiente} textoCargando="Guardando...">Guardar</Button>
          </>
        }
      >
        {editar && (
          <div className="space-y-4">
            <FormField label="Pie de foto" ayuda={`Opcional. Máximo ${MAX_PIE} caracteres.`}>
              {(p) => <textarea {...p} rows={3} maxLength={MAX_PIE} className={CLASE_INPUT} value={editar.pie} onChange={(e) => setEditar({ ...editar, pie: e.target.value })} />}
            </FormField>
            <FormField label="Dónde se muestra">
              {(p) => <select {...p} className={CLASE_INPUT} value={editar.partidoId} onChange={(e) => setEditar({ ...editar, partidoId: e.target.value })}>{opcionesPartido}</select>}
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!aEliminar}
        title="Eliminar foto"
        message="¿Eliminar esta foto de la liga?"
        consecuencias={["También se borran sus comentarios y sus me gusta.", "No se puede deshacer."]}
        confirmLabel="Eliminar foto"
        cargando={pendiente}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      />

      {verComentarios && (
        <ComentariosModal
          key={verComentarios.id}
          foto={verComentarios}
          onClose={() => setVerComentarios(null)}
          onBorrado={() => setFotos((actuales) => actuales.map((f) => (f.id === verComentarios.id ? { ...f, comentarios_total: Math.max(0, f.comentarios_total - 1) } : f)))}
        />
      )}
    </div>
  );
}
