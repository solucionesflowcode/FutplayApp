"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import ProfileForm from "@/components/perfil/ProfileForm";
import { iniciales } from "@/components/admin/ProfileDropdown";
import { Button, PageHeader, useToast } from "@/components/admin/ui";
import { useAuthUser } from "@/context";

/**
 * Foto del administrador. GEN-06: antes solo se cambiaba desde el modal del
 * menú del avatar; ahora todo el perfil se edita en esta página.
 */
function FotoPerfil() {
  const { user, usuario, refreshUser } = useAuthUser();
  const toast = useToast();
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nombre = usuario?.nombre || user?.email?.split("@")[0] || "Admin";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const subir = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Solo se permiten imágenes");
    if (file.size > 2 * 1024 * 1024) return toast.error("La imagen no puede superar 2 MB");
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/perfil/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo subir la foto", data.error);
        return;
      }
      await refreshUser();
      toast.exito("Foto actualizada");
    } catch {
      toast.error("Error de conexión", "Revisa tu internet e intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <section aria-label="Foto de perfil" className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 flex items-center gap-4">
      {avatarUrl ? (
        <img src={avatarUrl} alt="Tu foto de perfil" className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
      ) : (
        <span className="w-16 h-16 rounded-full bg-acento flex items-center justify-center text-[#001529] text-xl font-bold" aria-hidden>
          {iniciales(nombre)}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900">Foto de perfil</p>
        <p className="text-xs text-gray-500">JPG, PNG o WebP · máx. 2 MB</p>
        <Button variante="secundario" icono={<Camera size={16} />} cargando={subiendo} textoCargando="Subiendo..." onClick={() => inputRef.current?.click()}>
          Cambiar foto
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label="Subir foto de perfil"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) subir(f);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}

export default function AdminPerfilPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader titulo="Mi perfil" descripcion="Tus datos personales y tu foto." />
        <FotoPerfil />
        <ProfileForm />
      </div>
    </div>
  );
}
