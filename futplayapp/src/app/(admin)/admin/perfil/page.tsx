"use client";

import { User } from "lucide-react";
import ProfileForm from "@/components/perfil/ProfileForm";

export default function AdminPerfilPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-1.5 h-12 bg-gradient-to-b from-[#F39200] to-[#60A5FA] rounded-full shrink-0" />
        <div>
          <h1 className="text-[28px] sm:text-[30px] font-black text-[#001220] tracking-tight leading-none">
            Mi Perfil
          </h1>
          <p className="text-[#64748B] text-[15px] mt-1 font-medium">
            Tus datos personales
          </p>
        </div>
      </div>
      <ProfileForm />
    </div>
  );
}
