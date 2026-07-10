"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const state = params.get("state");

      if (error || !code) {
        router.replace("/login?error=auth");
        return;
      }

      const savedState = sessionStorage.getItem("oauth_state");
      sessionStorage.removeItem("oauth_state");
      if (!savedState || state !== savedState) {
        router.replace("/login?error=csrf");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/callback`;

        const res = await fetch("/api/auth/google/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri }),
        });

        if (!res.ok) {
          throw new Error("Token exchange failed");
        }

        const { idToken } = await res.json();

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });

        if (signInError) {
          console.error("Supabase signInWithIdToken error:", signInError.message);
          router.replace("/login?error=auth");
          return;
        }

        router.replace("/");
      } catch (e) {
        console.error("Auth callback error:", e);
        router.replace("/login?error=auth");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#f59e0b]" />
        <p className="text-gray-400 text-sm">Iniciando sesión...</p>
      </div>
    </div>
  );
}