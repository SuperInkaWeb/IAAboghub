# AbogHub IA Propia — Motor RAG Jurídico Soberano (Perú)

**AbogHub IA Propia** es un sistema **RAG (Retrieval-Augmented Generation)** 100% soberano y especializado en legislación y jurisprudencia peruana (**Constitución Política del Perú, Diario Oficial El Peruano y Poder Judicial**). Está diseñado bajo una arquitectura libre de costos recurrentes por token y sin dependencia de APIs comerciales cerradas, utilizando modelos Open Source con **Licencia Apache 2.0** aptos para uso comercial.

---

## Características Principales

- **Búsqueda Híbrida Normativa (`pgvector` + SQL Exacto):** Combina búsqueda vectorial semántica de 384 dimensiones con detección exacta de número de artículo (`Artículo 27`, `Art. 12`, etc.) y filtrado por cuerpo normativo.
- **Segmentación Legislativa Inteligente:** Procesa documentos PDF oficiales y páginas web de *El Peruano*, segmentándolos automáticamente artículo por artículo y previniendo registros duplicados.
- **LLM Open Source Comercial (Apache 2.0):** Integración nativa con **Ollama (`qwen3:8b`)** y soporte de **Streaming en Tiempo Real (SSE)** palabra por palabra.
- **Doble Perfil Jurídico:**
  - **Modo Abogado (Copiloto Técnico):** Redacta dictámenes estructurados por fundamentos de derecho citando incisos y referencias exactas.
  - **Modo Cliente (Orientación Ciudadana):** Explica la norma en lenguaje claro para personas o empresas y conecta con el Marketplace de **AbogHub.com**.
- **Gobierno de Seguridad RBAC (`superadmin`, `admin`, `usuario`):**
  - `superadmin`: Credencial maestra blindada en servidor; administra roles, usuarios, API Keys externas, auditoría de logs y conmutación de servidores.
  - `admin`: Autorizado para alimentar y vectorizar nuevas normas (PDF / URL) en la base de datos.
  - `usuario`: Acceso verificado al motor de consultas jurídicas RAG.
- **Emisión de API Keys Externas (`abog_live_...`):** Permite integrar el motor RAG de AbogHub dentro de otras páginas web, aplicaciones móviles o CRMs mediante cabeceras `X-API-Key` o `Authorization: Bearer`.
- **Conmutador Híbrido de Infraestructura (`Demo Laptop` ↔ `Cloud 24/7`):** Permite al Superadmin alternar en un clic entre el servidor local y el despliegue Serverless GPU en **Modal.com (NVIDIA L4)**.

---

## Arquitectura del Proyecto

```text
aboghub-ia-propia/
├── backend/
│   ├── api/
│   │   ├── auth_routes.py       # Login, registro y validación de sesión JWT
│   │   ├── user_routes.py       # Gestión RBAC de administradores y usuarios
│   │   ├── apikey_routes.py     # Emisión y revocación de API Keys externas
│   │   └── rag_routes.py        # Ingesta PDF/URL, búsqueda híbrida y streaming RAG
│   ├── core/
│   │   ├── config.py            # Variables de entorno y configuración maestra
│   │   ├── database.py          # Cliente global de Supabase
│   │   ├── logger.py            # Bitácora centralizada en consola y archivo
│   │   └── security.py          # Hashing PBKDF2-SHA256, JWT HS256 y validación API Key
│   ├── schemas/
│   │   ├── auth.py              # Contratos Pydantic de autenticación y usuarios
│   │   └── rag.py               # Contratos Pydantic del motor RAG
│   ├── services/
│   │   ├── auth_service.py      # Lógica de autenticación y control de roles
│   │   ├── api_key_service.py   # Gestión criptográfica de llaves abog_live_...
│   │   ├── embeddings.py        # SentenceTransformers (paraphrase-multilingual-MiniLM-L12-v2)
│   │   ├── llm.py               # Cliente Ollama con soporte de streaming SSE
│   │   ├── pdf_processor.py     # Extracción de PDFs y segmentación por Artículo
│   │   ├── rag_engine.py        # Orquestador RAG (Búsqueda Híbrida + Memoria + Generación)
│   │   └── scraper.py           # Scraper de normas legales
│   ├── main.py                  # Punto de entrada FastAPI y middlewares
│   ├── modal_deploy.py          # Despliegue Serverless GPU (NVIDIA L4) en Modal.com
│   ├── Dockerfile               # Imagen Docker con Python + Ollama
│   └── requirements.txt         # Dependencias del backend
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx               # Barra corporativa AbogHub + Switch Local/Cloud
    │   │   ├── LandingPage.jsx          # Portada de presentación con acceso controlado
    │   │   ├── AuthModal.jsx            # Modal de Ingreso e Inscripción
    │   │   ├── UserManagementModal.jsx  # Consola Superadmin (Usuarios, API Keys y Logs)
    │   │   ├── IngestionDrawer.jsx      # Panel de ingesta PDF/URL y calibración RAG
    │   │   ├── ChatPanel.jsx            # Chat jurídico con streaming en vivo
    │   │   └── EvidencePanel.jsx        # Tarjetas de artículos recuperados y % similitud
    │   ├── context/
    │   │   └── AuthContext.jsx          # Estado global de sesión JWT
    │   ├── services/
    │   │   └── api.js                   # Cliente HTTP dinámico, traductor de errores y logs
    │   ├── utils/
    │   │   └── formatText.jsx           # Formateador de dictámenes legales
    │   └── App.jsx                      # Orquestador principal de la interfaz
    └── package.json
```

