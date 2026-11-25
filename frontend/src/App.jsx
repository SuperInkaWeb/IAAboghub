import React, { useState, useEffect, useRef } from "react";
import { Briefcase, UserCheck, Filter, Trash2, AlertTriangle } from "lucide-react";
import {
  getApiBase,
  obtenerHeadersAuth,
  obtenerModoMotor,
  establecerModoMotor,
  esUrlPlaceholder,
  obtenerUrlCloud,
  traducirError,
  registrarLogCliente
} from "./services/api";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import LandingPage from "./components/LandingPage";
import AuthModal from "./components/AuthModal";
import UserManagementModal from "./components/UserManagementModal";
import IngestionDrawer from "./components/IngestionDrawer";
import ChatPanel from "./components/ChatPanel";
import EvidencePanel from "./components/EvidencePanel";

export default function App() {
  const { usuario, guardarSesion, cerrarSesion } = useAuth();

  const [modoMotor, setModoMotor] = useState(obtenerModoMotor());
  const [alertaSistema, setAlertaSistema] = useState(null);
  const [modalAuth, setModalAuth] = useState({ abierto: false, modo: "login" });
  const [modalUsuariosAbierto, setModalUsuariosAbierto] = useState(false);

  const [estadoDB, setEstadoDB] = useState({ conectado: false, registros: 0, errorDetalle: null });
  const [fuentesDisponibles, setFuentesDisponibles] = useState([]);
  const [fuenteFiltro, setFuenteFiltro] = useState("TODAS");
  const [modoPerfil, setModoPerfil] = useState("abogado");
  const [mostrarPanelIngesta, setMostrarPanelIngesta] = useState(false);

  const [pregunta, setPregunta] = useState("");
  const [cargandoConsulta, setCargandoConsulta] = useState(false);
  const [historial, setHistorial] = useState([
    {
      rol: "asistente",
      texto:
        "Bienvenido al motor jurídico soberano de AbogHub. Selecciona tu perfil (Copiloto para Abogados u Orientación al Cliente), filtra por cuerpo normativo si lo deseas y realiza tu consulta legal respaldada por legislación peruana verificada.",
      fuentes: [],
      modelo: "qwen3:8b",
      modo: "abogado"
    }
  ]);
  const [fuentesActivas, setFuentesActivas] = useState([]);
  const [umbral, setUmbral] = useState(0.3);
  const [limite, setLimite] = useState(3);
  const [modelo, setModelo] = useState("qwen3:8b");

  const finChatRef = useRef(null);

  const verificarBaseDatos = async () => {
    try {
      const res = await fetch(`${getApiBase()}/test-db`);
      const data = await res.json();
      if (data.estado === "Éxito") {
        setEstadoDB({ conectado: true, registros: data.cantidad_registros || 0, errorDetalle: null });
        setFuentesDisponibles(data.fuentes_disponibles || []);
        setAlertaSistema(null);
      } else {
        const msg = `Supabase reportó un error al consultar la tabla 'jurisprudencia': ${data.detalle || data.mensaje}`;
        setEstadoDB({ conectado: false, registros: 0, errorDetalle: msg });
        setAlertaSistema(msg);
        registrarLogCliente("ERROR_DB", "Test-DB", msg, getApiBase());
      }
    } catch (err) {
      const mensajeClaro = traducirError(err, "Conexión Inicial con Backend (/api/test-db)");
      setEstadoDB({ conectado: false, registros: 0, errorDetalle: mensajeClaro });
      setAlertaSistema(mensajeClaro);
      setModoMotor(obtenerModoMotor());
    }
  };

  useEffect(() => {
    verificarBaseDatos();
  }, [modoMotor]);

  useEffect(() => {
    finChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historial, cargandoConsulta]);

  const cambiarModoMotor = (nuevoModo) => {
    if (!usuario || usuario.rol !== "superadmin") return;
    if (nuevoModo === "cloud" && esUrlPlaceholder(obtenerUrlCloud())) {
      setMostrarPanelIngesta(true);
      setAlertaSistema(
        "Antes de activar 'Cloud 24/7', despliega tu backend en Modal y pega tu URL real (https://...modal.run/api) en el cuadro 'Conmutador de Servidores' que se acaba de desplegar aquí arriba. Por ahora sigues conectado a tu Laptop Local."
      );
      registrarLogCliente("AVISO", "Switch Cloud", "Intento de activar Cloud con URL placeholder sin configurar");
      return;
    }
    setAlertaSistema(null);
    establecerModoMotor(nuevoModo);
    setModoMotor(nuevoModo);
    registrarLogCliente("INFO", "Switch Motor", `Motor cambiado a: ${nuevoModo.toUpperCase()}`);
  };

  const esAdminOSuper = usuario && (usuario.rol === "superadmin" || usuario.rol === "admin");

  const limpiarConversacion = () => {
    setHistorial([
      {
        rol: "asistente",
        texto: "Historial reiniciado. Puedes iniciar un nuevo análisis jurídico independiente.",
        fuentes: [],
        modelo: modelo,
        modo: modoPerfil
      }
    ]);
    setFuentesActivas([]);
  };

  const enviarConsulta = async (e, consultaPredefinida = null) => {
    if (e) e.preventDefault();
    if (!usuario) {
      setModalAuth({ abierto: true, modo: "login" });
      return;
    }

    const textoConsulta = (consultaPredefinida ?? pregunta).trim();
    if (!textoConsulta || cargandoConsulta) return;

    const historialReciente = historial
      .filter((m) => !m.esError)
      .slice(-4)
      .map((m) => ({ rol: m.rol, texto: m.texto }));

    setPregunta("");
    setHistorial((prev) => [
      ...prev,
      { rol: "usuario", texto: textoConsulta },
      {
        rol: "asistente",
        texto: "",
        fuentes: [],
        modelo: modelo,
        modo: modoPerfil,
        origenMotor: modoMotor,
        enStream: true
      }
    ]);
    setCargandoConsulta(true);

    try {
      const res = await fetch(`${getApiBase()}/consultar-stream`, {
        method: "POST",
        headers: obtenerHeadersAuth(true),
        body: JSON.stringify({
          pregunta: textoConsulta,
          umbral_similitud: Number(umbral),
          limite_resultados: Number(limite),
          modelo: modelo,
          modo_perfil: modoPerfil,
          fuente_filtro: fuenteFiltro === "TODAS" ? null : fuenteFiltro,
          historial: historialReciente
        })
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error HTTP ${res.status} al consultar el motor RAG`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let textoAcumulado = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const bloques = buffer.split("\n\n");
        buffer = bloques.pop() || "";

        for (const bloque of bloques) {
          const linea = bloque.trim();
          if (!linea.startsWith("data:")) continue;
          const jsonStr = linea.replace(/^data:\s*/, "");
          try {
            const evento = JSON.parse(jsonStr);
            if (evento.tipo === "error") {
              throw new Error(evento.detalle || "Error interno durante el streaming del dictamen.");
            } else if (evento.tipo === "fuentes") {
              const fuentesRecibidas = evento.fuentes_utilizadas || [];
              setFuentesActivas(fuentesRecibidas);
              setHistorial((prev) => {
                const copia = [...prev];
                const ultimo = copia[copia.length - 1];
                if (ultimo && ultimo.rol === "asistente") {
                  copia[copia.length - 1] = { ...ultimo, fuentes: fuentesRecibidas };
                }
                return copia;
              });
            } else if (evento.tipo === "token") {
              textoAcumulado += evento.contenido;
              setHistorial((prev) => {
                const copia = [...prev];
                const ultimo = copia[copia.length - 1];
                if (ultimo && ultimo.rol === "asistente") {
                  copia[copia.length - 1] = { ...ultimo, texto: textoAcumulado };
                }
                return copia;
              });
            } else if (evento.tipo === "fin") {
              setHistorial((prev) => {
                const copia = [...prev];
                const ultimo = copia[copia.length - 1];
                if (ultimo && ultimo.rol === "asistente") {
                  copia[copia.length - 1] = { ...ultimo, enStream: false };
                }
                return copia;
              });
            }
          } catch (innerErr) {
            if (innerErr.message && !innerErr.message.includes("JSON")) {
              throw innerErr;
            }
          }
        }
      }
    } catch (err) {
      const mensajeIntuitivo = traducirError(err, "Consulta Jurídica RAG");
      setHistorial((prev) => {
        const copia = [...prev];
        copia[copia.length - 1] = {
          rol: "asistente",
          texto: `Diagnóstico del Sistema: ${mensajeIntuitivo}`,
          fuentes: [],
          esError: true,
          enStream: false
        };
        return copia;
      });
    } finally {
      setCargandoConsulta(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar
        estadoDB={estadoDB}
        usuario={usuario}
        modoMotor={modoMotor}
        cambiarModoMotor={cambiarModoMotor}
        mostrarPanelIngesta={mostrarPanelIngesta}
        setMostrarPanelIngesta={setMostrarPanelIngesta}
        abrirModalAuth={(modo) => setModalAuth({ abierto: true, modo })}
        abrirModalUsuarios={() => setModalUsuariosAbierto(true)}
        cerrarSesion={() => {
          cerrarSesion();
          setMostrarPanelIngesta(false);
        }}
      />

      {alertaSistema && (
        <div className="bg-amber-50 border-b-2 border-black px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs font-medium text-neutral-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{alertaSistema}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertaSistema(null)}
            className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 bg-black text-white shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {!usuario ? (
        <LandingPage
          estadoDB={estadoDB}
          abrirModalAuth={(modo) => setModalAuth({ abierto: true, modo })}
        />
      ) : (
        <>
          {esAdminOSuper && mostrarPanelIngesta && (
            <IngestionDrawer
              usuario={usuario}
              modoMotor={modoMotor}
              cambiarModoMotor={cambiarModoMotor}
              modelo={modelo}
              setModelo={setModelo}
              umbral={umbral}
              setUmbral={setUmbral}
              limite={limite}
              setLimite={setLimite}
              alCompletarIngesta={verificarBaseDatos}
            />
          )}

          <div className="max-w-7xl w-full mx-auto px-8 pt-8 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b-2 border-black pb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-[1.05] text-black">
                  TU PROBLEMA LEGAL,
                  <br />
                  UNA SOLUCIÓN INTELIGENTE.
                </h1>
                <p className="mt-3 text-sm text-neutral-600 max-w-2xl">
                  Sesión activa como <strong>{usuario.nombre}</strong> ({usuario.rol.toUpperCase()}). Realiza consultas jurídicas verificadas con legislación peruana en tiempo real.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex border-2 border-black bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setModoPerfil("abogado")}
                    className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                      modoPerfil === "abogado" ? "bg-black text-white" : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Modo Abogado
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoPerfil("cliente")}
                    className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                      modoPerfil === "cliente" ? "bg-blue-600 text-white" : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Modo Cliente
                  </button>
                </div>

                <div className="flex items-center border border-neutral-300 bg-neutral-50 px-3 py-2">
                  <Filter className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                  <select
                    value={fuenteFiltro}
                    onChange={(e) => setFuenteFiltro(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase tracking-wider text-black focus:outline-none"
                  >
                    <option value="TODAS">Todas las Fuentes ({estadoDB.registros})</option>
                    {fuentesDisponibles.map((f, idx) => (
                      <option key={idx} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-200">
              <div className="flex flex-wrap items-center gap-4">
                <span>Consultas Rápidas:</span>
                <button
                  type="button"
                  onClick={() =>
                    enviarConsulta(
                      null,
                      "¿Cuáles son las infracciones muy graves y obligaciones del empleador en el teletrabajo según la Ley 31572?"
                    )
                  }
                  className="text-black hover:text-blue-600 transition"
                >
                  Derecho Laboral (Ley 31572)
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() =>
                    enviarConsulta(
                      null,
                      "¿En qué fecha se realizó el referéndum de la Constitución de 1993 y cuándo entró en vigencia?"
                    )
                  }
                  className="text-black hover:text-blue-600 transition"
                >
                  Derecho Constitucional (1993)
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => enviarConsulta(null, "¿Qué dice exactamente el Artículo 27 de la Ley del Teletrabajo?")}
                  className="text-black hover:text-blue-600 transition"
                >
                  Búsqueda Exacta Artículo 27
                </button>
              </div>

              <button
                type="button"
                onClick={limpiarConversacion}
                className="text-neutral-500 hover:text-rose-600 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpiar Memoria
              </button>
            </div>
          </div>

          <main className="max-w-7xl w-full mx-auto px-8 pb-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <ChatPanel
              historial={historial}
              pregunta={pregunta}
              setPregunta={setPregunta}
              cargandoConsulta={cargandoConsulta}
              enviarConsulta={enviarConsulta}
              setFuentesActivas={setFuentesActivas}
              finChatRef={finChatRef}
            />
            <EvidencePanel fuentesActivas={fuentesActivas} />
          </main>
        </>
      )}

      {modalAuth.abierto && (
        <AuthModal
          modoInicial={modalAuth.modo}
          cerrar={() => setModalAuth({ ...modalAuth, abierto: false })}
          alAutenticar={guardarSesion}
        />
      )}

      {modalUsuariosAbierto && usuario?.rol === "superadmin" && (
        <UserManagementModal
          cerrar={() => setModalUsuariosAbierto(false)}
          usuarioActual={usuario}
        />
      )}
    </div>
  );
}
