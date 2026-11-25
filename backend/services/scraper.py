import requests
from bs4 import BeautifulSoup

class PeruanoScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

    def extraer_norma(self, url: str) -> str:
        try:
            respuesta = requests.get(url, headers=self.headers, timeout=30)
            respuesta.raise_for_status()
            soup = BeautifulSoup(respuesta.text, "html.parser")
            parrafos = soup.find_all("p")
            return "\n".join([p.get_text(strip=True) for p in parrafos if p.get_text(strip=True)])
        except Exception:
            return ""

scraper_peruano = PeruanoScraper()
