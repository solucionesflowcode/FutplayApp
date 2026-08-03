import { createClient } from "@/utils/supabase/client";

export type FichaMedicaData = {
    fecha_nacimiento: string;
    peso_kg: number;
    estatura_cm: number;
    imc: number;
    grupo_sanguineo: string;
    enfermedades: string;
    alergias: string;
    medicamentos: string;
    observaciones: string;
    perfil: string;
    historial_lesiones: string;
    afecciones_cardiacas: string;
};

export type ResultadoEscritura = {
    ok: boolean;
    error: string | null;
};

export function calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

export async function updateUserProfile(
    userId: string,
    { rut, telefono }: { rut: string; telefono: string }
): Promise<ResultadoEscritura> {
    const supabase = createClient();

    const { error } = await supabase
        .from("usuario")
        .update({ rut, telefono })
        .eq("id", userId);

    if (error) {
        console.error("Error updating user profile:", error.message);
        return { ok: false, error: error.message };
    }

    return { ok: true, error: null };
}

export async function createFichaMedica(
    userId: string,
    data: FichaMedicaData
): Promise<ResultadoEscritura> {
    const supabase = createClient();

    const { error } = await supabase
        .from("ficha_medica")
        .upsert({ usuario_id: userId, ...data });

    if (error) {
        console.error("Error creating ficha medica:", error.message);
        return { ok: false, error: error.message };
    }

    return { ok: true, error: null };
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

export async function getFichaMedicaByUser(userId: string): Promise<FichaMedicaData & { usuario_id: string } | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("ficha_medica")
        .select("*")
        .eq("usuario_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching ficha medica:", error.message);
        return null;
    }

    return data as (FichaMedicaData & { usuario_id: string }) | null;
}

export function calculateIMC(pesoKg: number, estaturaCm: number): number {
    if (!Number.isFinite(pesoKg) || !Number.isFinite(estaturaCm) || pesoKg <= 0 || estaturaCm <= 0) {
        return 0;
    }
    const estaturaM = estaturaCm / 100;
    const imc = pesoKg / (estaturaM * estaturaM);
    if (!Number.isFinite(imc)) return 0;
    return parseFloat(imc.toFixed(1));
}

export function getIMCStatus(imc: number): { label: string; color: string } {
    if (imc < 18.5) return { label: "Bajo peso", color: "text-blue-500" };
    if (imc < 25) return { label: "Normal", color: "text-green-500" };
    if (imc < 30) return { label: "Sobrepeso", color: "text-yellow-500" };
    return { label: "Obesidad", color: "text-red-500" };
}
