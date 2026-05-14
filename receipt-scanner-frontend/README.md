# Receipt Scanner Frontend

Minimal frontend for sending receipt images to the Kotlin backend scan endpoint.

## Features
- Upload an image file from your device.
- Capture a receipt photo using the browser camera.
- Send image as `multipart/form-data` to `POST /api/receipts/scan`.

## Setup
```bash
npm install
```

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Notes
- Default backend base URL is `http://localhost:8080`.
- Override backend URL with `VITE_API_BASE_URL`.
