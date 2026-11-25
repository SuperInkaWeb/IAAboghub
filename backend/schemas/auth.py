from pydantic import BaseModel

class RegistroUsuarioRequest(BaseModel):
    nombre: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class CrearUsuarioAdminRequest(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str = "usuario"

class ActualizarRolRequest(BaseModel):
    rol: str

class CrearApiKeyRequest(BaseModel):
    nombre_proyecto: str
