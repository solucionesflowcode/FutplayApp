"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithGoogle } from "@/data/auth";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#001730] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#f59e0b] opacity-5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#f59e0b] opacity-5 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row w-full max-w-[850px] mx-4 bg-white border-t-2 border-t-[#f59e0b] shadow-2xl overflow-hidden">
        <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-[#002a58] to-[#001730] md:w-[45%] p-8 relative">
          <img src="/futplay-logo-original.svg" alt="FutPlay" className="w-24 mb-4" />
          <h2 className="text-2xl font-black text-white text-center">Futplay<span className="text-[#f59e0b]">.</span></h2>
          <p className="text-gray-400 text-xs text-center mt-2">Academia de fútbol de alto rendimiento</p>
          <div className="absolute bottom-6 left-6 right-6 text-center">
            <p className="text-gray-500 text-[8px]">© {new Date().getFullYear()} FutPlay™</p>
          </div>
        </div>

        <div className="flex flex-col justify-between md:w-[55%] p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <img src="/futplay-logo-original.svg" alt="FutPlay" className="w-8 h-8" />
            <span className="font-black text-lg text-[#002a58]">Futplay<span className="text-[#f59e0b]">.</span></span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="font-bold text-2xl md:text-3xl text-[#002a58] leading-tight">
              <span className="text-[#f59e0b]">Bienvenido</span>,<br />
              inicia sesión en tu cuenta.
            </h1>
            <p className="text-gray-400 text-sm mt-2 mb-8">Ingresa con Google</p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 transition-all px-6 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 font-semibold text-gray-700 text-sm disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {loading ? "Conectando..." : "Iniciar sesión con Google"}
            </button>
          </div>


        </div>
      </div>

      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm max-w-md">
          {error}
        </div>
      )}
    </div>
  );
}