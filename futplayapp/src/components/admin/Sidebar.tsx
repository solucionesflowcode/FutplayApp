"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { 
  Users, 
  BarChart3,
  BookOpen,
  Layers,
  Video,
  PersonStanding,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const menuItems = [
  { name: "Analíticas", href: "/admin/analiticas", icon: BarChart3 },
  { name: "Alumnos", href: "/admin", icon: Users },
  { name: "Gestión de clases", href: "/admin/clases", icon: BookOpen },
  { name: "Gestión de módulos", href: "/admin/modulos", icon: Layers },
  { name: "Gestión de cápsulas", href: "/admin/capsulas", icon: Video },
  { name: "Profesores", href: "/admin/profesores", icon: PersonStanding },
];

export default function Sidebar() {

  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`
      ${collapsed ? "w-20" : "w-64"}
      bg-[#001529] h-screen text-white flex flex-col p-4 shrink-0 transition-all duration-300
    `}>

      {/* HEADER */}
      <div className="mb-10 flex items-center justify-between">

        {!collapsed && (
          <div>
            <h2 className="text-xl font-bold">FutPlay</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Admin Panel
            </p>
          </div>
        )}

        {/* BOTÓN COLAPSAR */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-white/10 rounded-lg"
        >
          {collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
        </button>

      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-2">

        {menuItems.map((item) => {

          const isActive = item.href === '/admin' 
            ? pathname === '/admin' 
            : pathname.startsWith(item.href);

          return (
            <Link key={item.name} href={item.href}>
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

                {!collapsed && (
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

        <button className="w-full flex items-center gap-3 px-3 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl">
          <Settings size={20} />
          {!collapsed && <span className="text-sm">Ajustes</span>}
        </button>

        <button className="w-full flex items-center gap-3 px-3 py-3 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl">
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>

      </div>

    </aside>
  );
}