import json
import requests
from typing import Iterator
from core.logger import logger

class LLMService:
    def __init__(self, modelo: str = "qwen3:8b", url_base: str = "http://localhost:11434"):
        self.modelo = modelo
        self.url_base = url_base
        self.url_generacion = f"{url_base}/api/generate"

    def construir_prompt(
        self,
        pregunta: str,
        fragmentos: list[dict],
        modo_perfil: str = "abogado",
        historial: list[dict] | None = None
    ) -> str:
        bloques_contexto = []
        for idx, doc in enumerate(fragmentos, start=1):
            fuente = doc.get("fuente", "Fuente desconocida")
            referencia = doc.get("referencia", "Sin referencia")
            contenido = doc.get("contenido", "")
            bloques_contexto.append(f"[Documento {idx} | Fuente: {fuente} | Referencia: {referencia}]\n{contenido}")

        contexto_unido = "\n\n".join(bloques_contexto)

        bloque_historial = ""
        if historial:
            ultimos = historial[-4:]
            lineas_hist = []
            for h in ultimos:
                etiqueta = "USUARIO" if h.get("rol") == "usuario" else "ABOGHUB IA"
                lineas_hist.append(f"{etiqueta}: {h.get('texto', '')}")
            bloque_historial = "=== HISTORIAL RECIENTE DE LA CONVERSACIÓN ===\n" + "\n".join(lineas_hist) + "\n\n"

        if modo_perfil == "cliente":
            instruccion_perfil = (
                "Actúas en MODO ORIENTACIÓN AL CIUDADANO / CLIENTE de la plataforma AbogHub.com.\n"
                "Explica la normativa peruana en un lenguaje claro, empático y comprensible para personas o empresas no abogadas.\n"
                "Indica qué artículos o normas amparan su situación según el CONTEXTO LEGAL.\n"
                "Al finalizar tu respuesta, sugiere brevemente que puede publicar su caso en el Marketplace de AbogHub para conectar con un abogado especialista colegiado."
            )
        else:
            instruccion_perfil = (
                "Actúas en MODO COPILOTO PARA ABOGADOS de la plataforma AbogHub.com.\n"
                "Redacta un dictamen técnico-jurídico riguroso, estructurado por fundamentos de derecho, citando incisos, artículos y referencias exactas para uso en demandas, contratos o informes legales."
            )

        return (
            "/no_think\n"
            "Eres AbogHub IA, el motor de inteligencia jurídica soberana de AbogHub.com especializado en legislación y jurisprudencia peruana.\n"
            f"{instruccion_perfil}\n"
            "Tu única fuente de verdad normativa es el CONTEXTO LEGAL proporcionado a continuación.\n"
            "Reglas obligatorias:\n"
            "1. Responde únicamente con base en la información contenida en el CONTEXTO LEGAL.\n"
            "2. Cita explícitamente la Fuente y Referencia de los documentos que respaldan tu respuesta.\n"
            "3. Si la respuesta no se encuentra en el CONTEXTO LEGAL, indica claramente que no hay información suficiente en la base de datos para responder.\n"
            "4. Entrega directamente el dictamen final en español formal y conciso.\n\n"
            f"{bloque_historial}"
            f"=== CONTEXTO LEGAL ===\n{contexto_unido}\n\n"
            f"=== CONSULTA ACTUAL DEL USUARIO ===\n{pregunta}\n\n"
            "=== DICTAMEN / RESPUESTA === /no_think"
        )

    def generar_respuesta(
        self,
        pregunta: str,
        fragmentos: list[dict],
        modelo_override: str | None = None,
        modo_perfil: str = "abogado",
        historial: list[dict] | None = None
    ) -> str:
        modelo_activo = modelo_override or self.modelo
        prompt = self.construir_prompt(pregunta, fragmentos, modo_perfil, historial)

        carga = {
            "model": modelo_activo,
            "prompt": prompt,
            "stream": False,
            "think": False,
            "options": {
                "temperature": 0.1,
                "num_ctx": 3072,
                "num_predict": 650
            }
        }

        try:
            logger.info(f"[LLM] Solicitando dictamen a Ollama (modelo={modelo_activo}, fragmentos={len(fragmentos)})")
            respuesta = requests.post(self.url_generacion, json=carga, timeout=120)
            if respuesta.status_code == 404:
                raise RuntimeError(
                    f"El modelo '{modelo_activo}' no está descargado en Ollama. Ejecuta 'ollama pull {modelo_activo}' en tu terminal."
                )
            respuesta.raise_for_status()
            datos = respuesta.json()
            return datos.get("response", "").strip()
        except requests.exceptions.ConnectionError:
            logger.error(f"[LLM] No se pudo conectar a Ollama en {self.url_base}")
            raise RuntimeError(
                f"El servicio local de Ollama ({self.url_base}) no responde. Verifica que Ollama esté encendido en tu equipo."
            )
        except requests.exceptions.Timeout:
            logger.error(f"[LLM] Tiempo de espera agotado (120s) esperando respuesta de {modelo_activo}")
            raise RuntimeError(
                f"El modelo '{modelo_activo}' tardó demasiado en responder. Intenta con una consulta más específica."
            )

    def generar_respuesta_stream(
        self,
        pregunta: str,
        fragmentos: list[dict],
        modelo_override: str | None = None,
        modo_perfil: str = "abogado",
        historial: list[dict] | None = None
    ) -> Iterator[str]:
        modelo_activo = modelo_override or self.modelo
        prompt = self.construir_prompt(pregunta, fragmentos, modo_perfil, historial)

        carga = {
            "model": modelo_activo,
            "prompt": prompt,
            "stream": True,
            "think": False,
            "options": {
                "temperature": 0.1,
                "num_ctx": 3072,
                "num_predict": 650
            }
        }

        try:
            logger.info(f"[LLM-STREAM] Iniciando streaming rápido sin thinking (modelo={modelo_activo}, modo={modo_perfil})")
            with requests.post(self.url_generacion, json=carga, stream=True, timeout=120) as respuesta:
                if respuesta.status_code == 404:
                    raise RuntimeError(
                        f"El modelo '{modelo_activo}' no está instalado en Ollama. Ejecuta 'ollama pull {modelo_activo}' en tu consola."
                    )
                respuesta.raise_for_status()
                for linea in respuesta.iter_lines(decode_unicode=True):
                    if not linea:
                        continue
                    try:
                        datos = json.loads(linea)
                        if datos.get("error"):
                            raise RuntimeError(f"Error reportado por Ollama: {datos['error']}")
                        token = datos.get("response", "")
                        if token:
                            yield token
                    except json.JSONDecodeError:
                        continue
            logger.info(f"[LLM-STREAM] Streaming completado exitosamente ({modelo_activo})")
        except requests.exceptions.ConnectionError:
            logger.error(f"[LLM-STREAM] Fallo de conexión con Ollama en {self.url_base}")
            raise RuntimeError(
                f"No se pudo conectar con Ollama en {self.url_base}. Asegúrate de que Ollama esté ejecutándose."
            )
        except requests.exceptions.Timeout:
            logger.error(f"[LLM-STREAM] Timeout esperando a Ollama ({modelo_activo})")
            raise RuntimeError(
                f"Tiempo de espera agotado al consultar el modelo '{modelo_activo}' en Ollama."
            )

llm_service = LLMService()
