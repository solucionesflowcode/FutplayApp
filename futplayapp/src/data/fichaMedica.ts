import { createClient } from "@/utils/supabase/client";

export type FichaMedicaData = {
    edad: number;
    peso_kg: number;
    estatura_cm: number;
    imc: number;
    grupo_sanguineo: string;
    enfermedades: string;
    alergias: string;
    medicamentos: string;
    observaciones: string;
};

export async function updateUserProfile(
    userId: string,
    { rut, telefono }: { rut: string; telefono: string }
): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from("usuario")
        .update({ rut, telefono })
        .eq("id", userId);

    if (error) {
        console.error("Error updating user profile:", error.message);
        return false;
    }

    return true;
}

export async function createFichaMedica(
    userId: string,
    data: FichaMedicaData
): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from("ficha_medica")
        .insert({ usuario_id: userId, ...data });

    if (error) {
        console.error("Error creating ficha medica:", error.message);
        return false;
    }

    return true;
}

export async function userHasFichaMedica(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("ficha_medica")
        .select("usuario_id")
        .eq("usuario_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error checking ficha medica:", error.message);
        return false;
    }

    return data !== null;
}

export function calculateIMC(pesoKg: number, estaturaCm: number): number {
    const estaturaM = estaturaCm / 100;
    return parseFloat((pesoKg / (estaturaM * estaturaM)).toFixed(1));
}

export function getIMCStatus(imc: number): { label: string; color: string } {
    if (imc < 18.5) return { label: "Bajo peso", color: "text-blue-500" };
    if (imc < 25) return { label: "Normal", color: "text-green-500" };
    if (imc < 30) return { label: "Sobrepeso", color: "text-yellow-500" };
    return { label: "Obesidad", color: "text-red-500" };
}
