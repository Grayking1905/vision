# Vision Platform — Full-Stack Implementation Plan

## Overview

Vision is a comprehensive low-code ML platform — "Lego for Machine Learning." It reverse-engineers TensorMap's architecture into a **visually stunning, feature-complete platform** with:

- **WYSIWYG neural network canvas** powered by ReactFlow
- **Live Python code transpilation** side panel (reverse-engineers the visual graph into TensorFlow/Keras code in real-time)
- **CSV/Image dataset management** with automated EDA (correlation matrix, stats)
- **FastAPI backend + Socket.IO** for WebSocket-streamed live training metrics (loss/accuracy curves)
- **Project management** multi-workspace system
- **Code download** for local deployment

> [!IMPORTANT]
> The Vision frontend will be a **Vite + React** app with **vanilla CSS** (dark-mode glassmorphism design system). The backend mirrors TensorMap's FastAPI + SQLModel + PostgreSQL + Socket.IO architecture but with enhanced features.

---

## Architecture Breakdown (Reverse-Engineered from TensorMap)

### Backend (FastAPI)

| Layer | TensorMap | Vision Enhancement |
|-------|-----------|-------------------|
| Web framework | FastAPI + Uvicorn | Same |
| Real-time | python-socketio (ASGI) | Same + WebSocket training metrics |
| ORM | SQLModel + Alembic | Same |
| DB | PostgreSQL | Same |
| Code Gen | Jinja2 templates | Live transpilation (no templates needed) |
| ML Engine | TensorFlow/Keras | Same |
| File Storage | Local disk | Same |

### Frontend (React + Vite)

| Feature | TensorMap | Vision Enhancement |
|---------|-----------|-------------------|
| Canvas | ReactFlow + 4 node types | ReactFlow + 7 node types + live code panel |
| Design | shadcn/ui + Tailwind | Premium dark glassmorphism CSS |
| State | Recoil | Zustand |
| Charts | None | Recharts (live training curves) |
| EDA | Basic metrics | Interactive correlation heatmap |

---

## File Structure

### Backend: `vision/backend/`
```
app/
├── main.py                  # FastAPI + SocketIO entry point
├── config.py                # Pydantic Settings
├── database.py              # SQLModel engine + session
├── socketio_instance.py     # Shared sio server
├── middleware.py            # CORS + logging
├── exceptions.py            # Custom handlers
├── models/
│   ├── data.py              # DataFile, DataProcess, ImageProperties
│   ├── ml.py                # ModelBasic, ModelConfigs
│   └── project.py           # Project
├── schemas/
│   ├── deep_learning.py     # Pydantic request/response models
│   ├── data_upload.py
│   └── project.py
├── routers/
│   ├── project.py           # CRUD projects
│   ├── data_upload.py       # File upload/list/delete
│   ├── data_process.py      # EDA, correlation matrix, preprocessing
│   └── deep_learning.py     # Save/validate/run model, get code
├── services/
│   ├── project.py
│   ├── data_upload.py
│   ├── data_process.py      # Pandas EDA engine
│   ├── code_generation.py   # Live Python code transpiler
│   ├── model_generation.py  # ReactFlow → Keras JSON
│   ├── model_run.py         # Training loop + Socket.IO callback
│   └── deep_learning.py     # Orchestration service
└── shared/
    ├── constants.py
    ├── enums.py
    ├── errors.py
    └── logging_config.py
```

### Frontend: `vision/frontend/`
```
src/
├── App.jsx                  # Router (Projects, Workspace)
├── index.css                # Global dark glassmorphism design system
├── components/
│   ├── AppTopBar.jsx        # Glassmorphic nav bar
│   ├── Canvas/
│   │   ├── Canvas.jsx       # Main ReactFlow canvas
│   │   ├── Sidebar.jsx      # Draggable layer palette
│   │   ├── CodePanel.jsx    # Live Python transpilation panel
│   │   ├── NodePropertiesPanel.jsx
│   │   ├── ModelSummaryPanel.jsx
│   │   └── nodes/
│   │       ├── InputNode.jsx
│   │       ├── DenseNode.jsx
│   │       ├── ConvNode.jsx
│   │       ├── FlattenNode.jsx
│   │       ├── DropoutNode.jsx   # NEW
│   │       ├── MaxPoolNode.jsx   # NEW
│   │       └── BatchNormNode.jsx # NEW
│   └── shared/
│       ├── FeedbackDialog.jsx
│       └── LoadingSpinner.jsx
├── containers/
│   ├── ProjectsPage/        # Landing — create/list projects
│   ├── DataUpload/          # File upload + dataset cards
│   ├── DataProcess/         # EDA, correlation heatmap, preprocessing
│   ├── DeepLearning/        # Canvas + code panel
│   └── Training/            # Config + live loss/accuracy charts
├── services/                # API + WebSocket client
├── stores/                  # Zustand state
└── constants/               # Strings, URLs
```

