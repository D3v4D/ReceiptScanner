# Receipt Scanner Frontend

Simple frontend for managing receipts and users against the API running on `http://localhost:5432`.

## Features
- List, filter, create, update, and delete receipts.
- Upload base64 receipt image to scan endpoint.
- List, create, update, and delete users.

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
- Update the API base URL in `src/services/api.ts` if needed.
- The scan payload uses `{ "userId": string, "base64Image": string }`.
