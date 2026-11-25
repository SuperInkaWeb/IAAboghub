import os
import json
from typing import Iterator
from core.config import settings
from core.database import supabase_db
from core.logger import logger
from services.scraper import scraper_peruano
from services.embeddings import embedding_service
from services.llm import llm_service
from services.pdf_processor import pdf_processor
import re

class RAGEngine:
    def listar_fuentes(self) -> list[str]:
        respuesta = supabase_db.table("jurisprudencia").select("fuente").execute()
        fuentes = sorted({fila["fuente"] for fila in (respuesta.data or []) if fila.get("fuente")})
        return fuentes

    def procesar_y_guardar_texto(self, texto_limpio: str, fuente: str, referencia: str) -> dict:
        existentes = (
            supabase_db.table("jurisprudencia")
            .select("referencia")
            .ilike("referencia", f"{referencia}%")
            .execute()
        )
        referencias_existentes = {fila["referencia"] for fila in (existentes.data or [])}

        articulos = pdf_processor.segmentar_por_articulos(texto_limpio, referencia)
        registros = []
        omitidos_duplicados = 0

        if articulos:
            metodo_segmentacion = "por_articulo"
            for item in articulos:
                if item["referencia"] in referencias_existentes:
                    omitidos_duplicados += 1
                    continue
                vector = embedding_service.generar_vector(item["contenido"])
                registros.append({
                    "fuente": fuente,
                    "referencia": item["referencia"],
                    "contenido": item["contenido"],
                    "embedding": vector
                })
        else:
            metodo_segmentacion = "por_fragmentos_palabras"
            fragmentos = embedding_service.dividir_texto(texto_limpio)
            for indice, fragmento in enumerate(fragmentos, start=1):
                referencia_fragmento = f"{referencia} - Parte {indice}" if len(fragmentos) > 1 else referencia
                if referencia_fragmento in referencias_existentes:
                    omitidos_duplicados += 1
                    continue
                vector = embedding_service.generar_vector(fragmento)
                registros.append({
                    "fuente": fuente,
                    "referencia": referencia_fragmento,
                    "contenido": fragmento,
                    "embedding": vector
                })

        insertados = 0
        if registros:
            respuesta = supabase_db.table("jurisprudencia").insert(registros).execute()
            insertados = len(respuesta.data)

        return {
            "metodo_segmentacion": metodo_segmentacion,
            "fragmentos_insertados": insertados,
            "fragmentos_omitidos_duplicados": omitidos_duplicados
        }

    def ingestar_desde_url(self, url: str, fuente: str, referencia: str) -> dict:
        texto_limpio = scraper_peruano.extraer_norma(url)
        if not texto_limpio:
            raise ValueError("No se pudo extraer texto de la URL proporcionada. Verifica que la página sea accesible y tenga contenido legible.")
        return self.procesar_y_guardar_texto(texto_limpio, fuente, referencia)

    def ingestar_bytes_pdf(self, nombre_archivo: str, contenido_bytes: bytes, fuente: str, referencia: str) -> dict:
        max_bytes = settings.MAX_PDF_SIZE_MB * 1024 * 1024
        if len(contenido_bytes) > max_bytes:
            raise ValueError(f"El archivo PDF supera el límite permitido de {settings.MAX_PDF_SIZE_MB} MB.")

        nombre_seguro = os.path.basename(nombre_archivo).replace("..", "")
        if not nombre_seguro.lower().endswith(".pdf"):
            raise ValueError("Nombre de archivo PDF inválido.")

        ruta_guardado = pdf_processor.directorio_raw / nombre_seguro
        with open(ruta_guardado, "wb") as archivo:
            archivo.write(contenido_bytes)

        texto_limpio = pdf_processor.extraer_texto_bytes(contenido_bytes)
        if not texto_limpio.strip():
            raise ValueError("El documento PDF no contiene texto digital seleccionable (parece ser una imagen escaneada sin OCR).")

        resultado = self.procesar_y_guardar_texto(texto_limpio, fuente, referencia)
        resultado["archivo_guardado"] = str(ruta_guardado)
        return resultado

    def ingestar_pdf_local(self, nombre_archivo: str, fuente: str, referencia: str) -> dict:
        nombre_seguro = os.path.basename(nombre_archivo).replace("..", "")
        texto_limpio = pdf_processor.extraer_texto_archivo(nombre_seguro)
        if not texto_limpio.strip():
            raise ValueError("El archivo PDF local no contiene texto seleccionable.")
        return self.procesar_y_guardar_texto(texto_limpio, fuente, referencia)

    def construir_consulta_contextual(self, pregunta: str, historial: list[dict] | None = None) -> str:
        if not historial:
            return pregunta
        mensajes_usuario = [h.get("texto", "") for h in historial if h.get("rol") == "usuario" and h.get("texto")]
        if not mensajes_usuario:
            return pregunta
        ultimo_contexto = mensajes_usuario[-1]
        if len(pregunta.split()) <= 9:
            return f"{ultimo_contexto} - {pregunta}"
        return pregunta

    def buscar_hibrido(
        self,
        consulta: str,
        umbral_similitud: float = 0.3,
        limite_resultados: int = 3,
        fuente_filtro: str | None = None,
        historial: list[dict] | None = None
    ) -> list[dict]:
        limite_seguro = max(1, min(int(limite_resultados), 10))
        umbral_seguro = max(0.05, min(float(umbral_similitud), 0.95))

        consulta_efectiva = self.construir_consulta_contextual(consulta, historial)
        vector_consulta = embedding_service.generar_vector(consulta_efectiva)

        cantidad_candidatos = max(limite_seguro * 4, 12)
        respuesta = supabase_db.rpc(
            "buscar_jurisprudencia",
            {
                "query_embedding": vector_consulta,
                "match_threshold": umbral_seguro,
                "match_count": cantidad_candidatos
            }
        ).execute()

        candidatos = respuesta.data or []
        if fuente_filtro and fuente_filtro.strip() and fuente_filtro != "TODAS":
            candidatos = [c for c in candidatos if c.get("fuente") == fuente_filtro]

        mencion_art = re.search(r"(?:art[íi]culo|art\.)\s*(\d+)", consulta_efectiva, re.IGNORECASE)
        resultados_exactos = []
        ids_vistos = set()

        if mencion_art:
            numero_art = mencion_art.group(1)
            query_exacta = (
                supabase_db.table("jurisprudencia")
                .select("id, fuente, referencia, contenido")
                .ilike("referencia", f"%Artículo {numero_art}%")
            )
            if fuente_filtro and fuente_filtro.strip() and fuente_filtro != "TODAS":
                query_exacta = query_exacta.eq("fuente", fuente_filtro)
            res_exacta = query_exacta.limit(2).execute()
            for fila in (res_exacta.data or []):
                fila_copia = dict(fila)
                fila_copia["similitud"] = 0.99
                resultados_exactos.append(fila_copia)
                ids_vistos.add(fila_copia["id"])

        combinados = list(resultados_exactos)
        for cand in candidatos:
            if cand.get("id") not in ids_vistos:
                combinados.append(cand)
                ids_vistos.add(cand.get("id"))
            if len(combinados) >= limite_seguro:
                break

        return combinados[:limite_seguro]

    def buscar_similares(
        self,
        consulta: str,
        umbral_similitud: float = 0.3,
        limite_resultados: int = 3,
        fuente_filtro: str | None = None
    ) -> list[dict]:
        return self.buscar_hibrido(
            consulta=consulta,
            umbral_similitud=umbral_similitud,
            limite_resultados=limite_resultados,
            fuente_filtro=fuente_filtro
        )

    def consultar(
        self,
        pregunta: str,
        umbral_similitud: float = 0.3,
        limite_resultados: int = 3,
        modelo: str = "qwen3:8b",
        modo_perfil: str = "abogado",
        fuente_filtro: str | None = None,
        historial: list[dict] | None = None
    ) -> dict:
        fragmentos = self.buscar_hibrido(
            consulta=pregunta,
            umbral_similitud=umbral_similitud,
            limite_resultados=limite_resultados,
            fuente_filtro=fuente_filtro,
            historial=historial
        )
        if not fragmentos:
            return {
                "estado": "Sin contexto",
                "modelo_utilizado": modelo,
                "pregunta": pregunta,
                "respuesta_ia": "No se encontraron normas ni jurisprudencia relevante en la base de datos para responder esta consulta.",
                "fuentes_utilizadas": []
            }

        respuesta_ia = llm_service.generar_respuesta(
            pregunta=pregunta,
            fragmentos=fragmentos,
            modelo_override=modelo,
            modo_perfil=modo_perfil,
            historial=historial
        )
        return {
            "estado": "Éxito",
            "modelo_utilizado": modelo,
            "pregunta": pregunta,
            "respuesta_ia": respuesta_ia,
            "fuentes_utilizadas": fragmentos
        }

    def consultar_stream(
        self,
        pregunta: str,
        umbral_similitud: float = 0.3,
        limite_resultados: int = 3,
        modelo: str = "qwen3:8b",
        modo_perfil: str = "abogado",
        fuente_filtro: str | None = None,
        historial: list[dict] | None = None
    ) -> Iterator[str]:
        try:
            fragmentos = self.buscar_hibrido(
                consulta=pregunta,
                umbral_similitud=umbral_similitud,
                limite_resultados=limite_resultados,
                fuente_filtro=fuente_filtro,
                historial=historial
            )
        except Exception as e:
            logger.error(f"[RAG-STREAM] Error al buscar contexto en Supabase: {str(e)}", exc_info=True)
            evento_error = {
                "tipo": "error",
                "detalle": f"No se pudo consultar la base de datos de jurisprudencia en Supabase: {str(e)}"
            }
            yield f"data: {json.dumps(evento_error, ensure_ascii=False)}\n\n"
            return

        evento_fuentes = {
            "tipo": "fuentes",
            "fuentes_utilizadas": fragmentos,
            "modelo_utilizado": modelo
        }
        yield f"data: {json.dumps(evento_fuentes, ensure_ascii=False)}\n\n"

        if not fragmentos:
            evento_vacio = {
                "tipo": "token",
                "contenido": "No se encontraron normas ni jurisprudencia relevante en la base de datos para responder esta consulta. Prueba reduciendo el umbral de similitud o indexando la norma correspondiente."
            }
            yield f"data: {json.dumps(evento_vacio, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'tipo': 'fin'}, ensure_ascii=False)}\n\n"
            return

        try:
            for token in llm_service.generar_respuesta_stream(
                pregunta=pregunta,
                fragmentos=fragmentos,
                modelo_override=modelo,
                modo_perfil=modo_perfil,
                historial=historial
            ):
                evento_token = {"tipo": "token", "contenido": token}
                yield f"data: {json.dumps(evento_token, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"[RAG-STREAM] Error durante generación con Ollama: {str(e)}", exc_info=True)
            evento_error = {
                "tipo": "error",
                "detalle": str(e)
            }
            yield f"data: {json.dumps(evento_error, ensure_ascii=False)}\n\n"
            return

        yield f"data: {json.dumps({'tipo': 'fin'}, ensure_ascii=False)}\n\n"

rag_engine = RAGEngine()
