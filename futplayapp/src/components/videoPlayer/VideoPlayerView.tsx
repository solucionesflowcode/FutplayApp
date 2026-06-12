"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Play,
  Lock,
  Clock,
  Download,
  Send,
  ChevronRight,
  Bookmark
} from "lucide-react";
import Link from "next/link";
import type { Capsula } from "@/data/capsules";
import type { Documento } from "@/data/documentos";
import type { Comentario } from "@/data/comentarios";
import { getComentariosByCapsulaId, createComentario } from "@/data/comentarios";
import { useAuthUser } from "@/context";

interface VideoPlayerViewProps {
  capsula: Capsula;
  hasMembership: boolean;
  documentos: Documento[];
  onUnlock?: () => void;
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function VideoPlayerView({ capsula, hasMembership, documentos, onUnlock }: VideoPlayerViewProps) {
  const { usuario } = useAuthUser();
  const [comment, setComment] = useState("");
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    getComentariosByCapsulaId(capsula.id).then(setComentarios);
  }, [capsula.id]);

  const handleSendComment = useCallback(async () => {
    const text = comment.trim();
    if (!text || !usuario) return;
    setSendingComment(true);
    const nuevo = await createComentario(capsula.id, usuario.id, text);
    if (nuevo) {
      setComentarios((prev) => [nuevo, ...prev]);
      setComment("");
    }
    setSendingComment(false);
  }, [comment, usuario, capsula.id]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header de Navegación Interna */}
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/capsules"
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight">{capsula.titulo}</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                {capsula.categoria} • {capsula.coach}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-800 hover:bg-gray-900 transition-all text-sm font-medium text-gray-400 hover:text-white">
              <Bookmark size={16} />
              Guardar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Área Principal (3 Columnas) */}
          <div className="lg:col-span-3 space-y-8">

            {/* Reproductor de Video */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl group">
              {!hasMembership ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center">
                  <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-[0_0_50px_rgba(37,99,235,0.1)]">
                    <Lock size={32} className="text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Contenido Exclusivo</h2>
                  <p className="text-gray-400 max-w-md mb-8">
                    Esta cápsula está disponible únicamente para miembros. Desbloquea todo el catálogo con una suscripción activa.
                  </p>
                  <Link
                    href="/planes"
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Obtener Membresía
                  </Link>
                </div>
              ) : !process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || !capsula.bunny_video_id ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 p-8 text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                    <Play size={24} className="text-red-500 opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Video no disponible</h3>
                  <p className="text-gray-400 text-sm max-w-xs">
                    {!process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID 
                      ? "Falta configuración técnica (Library ID). Por favor, contacta a soporte."
                      : "Esta cápsula no tiene un video vinculado todavía."}
                  </p>
                </div>
              ) : (
                <>
                  <iframe
                    src={`https://player.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID}/${capsula.bunny_video_id}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.4)] animate-pulse">
                      <Play size={32} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sección 'Acerca de' */}
            <section className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Acerca de esta cápsula</h3>
                <span className="px-3 py-1 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-full border border-blue-400/20">
                  Nivel Intermedio
                </span>
              </div>
              <div className="prose prose-invert max-w-none text-gray-400 leading-relaxed">
                {capsula.descripcion ? (
                  <p>{capsula.descripcion}</p>
                ) : (
                  <p className="text-gray-500 italic">Sin descripción disponible.</p>
                )}
              </div>
              <div className="flex items-center gap-6 mt-8 pt-8 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <Clock size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Duración</p>
                    <p className="text-sm font-semibold">{capsula.duracion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <Play size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Tipo</p>
                    <p className="text-sm font-semibold">Técnica Individual</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sección de Comentarios */}
            <section>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                Comunidad
                <span className="text-sm font-normal text-gray-500">({comentarios.length})</span>
              </h3>

              <div className="space-y-6">
                {/* Input Comentario */}
                {usuario && (
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(usuario.nombre || usuario.email || "U")} flex-shrink-0 flex items-center justify-center font-bold text-sm`}>
                      {getInitials(usuario.nombre || usuario.email || "TÚ")}
                    </div>
                    <div className="flex-1 space-y-3">
                      <textarea
                        placeholder="Comparte tu opinión o haz una pregunta..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-none"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleSendComment}
                          disabled={!comment.trim() || sendingComment}
                          className="flex items-center gap-2 px-6 py-2 bg-white text-gray-950 font-bold rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={14} />
                          {sendingComment ? "Enviando..." : "Enviar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista Comentarios */}
                <div className="space-y-8 pt-4">
                  {comentarios.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">
                      No hay comentarios aún. ¡Sé el primero en comentar!
                    </p>
                  ) : (
                    comentarios.map((c) => (
                      <div key={c.id} className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(c.usuario?.nombre || "U")} flex-shrink-0 flex items-center justify-center font-bold text-sm border-2 border-gray-950 shadow-lg`}>
                          {getInitials(c.usuario?.nombre || "?")}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3 mb-1">
                            <span className="font-bold text-sm">{c.usuario?.nombre || "Usuario"}</span>
                            <span className="text-xs text-gray-500">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {c.contenido}
                          </p>
                          <button className="mt-2 text-xs font-bold text-gray-500 hover:text-blue-400 transition-colors uppercase tracking-widest">
                            Responder
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* Barra Lateral (1 Columna) */}
          <aside className="space-y-8">

  

            {/* Recursos Descargables */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Material de apoyo</h4>
              {documentos.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Sin documentos disponibles.</p>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc) => {
                    const ext = doc.nombre.split(".").pop()?.toUpperCase() || "FILE";
                    const color = ext === "PDF" ? "red" : ext === "ZIP" ? "blue" : "gray";
                    return (
                      <a
                        key={doc.id}
                        href={doc.url_archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
                            <span className={`text-[10px] font-black text-${color}-500`}>{ext}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-300">{doc.nombre}</span>
                        </div>
                        <Download size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>

        </div>
      </main>

      {/* Footer / Mobile Nav Shim */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