---

## Configuración de Base de Datos (Supabase + pgvector)

Ejecuta el siguiente script SQL en el **SQL Editor** de tu proyecto en **Supabase**:

```sql
create extension if not exists vector;

create table if not exists jurisprudencia (
  id uuid default gen_random_uuid() primary key,
  fuente text not null,
  referencia text not null,
  contenido text not null,
  embedding vector(384)
);

alter table jurisprudencia disable row level security;

create or replace function buscar_jurisprudencia (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  fuente text,
  referencia text,
  contenido text,
  similitud float
)
language sql stable
as $$
  select
    jurisprudencia.id,
    jurisprudencia.fuente,
    jurisprudencia.referencia,
    jurisprudencia.contenido,
    1 - (jurisprudencia.embedding <=> query_embedding) as similitud
  from jurisprudencia
  where 1 - (jurisprudencia.embedding <=> query_embedding) > match_threshold
  order by jurisprudencia.embedding <=> query_embedding
  limit match_count;
$$;

create table if not exists usuarios (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  email text unique not null,
  password_hash text not null,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  activo boolean not null default true,
  creado_en timestamp with time zone default now()
);

alter table usuarios disable row level security;

create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  nombre_proyecto text not null,
  prefijo text not null,
  key_hash text unique not null,
  activa boolean not null default true,
  creado_en timestamp with time zone default now()
);

alter table api_keys disable row level security;
```

---

## Instalación y Ejecución Local

### 1. Backend (FastAPI + Ollama)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
ollama pull qwen3:8b
uvicorn main:app --reload
```

*(Copia `backend/.env.example` a `backend/.env` y coloca tus credenciales `SUPABASE_URL` y `SUPABASE_KEY`).*

### 2. Frontend (React + Vite + Tailwind CSS)

```powershell
cd frontend
npm install
npm run dev
```

Abre en tu navegador: `http://localhost:5173`

---

## Despliegue Cloud Serverless GPU (Modal.com)

Para desplegar el backend junto con Ollama (`qwen3:8b`) sobre una GPU NVIDIA L4 en **Modal.com**:

```powershell
cd backend
pip install modal
python -m modal setup
python -m modal deploy modal_deploy.py
```

---

## Consumo Externo mediante API Key

Cualquier página web o sistema de la organización puede consultar el motor RAG enviando una llave `abog_live_...` generada desde el panel de Superadmin:

```javascript
const respuesta = await fetch("https://tu-endpoint-aboghub/api/consultar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "abog_live_TU_API_KEY"
  },
  body: JSON.stringify({
    pregunta: "¿Cómo funciona la desconexión digital según la Ley 31572?",
    modo_perfil: "cliente"
  })
});

const dictamen = await respuesta.json();
console.log(dictamen.respuesta_ia, dictamen.fuentes_utilizadas);
```
