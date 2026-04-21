"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  LayoutDashboard, 
  MapPin, 
  PersonStanding, 
  CalendarDays, 
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }, 
  { name: "Alumnos", href: "/admin", icon: Users }, 
  { name: "Sedes", href: "/admin/sedes", icon: MapPin },
  { name: "Profesores", href: "/admin/profesores", icon: PersonStanding },
  { name: "Horarios", href: "/admin/horarios", icon: CalendarDays },
  { name: "Analíticas", href: "/admin/analiticas", icon: BarChart3 },
];

export default function Sidebar() {
 
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#001529] h-screen text-white flex flex-col p-4 shrink-0">
      
      {/* Header */}
      <div className="mb-10 px-2">
        <h2 className="text-xl font-bold">FutPlay</h2>
        <p className="text-[10px] text-gray-500 tracking-widest uppercase">Admin Panel</p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
         
          const isActive = item.href === '/admin' 
            ? pathname === '/admin' 
            : pathname.startsWith(item.href);

          return (
            <Link key={item.name} href={item.href}>
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? "bg-[#F28C28] text-white shadow-md font-semibold" // Activo: NARANJA
                  : "text-gray-400 hover:bg-white/5 hover:text-white"  // Inactivo
                }
              `}>
                <item.icon 
                  size={20} 
                  className={isActive ? "text-white" : "text-gray-500 group-hover:text-white"} 
                />
                <span className="text-sm">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 pt-4 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
          <Settings size={20} />
          <span className="text-sm">Ajustes</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all">
          <LogOut size={20} />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}