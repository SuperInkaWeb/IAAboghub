import React from "react";
import { ArrowRight, BookOpen, Search, Loader2 } from "lucide-react";
import { formatearTextoLegal } from "../utils/formatText";

export default function ChatPanel({
  historial,
  pregunta,
  setPregunta,
  cargandoConsulta,
  enviarConsulta,
  setFuentesActivas,
  finChatRef
}) {
  return (
    <div className="lg:col-span-7 flex flex-col justify-between border border-neutral-200 bg-white">
      <div className="p-6 space-y-6 max-h-[540px] overflow-y-auto">
        {historial.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.rol === "usuario" ? "items-end" : "items-start"}`}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-1.5">
              {msg.rol === "usuario"
                ? "Tu Consulta Jurídica"
                : msg.modo === "cliente"
                ? "AbogHub IA • Orientación al Ciudadano"
                : "AbogHub IA • Dictamen para Abogados"}
            </div>

            <div
              className={`max-w-[92%] p-5 text-sm leading-relaxed ${
                msg.rol === "usuario"
                  ? "bg-black text-white font-medium"
                  : msg.esError
                  ? "bg-rose-50 border-l-4 border-rose-600 text-rose-900"
                  : "bg-neutral-50 border-l-4 border-blue-600 text-neutral-900"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {msg.rol === "asistente" ? formatearTextoLegal(msg.texto) : msg.texto}
                {msg.enStream && (
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse align-middle" />
                )}
              </div>

              {msg.rol === "asistente" && msg.modo === "cliente" && !msg.enStream && msg.fuentes?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between bg-white p-3 border">
                  <span className="text-xs font-medium text-neutral-700">
                    ¿Necesitas representación legal para este caso?
                  </span>
                  <a
                    href="https://www.aboghub.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-black text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full flex items-center gap-1 hover:bg-neutral-800 transition"
                  >
                    Conectar con Abogado <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}

              {msg.fuentes && msg.fuentes.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-neutral-200 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  <span>
                    {msg.origenMotor === "cloud" ? "Motor Cloud 24/7 (Modal GPU)" : "Motor Demo Laptop"}: {msg.modelo}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFuentesActivas(msg.fuentes)}
                    className="text-blue-600 hover:text-black font-bold flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Ver {msg.fuentes.length} artículos verificados →
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={finChatRef} />
      </div>

      <form
        onSubmit={(e) => enviarConsulta(e)}
        className="bg-neutral-100 border-t-2 border-black p-3 flex items-center gap-3"
      >
        <Search className="w-5 h-5 text-neutral-400 ml-2 shrink-0" />
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="BUSCA POR ARTÍCULO, LEY PERUANA O ESCRIBE TU CONSULTA LEGAL..."
          className="flex-1 bg-transparent py-2.5 text-xs md:text-sm font-medium text-black placeholder-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={cargandoConsulta || !pregunta.trim()}
          className="bg-black hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-[0.16em] px-6 py-3 rounded-full flex items-center gap-2 shrink-0 transition"
        >
          {cargandoConsulta ? (
            <>
              Analizando <Loader2 className="w-4 h-4 animate-spin" />
            </>
          ) : (
            <>
              Buscar Ahora <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
