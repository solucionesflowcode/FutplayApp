import { Search } from "lucide-react";
import { Bell } from "lucide-react";
import { Settings } from "lucide-react";
import { User } from "lucide-react";
import Link from "next/link";

export default function TopNavBarUser() {
    return (
        <nav className=" hidden md:flex flex-center items-center justify-between w-full px-4 h-[40px] bg-white">
            <div className="flex flex-center items-center">
                <Search size={20} className="text-[#004080]" />
                <input type="text" placeholder="Buscar Cursos, clases..." className="pl-[20px] focus:outline-none h-[15px] text-[14px]" />
            </div>
            <div className="flex gap-10 ">
                <div className="relative flex justify-center">
                    <p className="text-[#F39200] font-bold ">Clases restantes:5</p>
                    <div className="absolute bottom-0 w-[160px] h-[4px] bg-[#F39200]"></div>
                </div>
                <div className="flex gap-4">
                    <Link href="/notificaciones" className="hover:scale-110 transition-all"><Bell className="text-[#004080]" /></Link>
                    <Link href="/configuracion" className="hover:scale-110 transition-all"><Settings className="text-[#004080]" /></Link>
                    <Link href="/perfil" className="hover:scale-110 transition-all"><div className="w-[30px] h-[30px] rounded-full bg-gray-300 flex items-center justify-center"><User className="text-[#004080]" /></div></Link>

                </div>


            </div>

        </nav>

    )
}
