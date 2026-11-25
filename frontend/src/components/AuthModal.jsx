import React, { useState } from "react";
import { Scale, X, Loader2, ArrowRight, ShieldAlert, Laptop, Cloud } from "lucide-react";
import {
  getApiBase,
  obtenerModoMotor,
  establecerModoMotor,
  traducirError,
  registrarLogCliente
} from "../services/api";

export default function AuthModal({ modoInicial = "login", cerrar, alAutenticar }) {
  const [modo, setModo] = useState(modoInicial);
  const [modoMotorActual, setModoMotorActual] = useState(obtenerModoMotor());
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const forzarMotorLocal = () => {
    establecerModoMotor("local");
    setModoMotorActual("local");
    setError(null);
  };

  const procesarSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const endpoint = modo === "login" ? "/auth/login" : "/auth/register";
    const urlCompleta = `${getApiBase()}${endpoint}`;

    try {
      const cuerpo =
        modo === "login"
          ? { email, password }
          : { nombre, email, password };

      const res = await fetch(urlCompleta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detalle = data.detail || `Error HTTP ${res.status} al autenticar en ${urlCompleta}`;
        registrarLogCliente("AUTH_RECHAZADO", modo.toUpperCase(), detalle, urlCompleta);
        throw new Error(detalle);
      }

      registrarLogCliente("INFO", "AUTH_EXITO", `Sesión iniciada: ${data.usuario?.email} (${data.usuario?.rol})`, urlCompleta);
      alAutenticar(data.token, data.usuario);
      cerrar();
    } catch (err) {
      setError(traducirError(err, `Autenticación (${modo})`));
      setModoMotorActual(obtenerModoMotor());
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black w-full max-w-md p-8 relative shadow-2xl">
        <button
          type="button"
          onClick={cerrar}
          className="absolute top-4 right-4 text-neutral-500 hover:text-black p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-6 pr-6">
          <div className="flex items-center gap-2">
            <Scale className="w-7 h-7 text-blue-600 stroke-[2.2]" />
            <span className="text-xl font-extrabold text-blue-600">Abog</span>
            <span className="text-xl font-extrabold text-emerald-500 -ml-2">Hub</span>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-neutral-100 border border-neutral-300 flex items-center gap-1">
            <Cloud className="w-3 h-3 text-blue-600" />
            Acceso Cloud 24/7
          </span>
        </div>

        <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-1">
          {modo === "login" ? "Ingreso a la Plataforma" : "Inscripción de Usuario"}
        </h2>
        <p className="text-xs text-neutral-600 mb-6">
          {modo === "login"
            ? "Accede con tus credenciales verificadas para consultar al motor jurídico RAG o administrar la plataforma."
            : "Crea tu cuenta de Usuario en AbogHub IA para realizar consultas legales respaldadas por legislación peruana."}
        </p>

        <div className="grid grid-cols-2 border border-neutral-300 mb-6">
          <button
            type="button"
            onClick={() => {
              setModo("login");
              setError(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider transition ${
              modo === "login" ? "bg-black text-white" : "bg-neutral-50 text-neutral-600 hover:text-black"
            }`}
          >
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => {
              setModo("register");
              setError(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider transition ${
              modo === "register" ? "bg-black text-white" : "bg-neutral-50 text-neutral-600 hover:text-black"
            }`}
          >
            Inscripción
          </button>
        </div>

        <form onSubmit={procesarSubmit} className="space-y-4">
          {modo === "register" && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Nombre Completo o Estudio Jurídico
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Dr. Carlos Mendoza"
                className="w-full bg-neutral-50 border border-neutral-300 px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-black"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@aboghub.com"
              className="w-full bg-neutral-50 border border-neutral-300 px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Contraseña (Mínimo 6 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-50 border border-neutral-300 px-3.5 py-2.5 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border-l-4 border-rose-600 text-rose-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-[0.18em] py-3.5 flex items-center justify-center gap-2 transition"
          >
            {cargando ? (
              <>
                Verificando credenciales <Loader2 className="w-4 h-4 animate-spin" />
              </>
            ) : modo === "login" ? (
              <>
                Iniciar Sesión <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Crear Cuenta <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
