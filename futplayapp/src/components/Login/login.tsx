"use client";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/login-background.svg')] bg-contain flex items-center justify-center">
      <div className="flex justify-center w-[850px] h-[500px] md:h-[500px] md:w-[650px] bg-transparent md:bg-white border-0 md:border-2 md:border-gray-200 rounded-none md:rounded-[20px] shadow-none md:shadow-[0px_7px_18px_-4px_rgba(0,_0,_0,_0.35)]">
        <div className="hidden md:block relative flex items-center justify-center bg-[#FFAD91] md:w-[50%] m-[8px] rounded-[12px]">


          <img src="/login-image-player.svg" alt="" className="hidden md:block" />
          <img src="/futplay-logo.svg" alt="" className="absolute bottom-0 left-0 w-[80px] m-2 hidden md:block" />
          <p className="absolute bottom-0 right-0 text-white text-[8px] m-2 hidden md:block">Derechos reservados FutPlay™</p>


        </div>
        <div className=" flex flex-col   justify-between md:w-[50%]  m-[8px] ">
          <div>
            <p className="hidden md:block font-bold  text-[12px]">FutPlay™</p>
            <p className="hidden md:block text-[#999999] text-[10px]">Academia de futbol de alto rendimiento.</p>
          </div>
          <div>
            <div>
              <img src="/futplay-logo-original.svg" alt="" className="w-[180px] mx-auto mb-2 md:hidden" />
              <p className="font-regular text-[28px] text-center leading-none"><span className="text-[#F39200]">Bienvenido</span>, Inicia <br />
                sesion en tu cuenta.</p>
              <p className="text-[#999999] text-[14px] mb-[40px] mt-[10px] text-center">Ingresa con Google</p>
            </div>
            <div className="flex flex-col gap-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className=" w-full flex items-center justify-center gap-3 bg-[#EAEAEA] hover:bg-gray-50 transition-all px-6 py-[10px] rounded-xl border-1 border-[#B4B4B4] font-bold text-[#505050] text-[12px] disabled:opacity-50 cursor-pointer shadow-md"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {loading ? "Conectando..." : "Iniciar Sesion Con Google"}
              </button>
              <div className="flex items-center gap-2 justify-center">
                <span className="w-[25%] h-[.5px] bg-[#999999]"></span>
                <p className="text-[#999999] text-[10px]">¿No tienes una cuenta?</p>
                <span className="w-[25%] h-[.5px] bg-[#999999]"></span>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-[#EAEAEA] hover:bg-gray-50 transition-all px-6 py-[10px] rounded-xl font-bold border-1 border-[#B4B4B4] text-[#505050] text-[12px] disabled:opacity-50 cursor-pointer shadow-md"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {loading ? "Conectando..." : "Registrarse con Google"}
              </button>
            </div>

          </div>
          <p className=" text-center md:text-start text-[#999999] text-[12px] m-1  ">¿Necesitas ayuda?</p>
        </div>

      </div>


      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}




    </div>

  );
}
