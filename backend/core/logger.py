import logging
import sys
from pathlib import Path

LOG_DIR = Path("logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "aboghub.log"

def get_logger(name: str = "aboghub") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    formato = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    consola_handler = logging.StreamHandler(sys.stdout)
    consola_handler.setFormatter(formato)
    logger.addHandler(consola_handler)

    archivo_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    archivo_handler.setFormatter(formato)
    logger.addHandler(archivo_handler)

    return logger

def leer_ultimos_logs(max_lineas: int = 80) -> list[str]:
    if not LOG_FILE.exists():
        return []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            lineas = [l.strip() for l in f.readlines() if l.strip()]
        return lineas[-max_lineas:]
    except Exception:
        return []

logger = get_logger()
