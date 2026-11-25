import React, { useState, useEffect } from "react";
import {
  Users,
  Key,
  X,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Copy,
  Code2,
  Terminal,
  RefreshCw
} from "lucide-react";
import {
  getApiBase,
  obtenerHeadersAuth,
  traducirError,
  obtenerLogsCliente,
  limpiarLogsCliente
} from "../services/api";

export default function UserManagementModal({ cerrar }) {
  const [pestana, setPestana] = useState("usuarios");

  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [emailNuevo, setEmailNuevo] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [rolNuevo, setRolNuevo] = useState("admin");
  const [creandoUsuario, setCreandoUsuario] = useState(false);

  const [apiKeys, setApiKeys] = useState([]);
  const [cargandoKeys, setCargandoKeys] = useState(false);
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [keyRecienCreada, setKeyRecienCreada] = useState(null);
  const [creandoKey, setCreandoKey] = useState(false);

  const [logsBackend, setLogsBackend] = useState([]);
  const [logsCliente, setLogsCliente] = useState([]);
  const [cargandoLogs, setCargandoLogs] = useState(false);

  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      const res = await fetch(`${getApiBase()}/users`, {
        headers: obtenerHeadersAuth()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "No se pudo cargar la lista de usuarios desde Supabase.");
      setUsuarios(data.usuarios || []);
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Listar Usuarios") });
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const cargarApiKeys = async () => {
    setCargandoKeys(true);
    try {
      const res = await fetch(`${getApiBase()}/keys`, {
        headers: obtenerHeadersAuth()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "No se pudieron cargar las API Keys (verifica que la tabla 'api_keys' exista en Supabase).");
      setApiKeys(data.api_keys || []);
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Listar API Keys") });
    } finally {
      setCargandoKeys(false);
    }
  };

  const cargarLogs = async () => {
    setCargandoLogs(true);
    setLogsCliente(obtenerLogsCliente());
    try {
      const res = await fetch(`${getApiBase()}/logs`, {
        headers: obtenerHeadersAuth()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogsBackend(data.logs || []);
      }
    } catch (err) {
      traducirError(err, "Cargar Logs Backend");
    } finally {
      setCargandoLogs(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
    cargarApiKeys();
    cargarLogs();
  }, []);

  const crearUsuario = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setCreandoUsuario(true);

    try {
      const res = await fetch(`${getApiBase()}/users`, {
        method: "POST",
        headers: obtenerHeadersAuth(),
        body: JSON.stringify({
          nombre: nombreNuevo,
          email: emailNuevo,
          password: passwordNuevo,
          rol: rolNuevo
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Error al crear usuario");

      setMensaje({ tipo: "exito", texto: `Cuenta ${data.usuario.email} creada con rol ${data.usuario.rol.toUpperCase()}.` });
      setNombreNuevo("");
      setEmailNuevo("");
      setPasswordNuevo("");
      cargarUsuarios();
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Crear Usuario") });
    } finally {
      setCreandoUsuario(false);
    }
  };

  const cambiarRol = async (id, nuevoRol) => {
    setMensaje(null);
    try {
      const res = await fetch(`${getApiBase()}/users/${id}/rol`, {
        method: "PATCH",
        headers: obtenerHeadersAuth(),
        body: JSON.stringify({ rol: nuevoRol })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "No se pudo actualizar el rol");
      setMensaje({ tipo: "exito", texto: `Rol actualizado a ${nuevoRol.toUpperCase()}.` });
      cargarUsuarios();
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Cambiar Rol") });
    }
  };

  const eliminarUsuario = async (id, email) => {
    setMensaje(null);
    try {
      const res = await fetch(`${getApiBase()}/users/${id}`, {
        method: "DELETE",
        headers: obtenerHeadersAuth()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "No se pudo eliminar el usuario");
      setMensaje({ tipo: "exito", texto: `Cuenta ${email} eliminada.` });
      cargarUsuarios();
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Eliminar Usuario") });
    }
  };

  const generarNuevaKey = async (e) => {
    e.preventDefault();
    setMensaje(null);
    setKeyRecienCreada(null);
    setCreandoKey(true);

    try {
      const res = await fetch(`${getApiBase()}/keys`, {
        method: "POST",
        headers: obtenerHeadersAuth(),
        body: JSON.stringify({ nombre_proyecto: nombreProyecto })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "No se pudo generar la API Key");

      setKeyRecienCreada(data.api_key.api_key_secreta);
      setNombreProyecto("");
      cargarApiKeys();
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Generar API Key") });
    } finally {
      setCreandoKey(false);
    }
  };

  const revocarKey = async (id, nombre) => {
    setMensaje(null);
    try {
      const res = await fetch(`${getApiBase()}/keys/${id}`, {
        method: "DELETE",
        headers: obtenerHeadersAuth()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Error al revocar API Key");
      setMensaje({ tipo: "exito", texto: `API Key del proyecto "${nombre}" revocada.` });
      cargarApiKeys();
    } catch (err) {
      setMensaje({ tipo: "error", texto: traducirError(err, "Revocar API Key") });
    }
  };

  const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    setMensaje({ tipo: "exito", texto: "Copiado al portapapeles." });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black w-full max-w-5xl p-8 relative shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={cerrar}
          className="absolute top-4 right-4 text-neutral-500 hover:text-black p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-black pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              Consola de Gobierno Superadmin
            </h2>
            <p className="text-xs text-neutral-600">
              Administra <strong>ADMINS</strong>, <strong>USUARIOS</strong>, <strong>API KEYS</strong> y audita el <strong>Registro de Diagnóstico y Logs</strong> en tiempo real.
            </p>
          </div>

          <div className="flex border-2 border-black shrink-0">
            <button
              type="button"
              onClick={() => {
                setPestana("usuarios");
                setMensaje(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                pestana === "usuarios" ? "bg-black text-white" : "bg-white text-neutral-600 hover:text-black"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Usuarios
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana("apikeys");
                setMensaje(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                pestana === "apikeys" ? "bg-blue-600 text-white" : "bg-white text-neutral-600 hover:text-black"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              API Keys
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana("logs");
                setMensaje(null);
                cargarLogs();
              }}
              className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                pestana === "logs" ? "bg-emerald-600 text-white" : "bg-white text-neutral-600 hover:text-black"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Logs y Diagnóstico
            </button>
          </div>
        </div>

        {mensaje && (
          <div
            className={`mb-5 p-3 border text-xs font-medium flex items-center gap-2 ${
              mensaje.tipo === "exito"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
          >
            {mensaje.tipo === "exito" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {pestana === "usuarios" && (
          <>
            <form onSubmit={crearUsuario} className="bg-neutral-50 border border-neutral-300 p-5 mb-6">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-black mb-3 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Crear Nuevo Administrador o Usuario
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="Nombre completo"
                  className="bg-white border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
                <input
                  type="email"
                  required
                  value={emailNuevo}
                  onChange={(e) => setEmailNuevo(e.target.value)}
                  placeholder="correo@aboghub.com"
                  className="bg-white border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordNuevo}
                  onChange={(e) => setPasswordNuevo(e.target.value)}
                  placeholder="Contraseña (mín. 6)"
                  className="bg-white border border-neutral-300 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
                <div className="flex gap-2">
                  <select
                    value={rolNuevo}
                    onChange={(e) => setRolNuevo(e.target.value)}
                    className="flex-1 bg-white border border-neutral-300 px-2.5 py-2 text-xs font-bold uppercase text-black focus:outline-none focus:border-black"
                  >
                    <option value="admin">ROL: ADMIN</option>
                    <option value="usuario">ROL: USUARIO</option>
                  </select>
                  <button
                    type="submit"
                    disabled={creandoUsuario}
                    className="bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 shrink-0"
                  >
                    {creandoUsuario ? "..." : "Crear"}
                  </button>
                </div>
              </div>
            </form>

            <div className="border border-neutral-200">
              <div className="grid grid-cols-12 bg-neutral-100 border-b border-neutral-200 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-600">
                <div className="col-span-4">Nombre</div>
                <div className="col-span-4">Correo Electrónico</div>
                <div className="col-span-3">Nivel de Acceso (Rol)</div>
                <div className="col-span-1 text-right">Acción</div>
              </div>

              {cargandoUsuarios ? (
                <div className="p-8 flex items-center justify-center text-xs text-neutral-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando padrón de usuarios...
                </div>
              ) : usuarios.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  No hay usuarios estándar ni administradores registrados aún en la tabla.
                </div>
              ) : (
                usuarios.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-12 items-center px-4 py-3 border-b border-neutral-100 text-xs hover:bg-neutral-50"
                  >
                    <div className="col-span-4 font-bold text-black flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      {u.nombre}
                    </div>
                    <div className="col-span-4 text-neutral-600">{u.email}</div>
                    <div className="col-span-3">
                      <select
                        value={u.rol}
                        onChange={(e) => cambiarRol(u.id, e.target.value)}
                        className="border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black"
                      >
                        <option value="admin">ADMIN (Ingesta + Chat)</option>
                        <option value="usuario">USUARIO (Solo Chat)</option>
                      </select>
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => eliminarUsuario(u.id, u.email)}
                        className="text-neutral-400 hover:text-rose-600 p-1 transition"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {pestana === "apikeys" && (
          <div className="space-y-6">
            <form onSubmit={generarNuevaKey} className="bg-neutral-50 border border-neutral-300 p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-black mb-2 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-600" />
                Emitir Nueva API Key para Página Web o Sistema Externo
              </h3>
              <p className="text-xs text-neutral-600 mb-3">
                Genera una credencial <code className="font-mono bg-white px-1 border">abog_live_...</code> para consumir el motor RAG de AbogHub desde otra página web, aplicación móvil o CRM.
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  placeholder="Ej. Portal Principal AbogHub.com / App Móvil Clientes"
                  className="flex-1 bg-white border border-neutral-300 px-3.5 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={creandoKey}
                  className="bg-black hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider px-6 py-2 shrink-0"
                >
                  {creandoKey ? "Generando..." : "Generar API Key"}
                </button>
              </div>
            </form>

            {keyRecienCreada && (
              <div className="p-5 bg-amber-50 border-2 border-black space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-black">
                    ¡API Key Generada! Cópiala ahora (por seguridad no se volverá a mostrar completa):
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarTexto(keyRecienCreada)}
                    className="bg-black text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Key
                  </button>
                </div>
                <div className="p-3 bg-white border border-neutral-300 font-mono text-xs font-bold text-blue-700 select-all">
                  {keyRecienCreada}
                </div>
              </div>
            )}

            <div className="border border-neutral-200">
              <div className="grid grid-cols-12 bg-neutral-100 border-b border-neutral-200 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-neutral-600">
                <div className="col-span-5">Proyecto / Aplicación Conectada</div>
                <div className="col-span-5">Prefijo de Llave</div>
                <div className="col-span-2 text-right">Revocar</div>
              </div>

              {cargandoKeys ? (
                <div className="p-6 text-center text-xs text-neutral-500">Cargando llaves activas...</div>
              ) : apiKeys.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  No hay API Keys emitidas todavía.
                </div>
              ) : (
                apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="grid grid-cols-12 items-center px-4 py-3 border-b border-neutral-100 text-xs hover:bg-neutral-50"
                  >
                    <div className="col-span-5 font-bold text-black">{k.nombre_proyecto}</div>
                    <div className="col-span-5 font-mono text-neutral-600">{k.prefijo}</div>
                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        onClick={() => revocarKey(k.id, k.nombre_proyecto)}
                        className="text-neutral-400 hover:text-rose-600 p-1 transition"
                        title="Revocar API Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-neutral-900 text-neutral-100 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Code2 className="w-4 h-4" />
                Ejemplo de Integración en Otra Página Web (JavaScript / Fetch)
              </div>
              <pre className="text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed">
{`const respuesta = await fetch("${getApiBase()}/consultar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "abog_live_TU_API_KEY_AQUI"
  },
  body: JSON.stringify({
    pregunta: "¿Cómo funciona la desconexión digital en la Ley 31572?",
    modo_perfil: "cliente"
  })
});
const dictamen = await respuesta.json();
console.log(dictamen.respuesta_ia, dictamen.fuentes_utilizadas);`}
              </pre>
            </div>
          </div>
        )}

        {pestana === "logs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Endpoint auditado actualmente: <code className="font-mono text-black">{getApiBase()}</code>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    limpiarLogsCliente();
                    cargarLogs();
                  }}
                  className="border border-neutral-300 hover:border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700"
                >
                  Limpiar Eventos Navegador
                </button>
                <button
                  type="button"
                  onClick={cargarLogs}
                  className="bg-black text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoLogs ? "animate-spin" : ""}`} />
                  Refrescar Logs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-neutral-300 bg-neutral-950 text-neutral-100 p-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-3 border-b border-neutral-800 pb-2">
                  Eventos del Frontend / Red (Navegador)
                </h4>
                <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-[11px]">
                  {logsCliente.length === 0 ? (
                    <p className="text-neutral-500">Sin errores ni eventos registrados en el navegador.</p>
                  ) : (
                    logsCliente.map((l, i) => (
                      <div key={i} className="border-b border-neutral-800 pb-1.5">
                        <span className="text-neutral-500">[{l.fecha}]</span>{" "}
                        <span className={l.nivel.includes("ERROR") ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                          [{l.nivel}]
                        </span>{" "}
                        <span className="text-blue-300">[{l.modulo}]</span>: {l.mensaje}
                        {l.detalleTecnico && (
                          <div className="text-[10px] text-neutral-500 mt-0.5">{l.detalleTecnico}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-neutral-300 bg-neutral-950 text-neutral-100 p-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 mb-3 border-b border-neutral-800 pb-2">
                  Bitácora del Servidor Backend (backend/logs/aboghub.log)
                </h4>
                <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono text-[11px]">
                  {logsBackend.length === 0 ? (
                    <p className="text-neutral-500">
                      No hay registros recibidos desde /api/logs o el servidor no ha registrado actividad aún.
                    </p>
                  ) : (
                    logsBackend.map((linea, idx) => (
                      <div
                        key={idx}
                        className={`border-b border-neutral-900 pb-1 ${
                          linea.includes("[ERROR]")
                            ? "text-rose-400"
                            : linea.includes("[WARNING]")
                            ? "text-amber-300"
                            : "text-neutral-300"
                        }`}
                      >
                        {linea}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
