"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/context";

import {
  Users,
  BarChart3,
  BookOpen,
  Layers,
  Video,
  PersonStanding,
  CreditCard,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  User
} from "lucide-react";

// Los nombres coinciden con el título de cada pantalla (GEN-03).
const menuItems = [
  { name: "Analíticas", href: "/admin/analiticas", icon: BarChart3 },
  { name: "Gestión de usuarios", href: "/admin", icon: Users },
  { name: "Gestión de clases", href: "/admin/clases", icon: BookOpen },
  { name: "Gestión de módulos", href: "/admin/modulos", icon: Layers },
  { name: "Gestión de cápsulas", href: "/admin/capsulas", icon: Video },
  { name: "Gestión de profesores", href: "/admin/profesores", icon: PersonStanding },
  { name: "Gestión de planes", href: "/admin/planes", icon: CreditCard },
  { name: "Gestión de membresías", href: "/admin/membresias", icon: ShieldCheck },
  { name: "Mi perfil", href: "/admin/perfil", icon: User },
];

const CLAVE_COLAPSADO = "admin-menu-colapsado";

function leerColapsado(): boolean {
  try {
    return localStorage.getItem(CLAVE_COLAPSADO) === "1";
  } catch {
    return false;
  }
}

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthUser();

  // GEN-05: el estado colapsado se recuerda entre visitas (antes volvía a abrirse).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Se lee después de montar: en el servidor no hay localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (leerColapsado()) setCollapsed(true);
  }, []);

  const alternarColapsado = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(CLAVE_COLAPSADO, c ? "0" : "1"); } catch { /* sin storage: solo esta visita */ }
      return !c;
    });
  };

  // Escape cierra el menú en móvil.
  useEffect(() => {
    if (!mobileOpen) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen?.(false); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [mobileOpen, setMobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // En móvil el menú siempre se ve completo; colapsar es solo de escritorio.
  const soloIconos = collapsed && !mobileOpen;

  return (
    <>
      {/* Overlay para móviles */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen?.(false)}
          aria-hidden
        />
      )}

      <aside
        id="admin-menu"
        aria-label="Menú del administrador"
        className={`
          w-64 ${collapsed ? "md:w-20" : "md:w-64"}
          bg-[#001529] h-screen text-white flex flex-col p-4 shrink-0 transition-all duration-300
          fixed md:sticky top-0 left-0 z-50
          transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        {/* HEADER */}
        <div className={`mb-10 flex items-center ${soloIconos ? "md:justify-center" : "justify-between"}`}>
          <div className={soloIconos ? "md:hidden" : ""}>
            <p className="text-xl font-bold">FutPlay</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin Panel</p>
          </div>

          {/* Colapsar (escritorio) */}
          <button
            type="button"
            onClick={alternarColapsado}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            aria-expanded={!collapsed}
            aria-controls="admin-menu"
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            className="p-2 hover:bg-white/10 rounded-lg hidden md:block"
          >
            {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
          </button>

          {/* Cerrar (móvil) */}
          <button
            type="button"
            onClick={() => setMobileOpen?.(false)}
            aria-label="Cerrar menú"
            className="p-2 hover:bg-white/10 rounded-lg md:hidden"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 space-y-2" aria-label="Secciones">
          {menuItems.map((item) => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen?.(false)}
                aria-current={isActive ? "page" : undefined}
                // Colapsado solo hay íconos: el nombre va como tooltip y nombre accesible.
                title={soloIconos ? item.name : undefined}
                aria-label={soloIconos ? item.name : undefined}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                  ${soloIconos ? "md:justify-center" : ""}
                  ${isActive
                    // Texto oscuro sobre el naranja: blanco no llega al contraste AA (≈ 2,6:1).
                    ? "bg-acento text-[#001529] shadow-md font-semibold"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <item.icon
                  size={20}
                  aria-hidden
                  className={isActive ? "text-[#001529]" : "text-gray-400 group-hover:text-white"}
                />
                <span className={`text-sm ${soloIconos ? "md:sr-only" : ""}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="border-t border-gray-800 pt-4 space-y-2">
          <button
            type="button"
            onClick={handleSignOut}
            title={soloIconos ? "Cerrar sesión" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg ${soloIconos ? "md:justify-center" : ""}`}
          >
            <LogOut size={20} aria-hidden />
            <span className={`text-sm ${soloIconos ? "md:sr-only" : ""}`}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
