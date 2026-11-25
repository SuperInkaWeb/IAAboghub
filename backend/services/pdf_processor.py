import io
import re
from pathlib import Path
from pypdf import PdfReader

class PDFProcessorService:
    def __init__(self, directorio_raw: str = "data/raw"):
        self.directorio_raw = Path(directorio_raw)
        self.directorio_raw.mkdir(parents=True, exist_ok=True)
        self.patron_articulo = re.compile(
            r"(?=(?:^|\n)\s*(?:ART[ÍI]CULO|Art[íi]culo|Art\.)\s+\d+[°º°.]?(?:-[A-Za-z])?)",
            re.MULTILINE
        )

    def extraer_texto_bytes(self, contenido_bytes: bytes) -> str:
        lector = PdfReader(io.BytesIO(contenido_bytes))
        paginas = []
        for pagina in lector.pages:
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                paginas.append(texto_pagina.strip())
        return "\n".join(paginas)

    def extraer_texto_archivo(self, nombre_archivo: str) -> str:
        ruta = self.directorio_raw / nombre_archivo
        if not ruta.exists():
            raise FileNotFoundError(f"No se encontró el archivo: {ruta}")
        with open(ruta, "rb") as archivo:
            return self.extraer_texto_bytes(archivo.read())

    def segmentar_por_articulos(self, texto: str, referencia_base: str) -> list[dict]:
        texto_normalizado = re.sub(r"\r\n", "\n", texto)
        bloques = [b.strip() for b in self.patron_articulo.split(texto_normalizado) if b.strip()]

        if len(bloques) <= 1:
            return []

        articulos = []
        patron_encabezado = re.compile(
            r"^\s*((?:ART[ÍI]CULO|Art[íi]culo|Art\.)\s+\d+[°º°.]?(?:-[A-Za-z])?)"
        )

        for idx, bloque in enumerate(bloques, start=1):
            coincidencia = patron_encabezado.match(bloque)
            if coincidencia:
                etiqueta_articulo = coincidencia.group(1).strip().rstrip(".")
                referencia = f"{referencia_base} - {etiqueta_articulo}"
            else:
                referencia = f"{referencia_base} - Preámbulo / Sección {idx}"

            texto_limpio = re.sub(r"\s+", " ", bloque).strip()
            if len(texto_limpio) >= 30:
                articulos.append({
                    "referencia": referencia,
                    "contenido": texto_limpio
                })

        return articulos

pdf_processor = PDFProcessorService()
