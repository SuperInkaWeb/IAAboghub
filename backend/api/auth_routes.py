from fastapi import APIRouter, Depends, HTTPException
from core.logger import logger
from core.security import get_current_user
from schemas.auth import RegistroUsuarioRequest, LoginRequest
from services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

@router.post("/register")
def registrar(datos: RegistroUsuarioRequest):
    try:
        logger.info(f"[AUTH-REGISTER] Intento de registro para correo: {datos.email}")
        resultado = auth_service.registrar_usuario(datos.nombre, datos.email, datos.password)
        logger.info(f"[AUTH-REGISTER] Usuario registrado exitosamente: {datos.email} (rol={resultado['usuario']['rol']})")
        return {
            "estado": "Éxito",
            "mensaje": "Cuenta creada exitosamente",
            **resultado
        }
    except ValueError as e:
        logger.warning(f"[AUTH-REGISTER] Validación rechazada para {datos.email}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[AUTH-REGISTER] Error en base de datos al registrar {datos.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo completar el registro en la base de datos Supabase. Verifica que la tabla 'usuarios' exista. Detalle técnico: {str(e)}"
        )

@router.post("/login")
def iniciar_sesion(datos: LoginRequest):
    try:
        logger.info(f"[AUTH-LOGIN] Intento de inicio de sesión: {datos.email}")
        resultado = auth_service.autenticar(datos.email, datos.password)
        logger.info(f"[AUTH-LOGIN] Sesión iniciada con éxito: {datos.email} (rol={resultado['usuario']['rol']})")
        return {
            "estado": "Éxito",
            "mensaje": "Sesión iniciada correctamente",
            **resultado
        }
    except ValueError as e:
        logger.warning(f"[AUTH-LOGIN] Credenciales rechazadas para {datos.email}: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"[AUTH-LOGIN] Error inesperado al autenticar {datos.email}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al consultar la tabla 'usuarios' en Supabase durante el inicio de sesión: {str(e)}"
        )

@router.get("/me")
def perfil_actual(usuario: dict = Depends(get_current_user)):
    return {
        "estado": "Éxito",
        "usuario": {
            "id": usuario.get("sub"),
            "nombre": usuario.get("nombre"),
            "email": usuario.get("email"),
            "rol": usuario.get("rol")
        }
    }
