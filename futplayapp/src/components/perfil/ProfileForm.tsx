"use client";

import { useEffect, useState } from "react";
import { User, Mail, Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type UsuarioData = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  rut: string | null;
  telefono: string | null;
};

export default function ProfileForm() {
  const [usuario, setUsuario] = useState<UsuarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [telefono, setTelefono] = useState("");

  const [rutError, setRutError] = useState<string | null>(null);
  const [telError, setTelError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerfil = async () => {
      const res = await fetch("/api/perfil");
      const data = await res.json();
      if (res.ok) {
        setUsuario(data);
        setNombre(data.nombre);
        setRut(data.rut || "");
        setTelefono(data.telefono || "");
        setEmail(data.email);
      }
      setLoading(false);
    };
    fetchPerfil();
  }, []);

  const formatRut = (value: string) => {
    let clean = value.replace(/[^0-9kK]/g, "").slice(0, 10);
    if (clean.length <= 1) return clean;
    const dv = clean.slice(-1);
    const nums = clean.slice(0, -1);
    const formatted = nums.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted}-${dv}`;
  };

  const validateRut = (value: string) => {
    if (!value) { setRutError(null); return; }
    if (!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(value)) {
      setRutError("Formato inválido. Use XX.XXX.XXX-X");
    } else {
      setRutError(null);
    }
  };

  const formatPhone = (value: string) => {
    let clean = value.replace(/[^0-9]/g, "");
    if (clean.startsWith("56")) clean = clean.slice(2);
    if (clean.length > 9) clean = clean.slice(0, 9);
    if (!clean) return "";
    if (clean.length <= 3) return `+56 9 ${clean}`;
    if (clean.length <= 6) return `+56 9 ${clean.slice(0, 3)} ${clean.slice(3)}`;
    return `+56 9 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  };

  const validatePhone = (value: string) => {
    if (!value) { setTelError(null); return; }
    const clean = value.replace(/\s/g, "");
    if (!/^(\+56)?9\d{8}$/.test(clean)) {
      setTelError("Formato inválido. Use +56 9 XXXX XXXX");
    } else {
      setTelError(null);
    }
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setRut(formatted);
    validateRut(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setTelefono(formatted);
    validatePhone(formatted);
  };

  const handleSave = async () => {
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }
    if (rutError || telError) { setError("Corrige los errores antes de guardar"); return; }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          rut: rut || null,
          telefono: telefono || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        setSaving(false);
        return;
      }
      setSuccess(true);
      setSaving(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#F39200]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-[#002447] to-[#00305B] border-t-2 border-t-[#F39200] shadow-xl border border-white/10 p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-[#F39200]/20 border-2 border-[#F39200]/30 flex items-center justify-center mb-4">
            <User size={36} className="text-[#F39200]" />
          </div>
          <h2 className="text-white text-lg font-bold">{usuario?.nombre || "Sin nombre"}</h2>
          <p className="text-white/50 text-sm mt-1">{email}</p>
          <span className="mt-3 px-4 py-1.5 rounded-full bg-[#F39200]/10 text-[#F39200] text-xs font-bold uppercase tracking-wider">
            {usuario?.rol || "jugador"}
          </span>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border-t-2 border-t-[#00305B] shadow-xl border border-slate-100 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#00305B]/10 p-2.5">
              <User size={18} className="text-[#00305B]" />
            </div>
            <h3 className="text-[#00305B] text-sm font-extrabold tracking-wide uppercase">
              Información Personal
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-[#001220] focus:outline-none focus:border-[#F39200] focus:ring-1 focus:ring-[#F39200]/30 transition"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">
                <Mail size={14} />
                <span>{email}</span>
              </div>
              <p className="text-[#94A3B8] text-[11px] mt-1">El email no se puede modificar</p>
            </div>

            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">
                RUT
              </label>
              <input
                type="text"
                value={rut}
                onChange={handleRutChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-[#001220] focus:outline-none focus:ring-1 transition ${
                  rutError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-200 focus:border-[#F39200] focus:ring-[#F39200]/30"
                }`}
                placeholder="XX.XXX.XXX-X"
              />
              {rutError && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {rutError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={handlePhoneChange}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-[#001220] focus:outline-none focus:ring-1 transition ${
                  telError
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                    : "border-gray-200 focus:border-[#F39200] focus:ring-[#F39200]/30"
                }`}
                placeholder="+56 9 XXXX XXXX"
              />
              {telError && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {telError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Rol
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#001220] capitalize">
                <Shield size={14} className="text-gray-400" />
                <span>{usuario?.rol || "jugador"}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div className="mt-5 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
              <CheckCircle2 size={14} /> Datos guardados correctamente
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#F39200] text-white text-sm font-bold rounded-lg hover:bg-[#E08400] disabled:opacity-50 transition shadow-sm"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              )}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
