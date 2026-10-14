"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuthUser } from "@/context";
import { User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Menú del avatar. GEN-06: "Editar perfil" lleva a /admin/perfil; antes abría
 * su propio modal (nombre y foto) y había dos formas distintas de editar el perfil.
 */
export default function ProfileDropdown() {
  const { user, usuario, signOut } = useAuthUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const alClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [open]);

  const displayName = usuario?.nombre || user?.email?.split("@")[0] || "Admin";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const avatar = (tam: string, texto: string) =>
    avatarUrl ? (
      <img src={avatarUrl} alt="" className={`${tam} rounded-full object-cover`} />
    ) : (
      <span className={`${tam} rounded-full bg-acento flex items-center justify-center text-[#001529] font-bold ${texto}`} aria-hidden>
        {iniciales(displayName)}
      </span>
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${displayName}`}
        className="flex items-center gap-2 p-0.5 rounded-full hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-gray-200"
      >
        {avatar("w-8 h-8", "text-xs")}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] py-2">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            {avatar("w-10 h-10", "text-sm")}
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
            </div>
          </div>

          <Link
            href="/admin/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <User size={16} className="text-gray-500" aria-hidden />
            Mi perfil
          </Link>

          <div className="border-t border-gray-100 mx-2" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
