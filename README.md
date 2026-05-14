# ReceiptScanner

A full-stack receipt scanning app with:
- Kotlin Spring Boot API (`receipt-scanner`)
- React frontend (`receipt-scanner-frontend`)
- Python OCR/LLM microservice (`receiptToTextMS`)
- PostgreSQL database

## Quick Start (Docker, recommended)

### 1. Prerequisites
- Docker + Docker Compose
- Optional GPU for local Ollama model (`ollama` service)

### 2. Start the stack
From the repository root:

```bash
docker compose --profile llm up --build -d
```

If this is the first run, pull the default model:

```bash
docker compose exec ollama ollama pull qwen2.5:7b
```

### 3. Open the app
- Frontend: http://localhost:5173
- Kotlin API: http://localhost:8080
- Python OCR API docs: http://localhost:8000/docs

### 4. Stop services
```bash
docker compose down
```

To also delete database and model volumes:

```bash
docker compose down -v
```

## Local Development (without full Docker stack)

### Backend (Kotlin)
```bash
cd receipt-scanner
./gradlew bootRun
```

Required backend config:
- Database: `jdbc:postgresql://localhost:5432/mydb`
- Python service base URL: `http://localhost:8000`

### Frontend (React)
```bash
cd receipt-scanner-frontend
npm install
npm run dev
```

Optional API base override:
- `VITE_API_BASE_URL` (default: `http://localhost:8080`)

### Python OCR/LLM service
```bash
cd receiptToTextMS
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## How the scan flow works
1. Frontend uploads image to `POST /api/receipts/scan` (Kotlin API).
2. Kotlin API forwards the image to Python `POST /extract`.
3. Python returns parsed payload (`formatted_json`, metadata).
4. Kotlin stores scan + image and returns payload to frontend.
5. Frontend opens correction UI, then saves to `POST /api/receipts`.

## Troubleshooting
- `purchase_datetime is required`: check scan payload mapping and make sure backend receives non-empty `purchase_datetime`.
- Python returns 500: verify OCR dependencies (`paddlepaddle`, `paddleocr`) are installed.
- Python cannot reach Ollama: verify `OLLAMA_URL` and that model `qwen2.5:7b` is available.
- Receipt image load errors: ensure auth session is valid and backend has DB access.
