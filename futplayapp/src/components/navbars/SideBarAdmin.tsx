"use client";

import { useEffect, useState } from "react";
import {
    Home,
    Calendar,
    CreditCard,
    Book,
    LogOut,
    LifeBuoy,
    Menu,
    ChevronLeft,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function SideBarAdmin({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // persistencia segura para evitar sobreescritura errónea temprana
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

    return (
        <div className="flex bg-[#f9fafb] min-h-screen">
            {/* SIDEBAR DESKTOP */}
            <aside
                className={`
          hidden md:flex flex-col h-screen sticky top-0 z-50 overflow-hidden bg-[#f5f7fa] border-r
          transition-all duration-300 ease-in-out shrink-0
          ${collapsed ? "w-20" : "w-64"}
        `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 h-16">
                    <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? "w-0 opacity-0" : "w-32 opacity-100"}`}>
                        <span className="font-bold text-[#004080] text-lg tracking-wide">Kinetic</span>
                    </div>

                    <button
                        onClick={() => setCollapsed(prev => !prev)}
                        className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-md shrink-0 transition-colors cursor-pointer relative z-50"
                        title="Contraer/Expandir menú"
                    >
                        <ChevronLeft
                            size={20}
                            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
                        />
                    </button>
                </div>

                {/* Menu */}
                <nav className="flex flex-col gap-2 px-3 mt-2 h-full overflow-y-auto no-scrollbar relative z-50">
                    <NavItem icon={Home} label="Home" href="/home" collapsed={collapsed} />
                    <NavItem icon={Calendar} label="Calendar" href="/calendar" collapsed={collapsed} />
                    <NavItem icon={Book} label="Content" href="/content" collapsed={collapsed} />
                    <NavItem icon={CreditCard} label="Payments" href="/payments" collapsed={collapsed} />
                    <NavItem icon={Book} label="My Classes" href="/classes" collapsed={collapsed} />

                    <button className={`mt-6 bg-orange-500 hover:bg-orange-600 text-white rounded-md font-bold transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap flex items-center justify-center shrink-0 shadow-sm hover:shadow ${collapsed ? "py-2 w-10 mx-auto" : "py-2.5 w-full px-4"}`}>
                        {collapsed ? "🔥" : "UPGRADE PLAN"}
                    </button>

                    <div className="mt-auto mb-4 flex flex-col gap-2">
                        <NavItem icon={LifeBuoy} label="Support" href="/support" collapsed={collapsed} />
                        <NavItem icon={LogOut} label="Logout" href="/logout" collapsed={collapsed} />
                    </div>
                </nav>
            </aside>

            {/* MOBILE  */}
            <div className="fixed inset-0 z-50 md:hidden pointer-events-none">
                {/* overlay */}
                <div
                    className={`
            absolute inset-0 bg-black/40 transition-opacity duration-300
            ${open ? "opacity-100 pointer-events-auto" : "opacity-0"}
          `}
                    onClick={() => setOpen(false)}
                />

                <aside
                    className={`
            absolute top-0 left-0 h-full w-64 bg-white p-4 shadow-xl
            transform transition-transform duration-300 flex flex-col pointer-events-auto
            ${open ? "translate-x-0" : "-translate-x-full"}
          `}
                >
                    <span className="font-bold text-[#004080] mb-8 mt-2 block px-2 text-xl">
                        Kinetic
                    </span>

                    <nav className="flex flex-col gap-2 px-1">
                        <NavItem icon={Home} label="Home" href="/home" />
                        <NavItem icon={Calendar} label="Calendar" href="/calendar" />
                        <NavItem icon={Book} label="Content" href="/content" />
                        <NavItem icon={CreditCard} label="Payments" href="/payments" />
                        <NavItem icon={Book} label="My Classes" href="/classes" />

                        <button className="mt-8 mb-4 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-md font-bold w-full mx-1 shadow-sm">
                            UPGRADE PLAN
                        </button>

                        <div className="mt-auto mb-4 flex flex-col gap-2">
                            <NavItem icon={LifeBuoy} label="Support" href="/support" />
                            <NavItem icon={LogOut} label="Logout" href="/logout" />
                        </div>
                    </nav>
                </aside>
            </div>

            {/* CONTENT */}
            <div className="flex-1 w-full pl-[10px] py-[10px] overflow-x-hidden relative z-0">
                {/* MOBILE TOPBAR */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm rounded-lg mb-4 border border-gray-100 relative z-10">
                    <button onClick={() => setOpen(true)} className="p-1 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                        <Menu className="text-[#004080]" />
                    </button>
                    <span className="font-bold text-[#004080]">FutPlay</span>
                </div>

                <main className="w-full relative z-0">{children}</main>
            </div>
        </div>
    );
}

function NavItem({
    icon: Icon,
    label,
    href,
    collapsed,
}: {
    icon: any;
    label: string;
    href: string;
    collapsed?: boolean;
}) {
    const pathname = usePathname();
    const active = pathname === href;

    return (
        <Link
            href={href}
            className={`
        flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 mb-1 cursor-pointer
        ${active
                    ? "bg-[#004080] text-white shadow-sm font-medium"
                    : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }
      `}
        >
            <Icon size={20} className={`shrink-0 transition-colors ${active ? "text-white" : "text-gray-500"}`} />

            <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed === true ? "w-0 opacity-0 ml-0" : "w-40 opacity-100 ml-3"}`}
            >
                {label}
            </span>
        </Link>
    );
}