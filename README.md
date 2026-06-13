# Vision Platform

A full-stack low-code ML platform — **Lego for Machine Learning**.

## Project Structure

```
vision/
├── backend/       # FastAPI + Socket.IO + SQLite
└── frontend/      # Vite + React + ReactFlow + Recharts
```

## Quick Start

### Backend
```bash
cd backend
pip install fastapi uvicorn[standard] python-socketio sqlmodel pydantic-settings pandas numpy jinja2 werkzeug flatten-json python-multipart httpx aiosqlite
uvicorn app.main:socket_app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**

## Features

- **Visual canvas** — ReactFlow with 7 node types (Input, Dense, Conv2D, Flatten, Dropout, MaxPool2D, BatchNorm)
- **Live code transpilation** — Python updates as you drag nodes (debounced 400ms)
- **Interactive EDA** — Correlation heatmap + column statistics
- **Real-time training** — Socket.IO streams epoch metrics
- **Live charts** — Recharts LineChart (loss + accuracy curves)
- **Code download** — Generated TF/Keras Python scripts