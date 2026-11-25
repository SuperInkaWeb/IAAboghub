import ipaddress
import socket
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

class PeruanoScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

    def validar_url_segura(self, url: str) -> None:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Solo se permiten URLs con protocolo http:// o https://")
        hostname = parsed.hostname
        if not hostname:
            raise ValueError("La URL proporcionada no contiene un dominio válido.")
        if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            raise ValueError("Por seguridad (SSRF), no se permite consultar direcciones locales.")
        try:
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_reserved:
                raise ValueError("Por seguridad (SSRF), no se permite acceder a redes internas o privadas.")
        except socket.gaierror:
            raise ValueError(f"No se pudo resolver el dominio '{hostname}'. Verifica que la URL esté bien escrita.")

    def extraer_norma(self, url: str) -> str:
        self.validar_url_segura(url)
        try:
            respuesta = requests.get(url.strip(), headers=self.headers, timeout=30)
            respuesta.raise_for_status()
            soup = BeautifulSoup(respuesta.text, "html.parser")
            parrafos = soup.find_all("p")
            return "\n".join([p.get_text(strip=True) for p in parrafos if p.get_text(strip=True)])
        except Exception:
            return ""

scraper_peruano = PeruanoScraper()
