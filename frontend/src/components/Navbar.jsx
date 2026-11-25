import React from "react";
import {
  Scale,
  Database,
  CheckCircle2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Users,
  Laptop,
  Cloud
} from "lucide-react";

export default function Navbar({
  estadoDB,
  usuario,
  modoMotor,
  cambiarModoMotor,
  mostrarPanelIngesta,
  setMostrarPanelIngesta,
  abrirModalAuth,
  abrirModalUsuarios,
  cerrarSesion
}) {
  const esAdminOSuper = usuario && (usuario.rol === "superadmin" || usuario.rol === "admin");
  const esSuperadmin = usuario && usuario.rol === "superadmin";

  const etiquetaRol = {
    superadmin: "SUPERADMIN",
    admin: "ADMIN",
    usuario: "USUARIO"
  };

  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-2 shrink-0">
        <Scale className="w-7 h-7 text-blue-600 stroke-[2.2] shrink-0" />
        <div className="flex items-center tracking-tight">
          <span className="text-2xl font-extrabold text-blue-600">Abog</span>
          <span className="text-2xl font-extrabold text-emerald-500">Hub</span>
          <span className="ml-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] px-2.5 py-1 bg-neutral-100 text-neutral-800 border border-neutral-300 whitespace-nowrap">
            IA Jurídica Peruana
          </span>
        </div>
      </div>

      <nav className="flex flex-wrap items-center gap-5 text-[11px] font-bold tracking-[0.15em] uppercase text-neutral-600">
        <a href="https://www.aboghub.com/" target="_blank" rel="noreferrer" className="hover:text-black transition whitespace-nowrap">
          Marketplace
        </a>
        <a href="https://www.aboghub.com/" target="_blank" rel="noreferrer" className="hover:text-black transition whitespace-nowrap">
          Mercado de Casos
        </a>

        {esAdminOSuper && (
          <button
            type="button"
            onClick={() => setMostrarPanelIngesta(!mostrarPanelIngesta)}
            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>{mostrarPanelIngesta ? "Ocultar Ingesta" : "Alimentar Base Legal"}</span>
            {mostrarPanelIngesta ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
          </button>
        )}

        {esSuperadmin && (
          <button
            type="button"
            onClick={abrirModalUsuarios}
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Gestión de Roles</span>
          </button>
        )}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        {false && esSuperadmin && (
          <div
            title="Switch exclusivo de Superadmin: Alterna entre tu Laptop Local (Demo) y Hugging Face Cloud (24/7)"
            className="flex items-center border-2 border-black bg-neutral-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => cambiarModoMotor("local")}
              className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition whitespace-nowrap ${
                modoMotor === "local" ? "bg-black text-white" : "text-neutral-600 hover:text-black"
              }`}
            >
              <Laptop className="w-3 h-3" />
              Demo Laptop
            </button>
            <button
              type="button"
              onClick={() => cambiarModoMotor("cloud")}
              className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition whitespace-nowrap ${
                modoMotor === "cloud" ? "bg-blue-600 text-white" : "text-neutral-600 hover:text-black"
              }`}
            >
              <Cloud className="w-3 h-3" />
              Cloud 24/7
            </button>
          </div>
        )}

        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 border border-neutral-200 text-xs whitespace-nowrap">
          <span className="uppercase tracking-wider text-[10px] font-bold text-neutral-500">Base:</span>
          {estadoDB.conectado ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {estadoDB.registros} Artículos
            </span>
          ) : (
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Offline
            </span>
          )}
        </div>

        {usuario ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-neutral-300 bg-neutral-50 px-3 py-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-left leading-tight">
                <span className="block text-xs font-bold text-black whitespace-nowrap">{usuario.nombre}</span>
                <span className="block text-[9px] font-extrabold uppercase tracking-widest text-blue-600">
                  {etiquetaRol[usuario.rol] || usuario.rol}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              title="Cerrar sesión"
              className="border border-neutral-300 hover:border-black p-2 text-neutral-700 hover:text-black transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => abrirModalAuth("login")}
              className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-700 hover:text-black px-3 py-2 transition whitespace-nowrap"
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => abrirModalAuth("register")}
              className="bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-[0.16em] px-4 py-2.5 transition whitespace-nowrap"
            >
              Inscripción
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
