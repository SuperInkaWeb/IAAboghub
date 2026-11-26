function normalizarUrlApi(url) {
  if (!url) return "";
  const limpia = url.trim().replace(/\/+$/, "");
  return limpia.endsWith("/api") ? limpia : `${limpia}/api`;
}

const DEFAULT_CLOUD_URL = normalizarUrlApi(import.meta.env.VITE_CLOUD_API_URL || "");
const DEFAULT_LOCAL_URL = normalizarUrlApi(import.meta.env.VITE_LOCAL_API_URL || "http://127.0.0.1:8000/api");

export function obtenerModoMotor() {
  return "cloud";
}

export function establecerModoMotor(modo) {
  localStorage.setItem("aboghub_engine_mode", modo);
}

export function obtenerUrlCloud() {
  if (DEFAULT_CLOUD_URL) {
    return DEFAULT_CLOUD_URL;
  }
  const guardada = localStorage.getItem("aboghub_cloud_url");
  return guardada ? normalizarUrlApi(guardada) : DEFAULT_LOCAL_URL;
}

export function establecerUrlCloud(url) {
  const limpia = normalizarUrlApi(url);
  localStorage.setItem("aboghub_cloud_url", limpia);
}

export function obtenerUrlLocal() {
  return localStorage.getItem("aboghub_local_url") || DEFAULT_LOCAL_URL;
}

export function establecerUrlLocal(url) {
  const limpia = normalizarUrlApi(url);
  localStorage.setItem("aboghub_local_url", limpia);
}

export function getApiBase() {
  return obtenerUrlCloud();
}

export const API_BASE = getApiBase();

export function obtenerHeadersAuth(esJson = true) {
  const token = localStorage.getItem("aboghub_token");
  const headers = {};
  if (esJson) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export function registrarLogCliente(nivel, modulo, mensaje, detalleTecnico = "") {
  try {
    const actuales = JSON.parse(localStorage.getItem("aboghub_client_logs") || "[]");
    const entrada = {
      fecha: new Date().toLocaleTimeString(),
      nivel,
      modulo,
      mensaje,
      detalleTecnico
    };
    const nuevos = [entrada, ...actuales].slice(0, 60);
    localStorage.setItem("aboghub_client_logs", JSON.stringify(nuevos));
  } catch {
    return;
  }
}

export function obtenerLogsCliente() {
  try {
    return JSON.parse(localStorage.getItem("aboghub_client_logs") || "[]");
  } catch {
    return [];
  }
}

export function limpiarLogsCliente() {
  localStorage.removeItem("aboghub_client_logs");
}

export function traducirError(err, contexto = "General") {
  const msg = (err?.message || String(err || "")).trim();
  const baseActiva = getApiBase();

  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("ERR_FAILED") ||
    msg.includes("Load failed")
  ) {
    const explicacion = !DEFAULT_CLOUD_URL
      ? "Falta configurar la variable de entorno VITE_CLOUD_API_URL en Vercel o en frontend/.env con la URL del servidor Backend."
      : `No se pudo conectar con el servidor Backend (${baseActiva}). Si el contenedor GPU estaba en reposo para ahorrar créditos, espera unos segundos y vuelve a intentar.`;
    registrarLogCliente("ERROR_RED", contexto, explicacion, `${msg} -> URL: ${baseActiva}`);
    return explicacion;
  }

  registrarLogCliente("ERROR", contexto, msg, `URL: ${baseActiva}`);
  return msg;
}
