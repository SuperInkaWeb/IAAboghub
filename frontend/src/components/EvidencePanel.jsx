import React from "react";
import { Scale, BookOpen } from "lucide-react";

export default function EvidencePanel({ fuentesActivas }) {
  return (
    <div className="lg:col-span-5 flex flex-col border border-neutral-200 bg-neutral-50 p-6 max-h-[630px] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-neutral-300 pb-3 mb-4">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-black flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Fundamento Legal Recuperado
        </h2>
        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-black text-white">
          {fuentesActivas.length} Artículos
        </span>
      </div>

      {fuentesActivas.length === 0 ? (
        <div className="flex-1 border border-dashed border-neutral-300 bg-white flex flex-col items-center justify-center text-center p-8 text-neutral-500 text-xs">
          <Scale className="w-10 h-10 text-neutral-300 mb-3" />
          <p className="font-bold uppercase tracking-wider text-neutral-700 mb-1">
            Sin Evidencia Seleccionada
          </p>
          <p>
            Ingresa tu consulta legal en la barra de búsqueda para visualizar en tiempo real los artículos exactos de la legislación peruana recuperados desde Supabase.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fuentesActivas.map((doc, idx) => {
            const porcentaje = doc.similitud ? (doc.similitud * 100).toFixed(1) : "—";
            return (
              <div
                key={doc.id || idx}
                className="bg-white border border-neutral-200 hover:border-black transition p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600 block">
                      Norma {idx + 1} • {doc.fuente}
                    </span>
                    <h3 className="text-sm font-black text-black mt-0.5">{doc.referencia}</h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                    {porcentaje}% relevancia
                  </span>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap border-t border-neutral-200 pt-3">
                  {doc.contenido}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
