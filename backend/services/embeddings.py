from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self):
        self._model = None

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        return self._model

    def generar_vector(self, texto: str) -> list[float]:
        return self.model.encode(texto, normalize_embeddings=True).tolist()

    def dividir_texto(self, texto: str, max_palabras: int = 250, solapamiento: int = 40) -> list[str]:
        palabras = texto.split()
        if not palabras:
            return []
        fragmentos = []
        paso = max(1, max_palabras - solapamiento)
        for i in range(0, len(palabras), paso):
            fragmento = " ".join(palabras[i:i + max_palabras])
            fragmentos.append(fragmento)
            if i + max_palabras >= len(palabras):
                break
        return fragmentos

embedding_service = EmbeddingService()
