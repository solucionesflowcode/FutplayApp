"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Heart, Send, X } from "lucide-react";
import { borrarComentarioFoto, comentarFoto, getComentariosFoto } from "@/data/ligas";
import { MAX_COMENTARIO, urlDescarga, type ComentarioFoto, type LigaFotoVista } from "@/lib/liga-fotos";
import BorrarConConfirmacion from "./BorrarConConfirmacion";

const ENFOCABLES = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])';

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", year: "numeric" });

type Props = {
  foto: LigaFotoVista;
  etiqueta: string | null;
  /** Abre con el foco en el campo de comentario (botón de comentarios de la tarjeta). */
  enfocarComentario: boolean;
  meGustaPendiente: boolean;
  /** Devuelve el mensaje de error, si lo hubo. */
  onMeGusta: () => Promise<string | null>;
  hayAnterior: boolean;
  haySiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
  onCerrar: () => void;
  onActualizar: (cambios: Partial<LigaFotoVista>) => void;
};

/** Datos, "me gusta" y comentarios de una foto. Se monta de nuevo al cambiar de foto. */
function PanelFoto({ foto, etiqueta, meGustaPendiente, onMeGusta, onActualizar }: Pick<Props, "foto" | "etiqueta" | "meGustaPendiente" | "onMeGusta" | "onActualizar">) {
  const [comentarios, setComentarios] = useState<ComentarioFoto[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    getComentariosFoto(foto.id)
      .then((lista) => { if (vigente) setComentarios(lista); })
      .catch(() => { if (vigente) setErrorCarga(true); });
    return () => { vigente = false; };
  }, [foto.id]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const nuevo = await comentarFoto(foto.id, texto);
      setComentarios((lista) => [...(lista ?? []), nuevo]);
      onActualizar({ comentarios_total: foto.comentarios_total + 1 });
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async (id: string) => {
    setError(null);
    try {
      await borrarComentarioFoto(id);
      setComentarios((lista) => (lista ?? []).filter((c) => c.id !== id));
      onActualizar({ comentarios_total: Math.max(0, foto.comentarios_total - 1) });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col min-h-0 md:h-full">
      <div className="p-4 border-b border-gray-100">
        {foto.pie && <p className="text-sm text-gray-900 mb-1 break-words">{foto.pie}</p>}
        <p className="text-xs text-gray-500">{etiqueta ?? "General de la liga"} · {fecha(foto.created_at)}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-pressed={foto.me_gusta}
            disabled={meGustaPendiente}
            onClick={async () => setError(await onMeGusta())}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold ${foto.me_gusta ? "text-rose-600" : "text-gray-600 hover:text-rose-600"}`}
          >
            <Heart size={18} aria-hidden fill={foto.me_gusta ? "currentColor" : "none"} />
            Me gusta · {foto.me_gusta_total}
          </button>
          <a href={urlDescarga(foto)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00305B] hover:underline">
            <Download size={18} aria-hidden />
            Descargar
          </a>
        </div>
      </div>

      <ul className="flex-1 md:overflow-y-auto p-4 space-y-3 min-h-0">
        {errorCarga && <li className="text-sm text-gray-500">No se pudieron cargar los comentarios.</li>}
        {!errorCarga && comentarios === null && <li className="text-sm text-gray-500">Cargando comentarios...</li>}
        {comentarios?.length === 0 && <li className="text-sm text-gray-500">Sé el primero en comentar.</li>}
        {comentarios?.map((c) => (
          <li key={c.id} className="flex gap-2">
            {c.autor.foto_url ? (
              <img src={c.autor.foto_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <span aria-hidden className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">{c.autor.nombre.slice(0, 1).toUpperCase()}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900">{c.autor.nombre} <span className="font-normal text-gray-500">· {fecha(c.created_at)}</span></p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.texto}</p>
            </div>
            {c.propio && <BorrarConConfirmacion etiqueta="Borrar mi comentario" onBorrar={() => borrar(c.id)} />}
          </li>
        ))}
      </ul>

      <form onSubmit={enviar} className="p-3 border-t border-gray-100">
        {error && <p role="alert" className="text-xs text-red-600 mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            aria-label="Escribe un comentario"
            placeholder="Escribe un comentario..."
            rows={2}
            maxLength={MAX_COMENTARIO}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 resize-none focus:outline-none focus:border-[#00305B]"
          />
          <button type="submit" aria-label="Enviar comentario" disabled={enviando || !texto.trim()} className="p-2.5 rounded-lg bg-[#00305B] text-white disabled:opacity-40">
            <Send size={16} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

/** Vista ampliada: flechas o teclado para navegar, Esc o la X para cerrar. */
export default function FotoVisor({ foto, etiqueta, enfocarComentario, meGustaPendiente, onMeGusta, hayAnterior, haySiguiente, onAnterior, onSiguiente, onCerrar, onActualizar }: Props) {
  const dialogo = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (enfocarComentario) dialogo.current?.querySelector("textarea")?.focus();
    else cerrar.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
    // Solo al abrir: cambiar de foto no debe mover el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teclado = (e: KeyboardEvent) => {
    if (e.key === "Escape") return onCerrar();
    // Dentro del comentario las flechas mueven el cursor, no cambian de foto.
    const escribiendo = (e.target as HTMLElement).tagName === "TEXTAREA";
    if (e.key === "ArrowLeft" && hayAnterior && !escribiendo) return onAnterior();
    if (e.key === "ArrowRight" && haySiguiente && !escribiendo) return onSiguiente();
    if (e.key === "Tab") {
      const enfocables = dialogo.current?.querySelectorAll<HTMLElement>(ENFOCABLES);
      if (!enfocables?.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  };

  const flecha = "absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80";

  return createPortal(
    <div ref={dialogo} role="dialog" aria-modal="true" aria-label="Foto del campeonato" onKeyDown={teclado} className="fixed inset-0 z-50 bg-white flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      <div className="relative bg-black h-[60vh] md:h-full md:flex-1 min-w-0 shrink-0 flex items-center justify-center">
        <img key={foto.id} src={foto.url} alt={foto.pie ?? etiqueta ?? "Foto del campeonato"} className="max-w-full max-h-full object-contain" />
        <button ref={cerrar} type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80">
          <X size={20} aria-hidden />
        </button>
        {hayAnterior && (
          <button type="button" aria-label="Foto anterior" onClick={onAnterior} className={`${flecha} left-3`}><ChevronLeft size={22} aria-hidden /></button>
        )}
        {haySiguiente && (
          <button type="button" aria-label="Foto siguiente" onClick={onSiguiente} className={`${flecha} right-3`}><ChevronRight size={22} aria-hidden /></button>
        )}
      </div>
      <aside className="w-full md:w-96 md:h-full shrink-0">
        <PanelFoto key={foto.id} foto={foto} etiqueta={etiqueta} meGustaPendiente={meGustaPendiente} onMeGusta={onMeGusta} onActualizar={onActualizar} />
      </aside>
    </div>,
    document.body,
  );
}
