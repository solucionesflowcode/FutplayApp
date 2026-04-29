"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  LayoutDashboard,
  MapPin,
  PersonStanding,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Crown
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Planes", href: "/planes", icon: Crown },
  { name: "Capsulas", href: "/capsules", icon: Users },
  { name: "Pagos", href: "/pagos", icon: MapPin },
  { name: "Mis Clases", href: "/misclases", icon: CalendarDays },
  { name: "Ayuda", href: "/ayuda", icon: Settings },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // persistencia segura para evitar sobreescritura errónea
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
    }
  }, [collapsed, isMounted]);

  const pathname = usePathname();

  return (
    <>
      {/* NAVEGACIÓN MÓVIL (TOP NAVBAR) */}
      <div className="md:hidden flex flex-col w-full bg-[#001529] text-white z-50">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold">FutPlay</h2>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Admin Panel</p>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menú desplegable móvil */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-in-out bg-[#001c37]
            ${open ? "max-h-[600px] opacity-100 py-1" : "max-h-0 opacity-0 py-0"}
          `}
        >
          <nav className="px-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  <div className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? "bg-[#F28C28] text-white shadow-md font-semibold"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }
                  `}>
                    <item.icon
                      size={20}
                      className={isActive ? "text-white" : "text-gray-500"}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}

            <div className="border-t border-gray-800 mt-4 pt-4 space-y-1">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all">
                <Settings size={20} />
                <span className="text-sm">Ajustes</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all">
                <LogOut size={20} />
                <span className="text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* SIDEBAR ESCRITORIO */}
      <aside className="hidden md:flex w-64 bg-[#001529] h-screen text-white flex-col p-4 shrink-0 overflow-y-auto">
        {/* Header */}
        <div className="mb-10 px-2">
          <h2 className="text-xl font-bold">FutPlay</h2>
          <p className="text-[10px] text-gray-500 tracking-widest uppercase">Admin Panel</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

            return (
              <Link key={item.name} href={item.href}>
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? "bg-[#F28C28] text-white shadow-md font-semibold"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
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
    </>
  );
}