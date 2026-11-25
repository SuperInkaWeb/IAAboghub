import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings
from core.database import supabase_db

security_scheme = HTTPBearer(auto_error=False)

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return f"{salt}${dk.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hex_hash = stored_hash.split("$", 1)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
        return hmac.compare_digest(dk.hex(), hex_hash)
    except Exception:
        return False

def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def generate_raw_api_key() -> str:
    return f"abog_live_{secrets.token_urlsafe(24)}"

def create_access_token(payload: dict) -> str:
    if not settings.JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY no está configurada en las variables de entorno (.env).")
    header = {"alg": "HS256", "typ": "JWT"}
    exp = int(time.time()) + (settings.JWT_EXPIRATION_HOURS * 3600)
    body = {**payload, "exp": exp}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body_b64 = _b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{body_b64}".encode("utf-8")
    signature = hmac.new(settings.JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)
    return f"{header_b64}.{body_b64}.{sig_b64}"

def decode_access_token(token: str) -> dict:
    if not settings.JWT_SECRET_KEY:
        raise HTTPException(status_code=500, detail="JWT_SECRET_KEY no está configurada en el servidor.")
    try:
        header_b64, body_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{body_b64}".encode("utf-8")
        expected_sig = hmac.new(settings.JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Firma de token inválida")
        payload = json.loads(_b64url_decode(body_b64).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("El token ha expirado")
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido o expirado: {str(e)}")

def validar_api_key_externa(raw_key: str) -> dict:
    key_hash = hash_api_key(raw_key.strip())
    try:
        res = (
            supabase_db.table("api_keys")
            .select("id, nombre_proyecto, prefijo, activa")
            .eq("key_hash", key_hash)
            .eq("activa", True)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=401, detail="API Key inválida o revocada.")
        registro = res.data[0]
        return {
            "sub": f"apikey:{registro['id']}",
            "nombre": f"Integración: {registro['nombre_proyecto']}",
            "email": "api@aboghub.com",
            "rol": "api_client",
            "tipo_auth": "api_key"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Error al verificar API Key: {str(e)}")

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    x_api_key: str | None = Header(default=None, alias="X-API-Key")
) -> dict:
    if x_api_key and x_api_key.strip():
        return validar_api_key_externa(x_api_key)

    if credentials and credentials.credentials:
        token = credentials.credentials.strip()
        if token.startswith("abog_live_"):
            return validar_api_key_externa(token)
        return decode_access_token(token)

    raise HTTPException(status_code=401, detail="No autenticado. Inicia sesión o proporciona una API Key válida.")

def require_roles(*allowed_roles: str):
    def role_checker(user: dict = Depends(get_current_user)) -> dict:
        rol_usuario = user.get("rol", "")
        if rol_usuario not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permisos insuficientes. Se requiere uno de los roles: {', '.join(allowed_roles)}"
            )
        return user
    return role_checker
