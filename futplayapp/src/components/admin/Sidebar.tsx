"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthUser } from "@/context";

import { 
  Users, 
  BarChart3,
  BookOpen,
  Layers,
  Video,
  PersonStanding,
  CreditCard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";

const menuItems = [
  { name: "Analíticas", href: "/admin/analiticas", icon: BarChart3 },
  { name: "Usuarios", href: "/admin", icon: Users },
  { name: "Gestión de clases", href: "/admin/clases", icon: BookOpen },
  { name: "Gestión de módulos", href: "/admin/modulos", icon: Layers },
  { name: "Gestión de cápsulas", href: "/admin/capsulas", icon: Video },
  { name: "Profesores", href: "/admin/profesores", icon: PersonStanding },
  { name: "Gestión de planes", href: "/admin/planes", icon: CreditCard },
];

interface SidebarProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen = false, setMobileOpen }: SidebarProps) {

  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthUser();

  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Overlay para móviles */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      <aside className={`
        ${collapsed ? "w-20" : "w-64"}
        bg-[#001529] h-screen text-white flex flex-col p-4 shrink-0 transition-all duration-300
        fixed md:sticky top-0 left-0 z-50
        transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>

        {/* HEADER */}
        <div className="mb-10 flex items-center justify-between">

          {(!collapsed || mobileOpen) && (
            <div>
              <h2 className="text-xl font-bold">FutPlay</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Admin Panel
              </p>
            </div>
          )}

          {/* BOTÓN COLAPSAR (Desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-white/10 rounded-lg hidden md:block"
          >
            {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>

          {/* BOTÓN CERRAR (Mobile) */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="p-2 hover:bg-white/10 rounded-lg md:hidden"
          >
            <X size={18}/>
          </button>

        </div>

        {/* NAV */}
        <nav className="flex-1 space-y-2">

          {menuItems.map((item) => {

            const isActive = item.href === '/admin' 
              ? pathname === '/admin' 
              : pathname.startsWith(item.href);

            return (
              <Link key={item.name} href={item.href} onClick={() => setMobileOpen?.(false)}>
                <div className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? "bg-[#F28C28] text-white shadow-md font-semibold"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }
                `}>

                  <item.icon 
                    size={20}
                    className={isActive ? "text-white" : "text-gray-500 group-hover:text-white"}
                  />

                  {(!collapsed || mobileOpen) && (
                    <span className="text-sm">
                      {item.name}
                    </span>
                  )}

                </div>
              </Link>
            );
          })}

        </nav>

        {/* FOOTER */}
        <div className="border-t border-gray-800 pt-4 space-y-2">

          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-3 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl cursor-pointer">
            <LogOut size={20} />
            {(!collapsed || mobileOpen) && <span className="text-sm">Cerrar sesión</span>}
          </button>

        </div>

      </aside>
    </>
  );
}