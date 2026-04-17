"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const params = useSearchParams();
  const router = useRouter();
  const role = params.get("role");
  /* Hardcodeamos los tipos ya que no hemos conectaaado la base de datos con roles. 
  se usan asi en el navegador para probarlo
  http://localhost:3000/?role=user
  http://localhost:3000/?role=admin
  */
  useEffect(() => {
    if (!role) {
      router.replace("/home");
    } else if (role === "user") {
      router.replace("/dashboard?role=user");
    } else if (role === "admin") {
      router.replace("/admin?role=admin");
    }
  }, [role, router]);

  return <p>Redirigiendo...</p>;
}