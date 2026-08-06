import ProfesorClient from "./profesor-client";
import { AuthGuard } from "@/context";

export default function ProfesorPage() {
  return (
    <AuthGuard allowedRoles={["profesor"]}>
      <ProfesorClient />
    </AuthGuard>
  );
}
