from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from core.database import supabase_db
from core.logger import logger
from core.security import get_current_user, require_roles
from services.scraper import scraper_peruano
from services.rag_engine import rag_engine
from schemas.rag import (
    IngestaRequest,
    IngestaArchivoLocalRequest,
    BusquedaRequest,
    ConsultaRAGRequest
)

router = APIRouter(prefix="/api", tags=["AbogHub IA RAG"])

@router.get("/test-db")
def test_database():
    try:
        respuesta = supabase_db.table("jurisprudencia").select("id", count="exact").limit(1).execute()
        fuentes = rag_engine.listar_fuentes()
        return {
            "estado": "Éxito",
            "mensaje": "Conexión perfecta con Supabase",
            "cantidad_registros": respuesta.count,
            "fuentes_disponibles": fuentes
        }
    except Exception as e:
        logger.error(f"[TEST-DB] Fallo al conectar con la tabla 'jurisprudencia' en Supabase: {str(e)}", exc_info=True)
        return {
            "estado": "Error",
            "mensaje": "No se pudo conectar a la tabla 'jurisprudencia' en Supabase",
            "detalle": str(e),
            "fuentes_disponibles": []
        }

@router.get("/fuentes")
def obtener_fuentes(solicitante: dict = Depends(get_current_user)):
    try:
        return {"estado": "Éxito", "fuentes": rag_engine.listar_fuentes()}
    except Exception as e:
        logger.error(f"[FUENTES] Error al listar fuentes en Supabase: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"No se pudieron obtener las fuentes legales desde Supabase: {str(e)}")

@router.get("/test-scraper")
def test_scraper(
    url: str,
    solicitante: dict = Depends(require_roles("superadmin", "admin"))
):
    logger.info(f"[SCRAPER-TEST] Probando extracción de URL: {url}")
    texto = scraper_peruano.extraer_norma(url)
    if not texto:
        logger.warning(f"[SCRAPER-TEST] URL sin contenido extraíble: {url}")
        raise HTTPException(
            status_code=400,
            detail="No se pudo extraer texto de esa URL. Verifica que el enlace sea público y contenga párrafos HTML legibles."
        )
    return {
        "estado": "Éxito",
        "longitud_caracteres": len(texto),
        "vista_previa": texto[:500]
    }

@router.post("/ingestar-norma")
def ingestar_norma(
    datos: IngestaRequest,
    solicitante: dict = Depends(require_roles("superadmin", "admin"))
):
    try:
        logger.info(f"[INGESTA-URL] Iniciando ingesta por {solicitante.get('email')}: ref='{datos.referencia}' url='{datos.url}'")
        resultado = rag_engine.ingestar_desde_url(datos.url, datos.fuente, datos.referencia)
        logger.info(
            f"[INGESTA-URL] Completada: {resultado['fragmentos_insertados']} insertados, "
            f"{resultado['fragmentos_omitidos_duplicados']} duplicados omitidos"
        )
        return {
            "estado": "Éxito",
            "mensaje": "Norma procesada, vectorizada y almacenada en Supabase",
            "metodo_segmentacion": resultado["metodo_segmentacion"],
            "fragmentos_insertados": resultado["fragmentos_insertados"],
            "fragmentos_omitidos_duplicados": resultado["fragmentos_omitidos_duplicados"]
        }
    except ValueError as e:
        logger.warning(f"[INGESTA-URL] Error de validación en '{datos.referencia}': {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[INGESTA-URL] Fallo al guardar en Supabase '{datos.referencia}': {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al vectorizar o guardar la norma en Supabase: {str(e)}"
        )

@router.post("/ingestar-pdf")
async def ingestar_pdf(
    archivo: UploadFile = File(...),
    fuente: str = Form("Legislación Peruana"),
    referencia: str = Form(...),
    solicitante: dict = Depends(require_roles("superadmin", "admin"))
):
    if not archivo.filename or not archivo.filename.lower().endswith(".pdf"):
        logger.warning(f"[INGESTA-PDF] Archivo rechazado (no es PDF): {archivo.filename}")
        raise HTTPException(status_code=400, detail="El archivo seleccionado no es válido. Debes subir un documento en formato PDF (.pdf).")

    try:
        logger.info(f"[INGESTA-PDF] Procesando '{archivo.filename}' (ref='{referencia}') subido por {solicitante.get('email')}")
        contenido_bytes = await archivo.read()
        resultado = rag_engine.ingestar_bytes_pdf(archivo.filename, contenido_bytes, fuente, referencia)
        logger.info(
            f"[INGESTA-PDF] Completada '{referencia}': {resultado['fragmentos_insertados']} insertados, "
            f"{resultado['fragmentos_omitidos_duplicados']} duplicados omitidos"
        )
        return {
            "estado": "Éxito",
            "mensaje": "PDF procesado, vectorizado y almacenado en Supabase",
            "archivo_guardado": resultado["archivo_guardado"],
            "metodo_segmentacion": resultado["metodo_segmentacion"],
            "fragmentos_insertados": resultado["fragmentos_insertados"],
            "fragmentos_omitidos_duplicados": resultado["fragmentos_omitidos_duplicados"]
        }
    except ValueError as e:
        logger.warning(f"[INGESTA-PDF] PDF sin texto válido '{archivo.filename}': {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[INGESTA-PDF] Error interno al procesar '{archivo.filename}': {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo procesar ni guardar el PDF '{archivo.filename}': {str(e)}"
        )

@router.post("/ingestar-pdf-local")
def ingestar_pdf_local(
    datos: IngestaArchivoLocalRequest,
    solicitante: dict = Depends(require_roles("superadmin", "admin"))
):
    try:
        logger.info(f"[INGESTA-LOCAL] Procesando archivo local '{datos.nombre_archivo}'")
        resultado = rag_engine.ingestar_pdf_local(datos.nombre_archivo, datos.fuente, datos.referencia)
        return {
            "estado": "Éxito",
            "mensaje": "PDF local procesado, vectorizado y almacenado en Supabase",
            "archivo": datos.nombre_archivo,
            "metodo_segmentacion": resultado["metodo_segmentacion"],
            "fragmentos_insertados": resultado["fragmentos_insertados"],
            "fragmentos_omitidos_duplicados": resultado["fragmentos_omitidos_duplicados"]
        }
    except FileNotFoundError as e:
        logger.warning(f"[INGESTA-LOCAL] Archivo no encontrado: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.warning(f"[INGESTA-LOCAL] Error de contenido en '{datos.nombre_archivo}': {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[INGESTA-LOCAL] Fallo en '{datos.nombre_archivo}': {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar el PDF local: {str(e)}")

@router.post("/buscar")
def buscar_jurisprudencia(
    datos: BusquedaRequest,
    solicitante: dict = Depends(get_current_user)
):
    if not datos.consulta.strip():
        raise HTTPException(status_code=400, detail="Escribe una consulta jurídica antes de buscar.")

    try:
        logger.info(f"[BUSQUEDA] Usuario={solicitante.get('email')} consulta='{datos.consulta[:80]}'")
        resultados = rag_engine.buscar_similares(
            consulta=datos.consulta,
            umbral_similitud=datos.umbral_similitud,
            limite_resultados=datos.limite_resultados,
            fuente_filtro=datos.fuente_filtro
        )
        return {
            "estado": "Éxito",
            "consulta": datos.consulta,
            "total_encontrados": len(resultados),
            "resultados": resultados
        }
    except Exception as e:
        logger.error(f"[BUSQUEDA] Error en búsqueda vectorial Supabase: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al ejecutar la búsqueda vectorial en Supabase (verifica la función RPC 'buscar_jurisprudencia'): {str(e)}"
        )

@router.post("/consultar")
def consultar_rag(
    datos: ConsultaRAGRequest,
    solicitante: dict = Depends(get_current_user)
):
    if not datos.pregunta.strip():
        raise HTTPException(status_code=400, detail="La consulta jurídica no puede estar vacía.")

    try:
        logger.info(f"[CONSULTA-RAG] Usuario={solicitante.get('email')} modelo={datos.modelo} pregunta='{datos.pregunta[:80]}'")
        historial_dicts = [m.model_dump() for m in datos.historial]
        return rag_engine.consultar(
            pregunta=datos.pregunta,
            umbral_similitud=datos.umbral_similitud,
            limite_resultados=datos.limite_resultados,
            modelo=datos.modelo,
            modo_perfil=datos.modo_perfil,
            fuente_filtro=datos.fuente_filtro,
            historial=historial_dicts
        )
    except Exception as e:
        logger.error(f"[CONSULTA-RAG] Fallo en motor RAG: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fallo en el motor jurídico RAG: {str(e)}")

@router.post("/consultar-stream")
def consultar_rag_stream(
    datos: ConsultaRAGRequest,
    solicitante: dict = Depends(get_current_user)
):
    if not datos.pregunta.strip():
        raise HTTPException(status_code=400, detail="La consulta jurídica no puede estar vacía.")

    logger.info(f"[CONSULTA-STREAM] Usuario={solicitante.get('email')} modelo={datos.modelo} pregunta='{datos.pregunta[:80]}'")
    historial_dicts = [m.model_dump() for m in datos.historial]
    generador = rag_engine.consultar_stream(
        pregunta=datos.pregunta,
        umbral_similitud=datos.umbral_similitud,
        limite_resultados=datos.limite_resultados,
        modelo=datos.modelo,
        modo_perfil=datos.modo_perfil,
        fuente_filtro=datos.fuente_filtro,
        historial=historial_dicts
    )
    return StreamingResponse(generador, media_type="text/event-stream")
