import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "").rstrip("/")
    SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "aboghub-secret-key-local-sovereign-ai-2026")
    JWT_EXPIRATION_HOURS: int = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))
    OLLAMA_BASE_URL: str = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    DEFAULT_LLM_MODEL: str = os.environ.get("DEFAULT_LLM_MODEL", "qwen3:8b")
    SUPERADMIN_EMAIL: str = os.environ.get("SUPERADMIN_EMAIL", "superadmin@aboghub.com").strip().lower()
    SUPERADMIN_PASSWORD: str = os.environ.get("SUPERADMIN_PASSWORD", "AbogHub#Super2026!")
    SUPERADMIN_NOMBRE: str = os.environ.get("SUPERADMIN_NOMBRE", "Superadmin Principal AbogHub")

settings = Settings()