---

## Proposed Changes

### Backend

#### [NEW] `vision/backend/` (entire FastAPI service)
Full FastAPI application mirroring TensorMap but with:
- **Live code transpilation endpoint**: `POST /api/v1/model/transpile` — accepts partial graph JSON, returns Python code string (no saving)
- **Enhanced correlation matrix**: structured `{columns, matrix}` response
- **Alembic migrations** auto-run on startup
- **Socket.IO** namespace `/dl` for training progress events with structured `{epoch, loss, accuracy, val_loss, val_accuracy, step}` payloads

#### [NEW] `vision/backend/pyproject.toml`
Dependencies: fastapi, uvicorn, python-socketio, sqlmodel, alembic, tensorflow, pandas, numpy, jinja2, pydantic-settings, werkzeug, flatten-json

---

### Frontend

#### [NEW] `vision/frontend/` (entire Vite + React app)
Built with Vite, React 18, ReactFlow, Recharts, Zustand.

#### [NEW] `src/index.css`
Dark glassmorphism design system:
- CSS custom properties: `--vision-bg`, `--glass-bg`, `--accent-violet`, `--accent-cyan`, `--text-primary`
- Glassmorphism card utilities: `backdrop-filter: blur(16px)`, `rgba(255,255,255,0.05)` backgrounds
- Gradient accents: violet → cyan
- Inter font from Google Fonts
- Smooth transitions on all interactive elements

#### [NEW] `src/components/Canvas/CodePanel.jsx`
Real-time Python code transpiler panel:
- Calls `/api/v1/model/transpile` on every graph change (debounced 300ms)
- Syntax highlighted code display (using `highlight.js` or `prism`)
- Copy-to-clipboard + Download buttons
- Animated typing indicator while regenerating

#### [NEW] `src/components/Canvas/nodes/DropoutNode.jsx`
New Dropout layer node with `rate` parameter (0–1).

#### [NEW] `src/components/Canvas/nodes/MaxPoolNode.jsx`
New MaxPooling2D layer node with `pool_size`, `strides` parameters.

#### [NEW] `src/components/Canvas/nodes/BatchNormNode.jsx`
New Batch Normalization layer node.

#### [MODIFY] `src/containers/Training/Training.jsx`
Replace text output with **live Recharts line graphs**:
- Real-time loss/accuracy curves updated on each Socket.IO epoch event
- Dual-axis chart (loss left, accuracy right)
- Animated chart updates with smooth transitions

#### [NEW] `src/containers/DataProcess/DataProcess.jsx`
Interactive EDA page:
- **Correlation heatmap** built from canvas (color-coded cells, -1 to +1 scale)
- **Column statistics table** with data types, null counts, min/max/mean
- **Preprocessing controls**: One-Hot Encoding, Categorical-to-Numerical, Drop Column, Log Transform
- **Target variable selector** with click-to-select on heatmap cells

---

## Key Technical Decisions

### Live Code Transpilation
The most distinctive Vision feature. On every ReactFlow graph change:
1. Frontend debounces 300ms, sends graph JSON to `POST /api/v1/model/transpile`
2. Backend calls `model_generation()` → `model.to_json()`, then feeds into Jinja2 template to produce Python
3. Returns raw Python string
4. Frontend renders in syntax-highlighted code panel

This is purely ephemeral — no DB writes, just in-memory Keras construction.

### Socket.IO Training Events
TensorMap emits text strings. Vision emits structured JSON:
```json
{"event": "epoch_end", "epoch": 5, "total_epochs": 10, "loss": 0.234, "accuracy": 0.91, "val_loss": 0.31, "val_accuracy": 0.87}
```
Frontend uses this to update Recharts in real-time.

### Design System
Dark glassmorphism with violet/cyan gradient. Each page has a hero gradient header. Cards use `backdrop-filter: blur`. Interactive elements have `0.2s ease` transitions. Micro-animations on hover.

---

## Verification Plan

### Automated
- `uvicorn app.main:socket_app --reload` — backend health check
- `npm run dev` — frontend dev server

### Manual
1. Create project → navigate workspace
2. Upload CSV → view correlation heatmap
3. Drag Input + Dense + Dense nodes → verify live Python code updates in panel
4. Save model → go to Training → configure → hit Train
5. Watch live loss/accuracy charts animate epoch by epoch
6. Download generated Python script
