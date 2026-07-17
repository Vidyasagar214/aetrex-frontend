# Aetrex Scanner Fleet Management

Vite + React app for the Aetrex Scanner Fleet Management Control Panel.

## Stack

- Vite + React
- Tailwind CSS v4
- React Router
- Chart.js (`react-chartjs-2`)
- Leaflet (`react-leaflet`)
- DataTables
- Font Awesome
- Aetrex-backend API (SQLite) for Fleet Overview, Location Explorer, Releases, and Devices

## Getting started

### 1. Backend (required for the world map)

```bash
cd ../Aetrex-backend
npm install
npm run dev
```

API listens on `http://localhost:4000` and reads `src/db/Aetrex_DB.db`.

### 2. Frontend

```bash
npm install
npm run dev
```

App: `http://localhost:5173` — Vite proxies `/api` → `http://localhost:4000`.

Optional: copy `.env.example` to `.env`. Leave `VITE_API_URL` empty for local proxy; set it to the backend origin in production.
