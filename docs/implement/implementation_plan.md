# Feature 01 — Integration Connectors

Build four external integration connectors into the Vision platform: **Hugging Face**, **GitHub**, **Google Colab**, and **Local Machine (with Colab resources)**. This adds a new "Integrations" section to the workspace sidebar and a dedicated page with tabbed panels for each connector.

## User Review Required

> [!IMPORTANT]
> **API Keys & Authentication** — Hugging Face, GitHub, and Google Colab all require user-supplied API tokens. The plan stores these in the backend `.env` and exposes a Settings panel in the UI. No keys are hardcoded. Please confirm this approach is acceptable.

> [!WARNING]
> **Google Colab Runtime** — Google does not provide an official REST API for Colab. The plan uses the **Google Colab Enterprise API** (Vertex AI Notebooks) for programmatic notebook execution. An alternative is to generate a `.ipynb` file and open it via a Colab link. Please confirm which approach you prefer:
> - **Option A**: Full Colab Enterprise API integration (requires GCP project + service account)
> - **Option B**: Generate `.ipynb` notebook and provide a one-click "Open in Colab" link + local Jupyter-based execution with optional Colab-like resource bridging

> [!IMPORTANT]
> **"Run on Local Machine with Colab resources"** — This concept (local execution using remote GPU/RAM) is architecturally a remote compute bridge. The plan implements this as a hybrid: generate code locally, but dispatch heavy compute to a Colab/Jupyter runtime via the kernel gateway API, streaming output back in real-time via Socket.IO. Please confirm this is the intended behavior.

## Open Questions

1. **Hugging Face Scope** — Should "open-source projects" mean Hugging Face Spaces (app demos), or just model/dataset repos? The plan assumes **Spaces**.
2. **GitHub Write Scope** — Should we support creating new repos, or only push commits to existing repos? The plan starts with **read + push to existing repos**.
3. **Google Colab T4 GPU** — Free T4 access is subject to Colab's availability quotas and cannot be guaranteed programmatically. Should we surface a warning to the user, or silently retry? The plan shows a **status indicator**.

---

## Proposed Changes

### Phase 1 — Backend: Integration Services & Router

---

#### [NEW] [integrations.py](file:///c:/Users/shriv/Desktop/vision/backend/app/routers/integrations.py)

New FastAPI router under `/api/v1/integrations/` with sub-routes:

| Route | Method | Description |
|-------|--------|-------------|
| `/integrations/huggingface/models` | GET | Search/list HF models (uses `huggingface_hub` Python SDK) |
| `/integrations/huggingface/datasets` | GET | Search/list HF datasets |
| `/integrations/huggingface/spaces` | GET | Search/list HF Spaces |
| `/integrations/huggingface/download` | POST | Download a model/dataset to the project's data folder |
| `/integrations/github/repos` | GET | List user's repos (uses `httpx` to call GitHub API) |
| `/integrations/github/repo/{owner}/{repo}` | GET | Read repo contents (tree, files) |
| `/integrations/github/repo/{owner}/{repo}/push` | POST | Commit & push generated code to a repo |
| `/integrations/github/repo/{owner}/{repo}/pull` | POST | Pull/clone a repo into the project workspace |
| `/integrations/colab/launch` | POST | Create a Colab notebook from generated code and get a launch URL |
| `/integrations/colab/status` | GET | Check runtime status (GPU type, RAM) |
| `/integrations/colab/execute` | POST | Execute code cells; streams output via Socket.IO |
| `/integrations/colab/download` | GET | Download output files from the Colab runtime |
| `/integrations/local/run` | POST | Run generated Python code on the local machine; streams stdout/stderr via Socket.IO |
| `/integrations/local/status` | GET | Check local machine resources (GPU, RAM, disk) |
| `/integrations/settings` | GET/PUT | Read/update integration API tokens |

#### [NEW] [integrations.py](file:///c:/Users/shriv/Desktop/vision/backend/app/services/integrations.py)

Service layer with classes:
- `HuggingFaceService` — wraps `huggingface_hub` SDK (`HfApi`)
- `GitHubService` — wraps GitHub REST API v3 via `httpx`
- `ColabService` — generates `.ipynb` notebooks from Jinja2 templates and produces Colab URLs
- `LocalRunnerService` — executes Python scripts via `subprocess.Popen`, streaming output to Socket.IO

#### [NEW] [integrations.py](file:///c:/Users/shriv/Desktop/vision/backend/app/schemas/integrations.py)

Pydantic request/response schemas for all integration endpoints.

