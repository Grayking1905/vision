# Vision Platform

A full-stack low-code ML platform — **Lego for Machine Learning**.
Vision allows users to visually build, train, and transpile machine learning models directly in the browser through a beautiful, sleek, modern interface.

## ✨ Features

- **Visual Canvas** — A ReactFlow-powered workspace with 7 node types (Input, Dense, Conv2D, Flatten, Dropout, MaxPool2D, BatchNorm). Build your neural networks visually!
- **Sleek Glassmorphism UI** — Premium, dynamic dark and light themes with translucent iOS-style glassmorphism elements and high-contrast color palettes.
- **Live Code Transpilation** — Watch the Python code update in real-time as you drag and connect nodes.
- **Interactive EDA** — Includes correlation heatmaps and comprehensive column statistics.
- **Real-time Training** — View live loss and accuracy curves streamed via Socket.IO directly to Recharts LineCharts.
- **Code Download** — Export generated TensorFlow/Keras Python scripts to run locally.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, ReactFlow, Recharts, Lucide React
- **Backend**: FastAPI, Uvicorn, Python-SocketIO, SQLModel, Pandas, Numpy
- **Database**: SQLite / aiosqlite
- **Styling**: Vanilla CSS with modern native CSS variables (Custom Properties) for seamless theme-switching.

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Activate your venv, then install dependencies:
pip install fastapi uvicorn[standard] python-socketio sqlmodel pydantic-settings pandas numpy jinja2 werkzeug flatten-json python-multipart httpx aiosqlite
# Start the server:
uvicorn app.main:socket_app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## 🎨 Recent Design Updates

- Implemented a unified Glassmorphism design system (`--glass-bg`, `--glass-border`).
- Updated the header, sidebars, and layer palettes to feature adaptive blur effects (`backdrop-filter: blur(24px)`).
- Redesigned Model Canvas layer nodes to feature a more compact, pill-like modern look with dynamic color highlights.
- Implemented an `AudioContext` synthesizer that plays a gentle 'bloop' tone when nodes are successfully connected in the canvas.