import React, { useState, useEffect } from "react";
import { Upload, Sparkles, Loader2, SlidersHorizontal, Laptop, Cloud, Save } from "lucide-react";
import {
  getApiBase,
  obtenerHeadersAuth,
  obtenerUrlCloud,
  establecerUrlCloud,
  obtenerUrlLocal,
  establecerUrlLocal
} from "../services/api";

export default function IngestionDrawer({
  usuario,
  modoMotor,
  cambiarModoMotor,
  modelo,
  setModelo,
  umbral,
  setUmbral,
  limite,
  setLimite,
  alCompletarIngesta
}) {
  const [modoIngesta, setModoIngesta] = useState("pdf");
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [urlNorma, setUrlNorma] = useState("");
  const [fuenteIngesta, setFuenteIngesta] = useState("Legislación Peruana");
  const [referenciaIngesta, setReferenciaIngesta] = useState("");
  const [cargandoIngesta, setCargandoIngesta] = useState(false);
  const [mensajeIngesta, setMensajeIngesta] = useState(null);

  const [urlLocalInput, setUrlLocalInput] = useState(obtenerUrlLocal());
  const [urlCloudInput, setUrlCloudInput] = useState(obtenerUrlCloud());
  const [guardadoRutas, setGuardadoRutas] = useState(false);

  useEffect(() => {
    setUrlLocalInput(obtenerUrlLocal());
    setUrlCloudInput(obtenerUrlCloud());
  }, [modoMotor]);

  const guardarRutasServidor = (e) => {
    e.preventDefault();
    establecerUrlLocal(urlLocalInput);
    establecerUrlCloud(urlCloudInput);
    setGuardadoRutas(true);
    setTimeout(() => setGuardadoRutas(false), 2500);
    alCompletarIngesta();
  };

  const procesarIngesta = async (e) => {
    e.preventDefault();
    setMensajeIngesta(null);

    if (!referenciaIngesta.trim()) {
      setMensajeIngesta({ tipo: "error", texto: "Ingresa la referencia de la ley o norma." });
      return;
    }

    setCargandoIngesta(true);

    try {
      const baseActiva = getApiBase();
      let res;
      if (modoIngesta === "pdf") {
        if (!archivoPdf) {
          throw new Error("Selecciona un archivo PDF primero.");
        }
        const formData = new FormData();
        formData.append("archivo", archivoPdf);
        formData.append("fuente", fuenteIngesta);
        formData.append("referencia", referenciaIngesta);

        res = await fetch(`${baseActiva}/ingestar-pdf`, {
          method: "POST",
          headers: obtenerHeadersAuth(false),
          body: formData
        });
      } else {
        if (!urlNorma.trim()) {
          throw new Error("Ingresa una URL válida.");
        }
        res = await fetch(`${baseActiva}/ingestar-norma`, {
          method: "POST",
          headers: obtenerHeadersAuth(true),
          body: JSON.stringify({
            url: urlNorma,
            fuente: fuenteIngesta,
            referencia: referenciaIngesta
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Error durante la ingesta");
      }

      const omitidos = data.fragmentos_omitidos_duplicados || 0;
      const detalleDuplicados = omitidos > 0 ? ` (${omitidos} duplicados omitidos)` : "";

      setMensajeIngesta({
        tipo: "exito",
        texto: `Ingesta completada: ${data.fragmentos_insertados} fragmentos nuevos (${data.metodo_segmentacion}) guardados${detalleDuplicados}.`
      });
      setReferenciaIngesta("");
      setUrlNorma("");
      setArchivoPdf(null);
      alCompletarIngesta();
    } catch (err) {
      setMensajeIngesta({ tipo: "error", texto: err.message });
    } finally {
      setCargandoIngesta(false);
    }
  };

  return (
    <section className="bg-neutral-50 border-b border-neutral-200 px-8 py-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-neutral-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-black flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600 shrink-0" />
              Ingesta y Vectorización de Normas Oficiales
            </h3>
            <div className="flex border border-neutral-300 shrink-0">
              <button
                type="button"
                onClick={() => setModoIngesta("pdf")}
                className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  modoIngesta === "pdf" ? "bg-black text-white" : "bg-white text-neutral-600 hover:text-black"
                }`}
              >
                Subir PDF Oficial
              </button>
              <button
                type="button"
                onClick={() => setModoIngesta("url")}
                className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                  modoIngesta === "url" ? "bg-black text-white" : "bg-white text-neutral-600 hover:text-black"
                }`}
              >
                URL El Peruano
              </button>
            </div>
          </div>

          <form onSubmit={procesarIngesta} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  {modoIngesta === "pdf" ? "Archivo PDF (.pdf)" : "URL de la Norma"}
                </label>
                {modoIngesta === "pdf" ? (
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setArchivoPdf(e.target.files?.[0] || null)}
                    className="w-full text-xs text-neutral-700 file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-[11px] file:font-bold file:uppercase file:bg-black file:text-white hover:file:bg-neutral-800 border border-neutral-300 p-1 bg-neutral-50"
                  />
                ) : (
                  <input
                    type="url"
                    value={urlNorma}
                    onChange={(e) => setUrlNorma(e.target.value)}
                    placeholder="https://busquedas.elperuano.pe/..."
                    className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                )}
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Fuente / Cuerpo Legal
                </label>
                <input
                  type="text"
                  value={fuenteIngesta}
                  onChange={(e) => setFuenteIngesta(e.target.value)}
                  placeholder="Ej. Legislación Laboral / Constitución"
                  className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Referencia de la Ley
                </label>
                <input
                  type="text"
                  value={referenciaIngesta}
                  onChange={(e) => setReferenciaIngesta(e.target.value)}
                  placeholder="Ej. Ley N° 31572"
                  className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={cargandoIngesta}
                className="w-full md:w-auto bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-[0.18em] px-6 py-2.5 flex items-center justify-center gap-2 transition"
              >
                {cargandoIngesta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Vectorizar e Indexar Norma
              </button>
            </div>
          </form>

          {mensajeIngesta && (
            <div
              className={`mt-3 px-3 py-2 border text-xs font-medium ${
                mensajeIngesta.tipo === "exito"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-rose-50 border-rose-300 text-rose-900"
              }`}
            >
              {mensajeIngesta.texto}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-neutral-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-black flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
              Calibración del Motor (Apache 2.0)
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-neutral-100 border border-neutral-300">
              Activo: {modoMotor === "local" ? "Laptop Local" : "Modal Cloud GPU (24/7)"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Modelo Ollama
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 px-2.5 py-1.5 text-xs font-mono text-black"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Umbral: <span className="text-blue-600">{umbral}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={umbral}
                onChange={(e) => setUmbral(e.target.value)}
                className="w-full accent-black mt-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Artículos (Top-K): <span className="text-blue-600">{limite}</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                className="w-full accent-black mt-2"
              />
            </div>
          </div>

          {false && usuario?.rol === "superadmin" && (
            <form onSubmit={guardarRutasServidor} className="pt-3 border-t border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                  Conmutador de Servidores (Exclusivo Superadmin)
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => cambiarModoMotor("local")}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                      modoMotor === "local" ? "bg-black text-white border-black" : "bg-white text-neutral-600 border-neutral-300"
                    }`}
                  >
                    <Laptop className="w-3 h-3 inline mr-1" />
                    Usar Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() => cambiarModoMotor("cloud")}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${
                      modoMotor === "cloud" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-600 border-neutral-300"
                    }`}
                  >
                    <Cloud className="w-3 h-3 inline mr-1" />
                    Usar Modal Cloud
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-neutral-500 mb-0.5">
                    URL Motor Demo Laptop / Túnel
                  </label>
                  <input
                    type="text"
                    value={urlLocalInput}
                    onChange={(e) => setUrlLocalInput(e.target.value)}
                    placeholder="http://127.0.0.1:8000/api"
                    className="w-full bg-neutral-50 border border-neutral-300 px-2 py-1 text-[11px] font-mono text-black"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-neutral-500 mb-0.5">
                    URL Motor Cloud 24/7 (Modal Serverless GPU)
                  </label>
                  <input
                    type="text"
                    value={urlCloudInput}
                    onChange={(e) => setUrlCloudInput(e.target.value)}
                    placeholder="https://tu-usuario--aboghub-ia-propia-fastapi-app.modal.run/api"
                    className="w-full bg-neutral-50 border border-neutral-300 px-2 py-1 text-[11px] font-mono text-black"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-500">
                  Endpoint activo: <code className="font-mono text-black font-bold">{getApiBase()}</code>
                </span>
                <button
                  type="submit"
                  className="bg-neutral-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {guardadoRutas ? "¡Guardado!" : "Guardar URLs"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
