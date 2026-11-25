from fastapi import APIRouter, Depends, HTTPException
from core.security import require_roles
from schemas.auth import CrearUsuarioAdminRequest, ActualizarRolRequest
from services.auth_service import auth_service

router = APIRouter(prefix="/api/users", tags=["Gestión de Usuarios (Superadmin)"])

@router.get("")
def listar_usuarios(usuario: dict = Depends(require_roles("superadmin", "admin"))):
    try:
        return {
            "estado": "Éxito",
            "usuarios": auth_service.listar_usuarios()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar usuarios: {str(e)}")

@router.post("")
def crear_usuario(
    datos: CrearUsuarioAdminRequest,
    solicitante: dict = Depends(require_roles("superadmin"))
):
    try:
        creado = auth_service.crear_usuario_desde_panel(
            nombre=datos.nombre,
            email=datos.email,
            password=datos.password,
            rol=datos.rol
        )
        return {
            "estado": "Éxito",
            "mensaje": f"Usuario creado con el rol '{datos.rol}'",
            "usuario": creado
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear usuario: {str(e)}")

@router.patch("/{usuario_id}/rol")
def actualizar_rol_usuario(
    usuario_id: str,
    datos: ActualizarRolRequest,
    solicitante: dict = Depends(require_roles("superadmin"))
):
    try:
        actualizado = auth_service.cambiar_rol(
            usuario_id=usuario_id,
            nuevo_rol=datos.rol
        )
        return {
            "estado": "Éxito",
            "mensaje": "Rol actualizado correctamente",
            "usuario": actualizado
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar rol: {str(e)}")

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: str,
    solicitante: dict = Depends(require_roles("superadmin"))
):
    try:
        auth_service.eliminar_usuario(usuario_id=usuario_id)
        return {
            "estado": "Éxito",
            "mensaje": "Usuario eliminado correctamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar usuario: {str(e)}")
