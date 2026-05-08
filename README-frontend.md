Frontend (React + Vite)

1. Install dependencies:

```bash
cd AI-CLASSTEST2
npm install
```

2. Run the dev server (ports default to 5173):

```bash
npm run dev
```

Notes:
- The frontend fetches data from the Python dashboard at `/api/logs`. Run `python dashboard.py` to serve the logs on `http://127.0.0.1:8001`.
- If running the frontend on a different host/port, enable CORS in `dashboard.py` or run the frontend with a proxy.
