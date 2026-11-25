import subprocess
import time
import modal

MODELO_OLLAMA = "qwen3:8b"

def descargar_modelos_en_imagen():
    from sentence_transformers import SentenceTransformer
    SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    proc = subprocess.Popen(["ollama", "serve"])
    time.sleep(5)
    subprocess.run(["ollama", "pull", MODELO_OLLAMA], check=True)
    proc.terminate()

imagen_aboghub = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("curl", "ca-certificates", "zstd")
    .run_commands("curl -fsSL https://ollama.com/install.sh | sh")
    .pip_install(
        "fastapi",
        "uvicorn",
        "supabase",
        "beautifulsoup4",
        "requests",
        "sentence-transformers",
        "python-dotenv",
        "pypdf",
        "python-multipart",
        "pydantic"
    )
    .run_function(descargar_modelos_en_imagen)
    .add_local_dir(".", remote_path="/root/app", ignore=["__pycache__", ".env", "data/raw/*", "logs/*"])
)

app = modal.App("aboghub-ia-propia")

@app.function(
    image=imagen_aboghub,
    gpu="L4",
    memory=16384,
    timeout=300,
    scaledown_window=300,
    secrets=[modal.Secret.from_name("aboghub-env")]
)
@modal.asgi_app()
def fastapi_app():
    import sys
    sys.path.insert(0, "/root/app")
    subprocess.Popen(["ollama", "serve"])
    from main import app as backend_app
    return backend_app
