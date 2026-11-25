from fastapi import APIRouter, Depends, HTTPException
from core.security import require_roles
from schemas.auth import CrearApiKeyRequest
from services.api_key_service import api_key_service

router = APIRouter(prefix="/api/keys", tags=["API Keys Externas (Superadmin)"])

@router.get("")
def listar_api_keys(solicitante: dict = Depends(require_roles("superadmin"))):
    try:
        return {
            "estado": "Éxito",
            "api_keys": api_key_service.listar_keys()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar API Keys: {str(e)}")

@router.post("")
def generar_api_key(
    datos: CrearApiKeyRequest,
    solicitante: dict = Depends(require_roles("superadmin"))
):
    try:
        creada = api_key_service.crear_key(datos.nombre_proyecto)
        return {
            "estado": "Éxito",
            "mensaje": "API Key generada. Cópiala ahora, no se volverá a mostrar completa.",
            "api_key": creada
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar API Key: {str(e)}")

@router.delete("/{key_id}")
def revocar_api_key(
    key_id: str,
    solicitante: dict = Depends(require_roles("superadmin"))
):
    try:
        api_key_service.revocar_key(key_id)
        return {
            "estado": "Éxito",
            "mensaje": "API Key eliminada y revocada inmediatamente."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al revocar API Key: {str(e)}")
