from core.database import supabase_db
from core.security import generate_raw_api_key, hash_api_key

class ApiKeyService:
    def listar_keys(self) -> list[dict]:
        res = (
            supabase_db.table("api_keys")
            .select("id, nombre_proyecto, prefijo, activa, creado_en")
            .order("creado_en", desc=True)
            .execute()
        )
        return res.data or []

    def crear_key(self, nombre_proyecto: str) -> dict:
        nombre_limpio = nombre_proyecto.strip()
        if not nombre_limpio:
            raise ValueError("Debes indicar el nombre del proyecto o página web que usará la API Key.")

        raw_key = generate_raw_api_key()
        prefijo = f"{raw_key[:14]}...{raw_key[-4:]}"
        key_hash = hash_api_key(raw_key)

        nuevo = {
            "nombre_proyecto": nombre_limpio,
            "prefijo": prefijo,
            "key_hash": key_hash,
            "activa": True
        }

        insertado = supabase_db.table("api_keys").insert(nuevo).execute()
        if not insertado.data:
            raise ValueError("No se pudo guardar la API Key en Supabase.")

        fila = insertado.data[0]
        return {
            "id": fila["id"],
            "nombre_proyecto": fila["nombre_proyecto"],
            "prefijo": fila["prefijo"],
            "api_key_secreta": raw_key,
            "activa": fila["activa"],
            "creado_en": fila.get("creado_en")
        }

    def revocar_key(self, key_id: str) -> None:
        supabase_db.table("api_keys").delete().eq("id", key_id).execute()

api_key_service = ApiKeyService()
