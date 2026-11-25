function normalizarUrlApi(url) {
  if (!url) return "";
  const limpia = url.trim().replace(/\/+$/, "");
  return limpia.endsWith("/api") ? limpia : `${limpia}/api`;
}

const DEFAULT_CLOUD_URL = normalizarUrlApi(
  import.meta.env.VITE_CLOUD_API_URL || "https://andrescaiza31--aboghub-ia-propia-fastapi-app.us-east.modal.run/api"
);
const DEFAULT_LOCAL_URL = normalizarUrlApi(
  import.meta.env.VITE_LOCAL_API_URL || "http://127.0.0.1:8000/api"
);

export function esUrlPlaceholder(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return lower.includes("tu-usuario--") || lower.includes("tu-usuario-aboghub") || lower.includes("andrescalza31");
}

export function obtenerModoMotor() {
  localStorage.setItem("aboghub_engine_mode", "cloud");
  return "cloud";
}

export function establecerModoMotor(modo) {
  localStorage.setItem("aboghub_engine_mode", modo);
}

export function obtenerUrlCloud() {
  if (import.meta.env.VITE_CLOUD_API_URL) {
    return DEFAULT_CLOUD_URL;
  }
  const guardada = localStorage.getItem("aboghub_cloud_url");
  if (!guardada || esUrlPlaceholder(guardada)) {
    localStorage.setItem("aboghub_cloud_url", DEFAULT_CLOUD_URL);
    return DEFAULT_CLOUD_URL;
  }
  return normalizarUrlApi(guardada);
}

export function establecerUrlCloud(url) {
  const limpia = normalizarUrlApi(url);
  localStorage.setItem("aboghub_cloud_url", limpia);
}

export function obtenerUrlLocal() {
  return localStorage.getItem("aboghub_local_url") || DEFAULT_LOCAL_URL;
}

export function establecerUrlLocal(url) {
  const limpia = url.trim().replace(/\/+$/, "");
  localStorage.setItem("aboghub_local_url", limpia);
}

export function getApiBase() {
  const modo = obtenerModoMotor();
  if (modo === "cloud") {
    const cloudUrl = obtenerUrlCloud();
    if (!esUrlPlaceholder(cloudUrl)) {
      return cloudUrl;
    }
  }
  return obtenerUrlLocal();
}

export const API_BASE = DEFAULT_LOCAL_URL;

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
  const modoActual = obtenerModoMotor();

  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("ERR_FAILED") ||
    msg.includes("Load failed")
  ) {
    let explicacion;
    if (esUrlPlaceholder(baseActiva)) {
      explicacion =
        "El modo Cloud aún tiene una URL de ejemplo ('tu-usuario--...'). Se ha restablecido automáticamente al Motor Local (http://127.0.0.1:8000/api). Intenta nuevamente.";
      establecerModoMotor("local");
    } else if (modoActual === "local" || baseActiva.includes("127.0.0.1") || baseActiva.includes("localhost")) {
      explicacion = `No hay conexión con tu servidor Backend Local (${baseActiva}). Verifica que en tu terminal esté encendido FastAPI con el comando: uvicorn main:app --reload`;
    } else {
      explicacion = `No se pudo conectar con el servidor Cloud en '${baseActiva}'. Verifica que el despliegue en Modal esté activo o cambia el switch a 'Demo Laptop'.`;
    }
    registrarLogCliente("ERROR_RED", contexto, explicacion, `${msg} -> URL: ${baseActiva}`);
    return explicacion;
  }

  registrarLogCliente("ERROR", contexto, msg, `URL: ${baseActiva}`);
  return msg;
}
