import hmac
from core.config import settings
from core.database import supabase_db
from core.security import hash_password, verify_password, create_access_token

ROLES_GESTIONABLES = {"admin", "usuario"}

class AuthService:
    def registrar_usuario(self, nombre: str, email: str, password: str) -> dict:
        email_limpio = email.strip().lower()
        nombre_limpio = nombre.strip()

        if not email_limpio or not nombre_limpio or len(password) < 6:
            raise ValueError("Completa todos los campos y usa una contraseña de al menos 6 caracteres.")

        if settings.SUPERADMIN_EMAIL and email_limpio == settings.SUPERADMIN_EMAIL:
            raise ValueError("No se puede registrar una cuenta con este correo electrónico.")

        existente = supabase_db.table("usuarios").select("id").eq("email", email_limpio).execute()
        if existente.data:
            raise ValueError("Ya existe una cuenta registrada con este correo electrónico.")

        nuevo = {
            "nombre": nombre_limpio,
            "email": email_limpio,
            "password_hash": hash_password(password),
            "rol": "usuario",
            "activo": True
        }

        insertado = supabase_db.table("usuarios").insert(nuevo).execute()
        if not insertado.data:
            raise ValueError("No se pudo registrar el usuario en Supabase.")

        usuario = insertado.data[0]
        token = create_access_token({
            "sub": str(usuario["id"]),
            "email": usuario["email"],
            "nombre": usuario["nombre"],
            "rol": "usuario"
        })

        return {
            "token": token,
            "usuario": {
                "id": usuario["id"],
                "nombre": usuario["nombre"],
                "email": usuario["email"],
                "rol": "usuario",
                "activo": usuario.get("activo", True)
            }
        }

    def autenticar(self, email: str, password: str) -> dict:
        email_limpio = email.strip().lower()

        if settings.SUPERADMIN_EMAIL and settings.SUPERADMIN_PASSWORD:
            if hmac.compare_digest(email_limpio, settings.SUPERADMIN_EMAIL):
                if not hmac.compare_digest(password, settings.SUPERADMIN_PASSWORD):
                    raise ValueError("Credenciales inválidas. Verifica tu correo y contraseña.")
                token = create_access_token({
                    "sub": "superadmin-root",
                    "email": settings.SUPERADMIN_EMAIL,
                    "nombre": settings.SUPERADMIN_NOMBRE,
                    "rol": "superadmin"
                })
                return {
                    "token": token,
                    "usuario": {
                        "id": "superadmin-root",
                        "nombre": settings.SUPERADMIN_NOMBRE,
                        "email": settings.SUPERADMIN_EMAIL,
                        "rol": "superadmin",
                        "activo": True
                    }
                }

        consulta = supabase_db.table("usuarios").select("*").eq("email", email_limpio).execute()
        if not consulta.data:
            raise ValueError("Credenciales inválidas. Verifica tu correo y contraseña.")

        usuario = consulta.data[0]
        if not usuario.get("activo", True):
            raise ValueError("Esta cuenta ha sido desactivada por un administrador.")

        if not verify_password(password, usuario["password_hash"]):
            raise ValueError("Credenciales inválidas. Verifica tu correo y contraseña.")

        rol_efectivo = "admin" if usuario.get("rol") == "admin" else "usuario"

        token = create_access_token({
            "sub": str(usuario["id"]),
            "email": usuario["email"],
            "nombre": usuario["nombre"],
            "rol": rol_efectivo
        })

        return {
            "token": token,
            "usuario": {
                "id": usuario["id"],
                "nombre": usuario["nombre"],
                "email": usuario["email"],
                "rol": rol_efectivo,
                "activo": usuario.get("activo", True)
            }
        }

    def listar_usuarios(self) -> list[dict]:
        respuesta = (
            supabase_db.table("usuarios")
            .select("id, nombre, email, rol, activo, creado_en")
            .order("creado_en", desc=False)
            .execute()
        )
        return respuesta.data or []

    def crear_usuario_desde_panel(self, nombre: str, email: str, password: str, rol: str) -> dict:
        rol_limpio = rol.strip().lower()
        if rol_limpio not in ROLES_GESTIONABLES:
            raise ValueError("Solo se pueden crear cuentas con rol 'admin' o 'usuario'. El rol 'superadmin' es único y está protegido.")

        email_limpio = email.strip().lower()
        if settings.SUPERADMIN_EMAIL and email_limpio == settings.SUPERADMIN_EMAIL:
            raise ValueError("Ese correo está reservado en las variables de entorno del servidor.")

        existente = supabase_db.table("usuarios").select("id").eq("email", email_limpio).execute()
        if existente.data:
            raise ValueError("Ya existe un usuario con ese correo electrónico.")

        nuevo = {
            "nombre": nombre.strip(),
            "email": email_limpio,
            "password_hash": hash_password(password),
            "rol": rol_limpio,
            "activo": True
        }

        insertado = supabase_db.table("usuarios").insert(nuevo).execute()
        usuario = insertado.data[0]
        return {
            "id": usuario["id"],
            "nombre": usuario["nombre"],
            "email": usuario["email"],
            "rol": usuario["rol"],
            "activo": usuario.get("activo", True)
        }

    def cambiar_rol(self, usuario_id: str, nuevo_rol: str) -> dict:
        rol_limpio = nuevo_rol.strip().lower()
        if rol_limpio not in ROLES_GESTIONABLES:
            raise ValueError("Solo se permite asignar los roles 'admin' o 'usuario'.")

        actualizado = (
            supabase_db.table("usuarios")
            .update({"rol": rol_limpio})
            .eq("id", usuario_id)
            .execute()
        )
        if not actualizado.data:
            raise ValueError("Usuario no encontrado.")
        u = actualizado.data[0]
        return {
            "id": u["id"],
            "nombre": u["nombre"],
            "email": u["email"],
            "rol": u["rol"],
            "activo": u.get("activo", True)
        }

    def eliminar_usuario(self, usuario_id: str) -> None:
        supabase_db.table("usuarios").delete().eq("id", usuario_id).execute()

auth_service = AuthService()
