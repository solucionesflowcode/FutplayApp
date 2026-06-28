"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthUser } from "@/context";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UserDropdown() {
  const { user, usuario, signOut } = useAuthUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayName = usuario?.nombre || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-0.5 rounded-full hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-gray-200 cursor-pointer"
        title={displayName}
      >
        <div className="w-8 h-8 rounded-full bg-[#F28C28] flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[200px] py-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
          </div>

          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <User size={16} className="text-gray-400" />
            Mi Perfil
          </Link>

          <div className="border-t border-gray-100 mx-2" />

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
