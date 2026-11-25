from pydantic import BaseModel, Field

class IngestaRequest(BaseModel):
    url: str
    fuente: str = "El Peruano"
    referencia: str

class IngestaArchivoLocalRequest(BaseModel):
    nombre_archivo: str
    fuente: str
    referencia: str

class BusquedaRequest(BaseModel):
    consulta: str
    umbral_similitud: float = 0.3
    limite_resultados: int = 3
    fuente_filtro: str | None = None

class MensajeHistorial(BaseModel):
    rol: str
    texto: str

class ConsultaRAGRequest(BaseModel):
    pregunta: str
    umbral_similitud: float = 0.3
    limite_resultados: int = 3
    modelo: str = "qwen3:8b"
    modo_perfil: str = "abogado"
    fuente_filtro: str | None = None
    historial: list[MensajeHistorial] = Field(default_factory=list)
