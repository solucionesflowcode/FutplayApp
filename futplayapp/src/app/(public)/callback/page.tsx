"use client";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";

export default function CallbackPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002a58] to-[#004080]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#002a58] to-[#004080] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#002a58]">Bienvenido!</h1>
        </div>

        {user ? (
          <>
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
              <img
                src={user.user_metadata?.avatar_url || "https://via.placeholder.com/50"}
                alt="Avatar"
                className="w-14 h-14 rounded-full"
              />
              <div>
                <p className="font-bold text-[#002a58]">
                  {user.user_metadata?.full_name || "Usuario"}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              {loggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-500 mb-4">No se encontró usuario</p>
            <a href="/login" className="text-[#f59e0b] font-bold hover:underline">
              Ir a Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
