import time
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.logger import logger, leer_ultimos_logs
from core.security import require_roles
from api.auth_routes import router as auth_router
from api.user_routes import router as user_router
from api.apikey_routes import router as apikey_router
from api.rag_routes import router as rag_router

app = FastAPI(title="AbogHub IA - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    inicio = time.time()
    ruta = f"{request.method} {request.url.path}"
    try:
        respuesta = await call_next(request)
        duracion_ms = int((time.time() - inicio) * 1000)
        if respuesta.status_code >= 400:
            logger.warning(f"HTTP {respuesta.status_code} en {ruta} ({duracion_ms} ms)")
        else:
            logger.info(f"HTTP {respuesta.status_code} en {ruta} ({duracion_ms} ms)")
        return respuesta
    except Exception as exc:
        duracion_ms = int((time.time() - inicio) * 1000)
        logger.error(f"Fallo crítico no controlado en {ruta} ({duracion_ms} ms): {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "estado": "Error",
                "codigo_error": "ERROR_INTERNO_SERVIDOR",
                "detail": f"Error interno en el servidor backend ({request.url.path}): {str(exc)}"
            }
        )

@app.get("/")
def home():
    return {"mensaje": "Servidor FastAPI de AbogHub IA funcionando"}

@app.get("/api/logs")
def obtener_logs_sistema(solicitante: dict = Depends(require_roles("superadmin", "admin"))):
    return {
        "estado": "Éxito",
        "logs": leer_ultimos_logs(100)
    }

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(apikey_router)
app.include_router(rag_router)
