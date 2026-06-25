"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthUser } from "@/context";
import { User, LogOut, Loader2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfileDropdown() {
  const { user, usuario, signOut, refreshUser } = useAuthUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayName = usuario?.nombre || user?.email?.split("@")[0] || "Admin";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const handleSaveName = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        setSaving(false);
        return;
      }
      await refreshUser();
      setEditing(false);
      setSaving(false);
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar 2MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/perfil/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al subir foto");
        setUploading(false);
        return;
      }
      await refreshUser();
      setUploading(false);
    } catch {
      setError("Error de conexión");
      setUploading(false);
    }
  };

  const openEdit = () => {
    setNombre(displayName);
    setError(null);
    setEditing(true);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 p-0.5 rounded-full hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-gray-200"
          title={displayName}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#F28C28] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[220px] py-2">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F28C28] flex items-center justify-center text-white text-sm font-bold">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
              </div>
            </div>

            <button
              onClick={openEdit}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <User size={16} className="text-gray-400" />
              Editar perfil
            </button>

            <div className="border-t border-gray-100 mx-2" />

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            {/* Photo */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#F28C28] flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-100">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : (
                    <Camera size={20} className="text-white" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Haz clic para cambiar foto</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadPhoto}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Tu nombre"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setEditing(false)}
                disabled={saving || uploading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveName}
                disabled={saving || uploading}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
