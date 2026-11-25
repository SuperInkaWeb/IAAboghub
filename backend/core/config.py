import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "").strip().strip('"').rstrip("/")
    SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "").strip().strip('"')
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "").strip().strip('"')
    JWT_EXPIRATION_HOURS: int = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))
    OLLAMA_BASE_URL: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").strip()
    DEFAULT_LLM_MODEL: str = os.environ.get("DEFAULT_LLM_MODEL", "qwen3:8b").strip()
    SUPERADMIN_EMAIL: str = os.environ.get("SUPERADMIN_EMAIL", "").strip().strip('"').lower()
    SUPERADMIN_PASSWORD: str = os.environ.get("SUPERADMIN_PASSWORD", "").strip().strip('"')
    SUPERADMIN_NOMBRE: str = os.environ.get("SUPERADMIN_NOMBRE", "Superadmin Principal AbogHub").strip().strip('"')
    CORS_ORIGINS: str = os.environ.get("CORS_ORIGINS", "*").strip()
    MAX_PDF_SIZE_MB: int = int(os.environ.get("MAX_PDF_SIZE_MB", "20"))

settings = Settings()