#### [MODIFY] [config.py](file:///c:/Users/shriv/Desktop/vision/backend/app/config.py)

Add new settings fields:
```python
huggingface_token: str = ""
github_token: str = ""
google_colab_project_id: str = ""
```

#### [MODIFY] [main.py](file:///c:/Users/shriv/Desktop/vision/backend/app/main.py)

Register the new `integrations` router:
```python
from app.routers import integrations
app.include_router(integrations.router, prefix=BASE)
```

#### [MODIFY] [.env](file:///c:/Users/shriv/Desktop/vision/backend/.env)

Add placeholder keys:
```
HUGGINGFACE_TOKEN=
GITHUB_TOKEN=
```

---

### Phase 2 — Frontend: Integrations Page & Components

---

#### [NEW] [IntegrationsPage.jsx](file:///c:/Users/shriv/Desktop/vision/frontend/src/pages/IntegrationsPage.jsx)

New page with 4 tabbed panels:
1. **Hugging Face** — Search bar, model/dataset/space cards with download buttons
2. **GitHub** — Repo browser, file tree viewer, push/pull actions
3. **Google Colab** — Launch notebook button, runtime status card, live terminal output panel
4. **Local Machine** — Run button, resource monitor (GPU/RAM/disk), live terminal output panel

Each tab uses the existing glassmorphism design system (`--glass-bg`, `--glass-border`, `backdrop-filter`).

#### [NEW] [IntegrationsPage.css](file:///c:/Users/shriv/Desktop/vision/frontend/src/pages/IntegrationsPage.css)

Styles for the integrations page: tab navigation, search panels, card grids, terminal output, status indicators.

#### [NEW] [integrations/](file:///c:/Users/shriv/Desktop/vision/frontend/src/components/integrations/)

Component directory:
- `HuggingFacePanel.jsx` — Model/dataset search & download UI
- `GitHubPanel.jsx` — Repo browser & push/pull UI
- `ColabPanel.jsx` — Notebook launcher & live output terminal
- `LocalRunPanel.jsx` — Local execution with resource monitoring
- `IntegrationSettings.jsx` — API token configuration modal
- `TerminalOutput.jsx` — Shared real-time output component (Socket.IO listener)

#### [MODIFY] [urls.js](file:///c:/Users/shriv/Desktop/vision/frontend/src/constants/urls.js)

Add all `/integrations/...` URL builders.

#### [MODIFY] [api.js](file:///c:/Users/shriv/Desktop/vision/frontend/src/services/api.js)

Add API functions for all integration endpoints.

#### [MODIFY] [appStore.js](file:///c:/Users/shriv/Desktop/vision/frontend/src/stores/appStore.js)

Add integration state: `integrationTokens`, `hfSearchResults`, `githubRepos`, `colabStatus`, `localRunStatus`, `terminalOutput`.

#### [MODIFY] [App.jsx](file:///c:/Users/shriv/Desktop/vision/frontend/src/App.jsx)

Add lazy-loaded route:
```jsx
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
// inside <Route path="/workspace/:projectId">
<Route path="integrations" element={<IntegrationsPage />} />
```

#### [MODIFY] [WorkspaceLayout.jsx](file:///c:/Users/shriv/Desktop/vision/frontend/src/components/WorkspaceLayout.jsx)

Add new sidebar nav item:
```js
{ to: 'integrations', label: 'Integrations', icon: Plug, description: 'HF, GitHub, Colab & Local' }
```

---

### Phase 3 — New Backend Dependencies

#### [MODIFY] [pyproject.toml](file:///c:/Users/shriv/Desktop/vision/backend/pyproject.toml)

Add:
```toml
"huggingface_hub>=0.23.0",
"PyGithub>=2.3.0",
```

---

## Verification Plan

### Automated Tests
```bash
# Backend: run the server and test endpoints
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:socket_app --reload --port 8000

# Hit health check
curl http://localhost:8000/health

# Test integration settings (no auth required)
curl http://localhost:8000/api/v1/integrations/settings

# Test HF search (requires token)
curl "http://localhost:8000/api/v1/integrations/huggingface/models?query=resnet&limit=5"
```

### Manual Verification
- Navigate to `http://localhost:5173`, open a project, click "Integrations" in the sidebar
- Verify all 4 tabs render with the glassmorphism design
- Enter a HF token in settings, search for models, verify cards appear
- Test GitHub repo listing (with token)
- Test "Open in Colab" link generation
- Test local code execution and verify terminal output streams in real-time
