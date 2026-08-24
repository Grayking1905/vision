"""Pydantic request/response schemas for integration endpoints."""

from pydantic import BaseModel, Field


# ── Hugging Face ─────────────────────────────────────────────────────────────

class HFSearchParams(BaseModel):
    """Query params for searching HF models/datasets/spaces."""
    query: str = ""
    limit: int = Field(default=20, ge=1, le=100)
    sort: str = "downloads"  # downloads | likes | trending


class HFDownloadRequest(BaseModel):
    """Download a HF model or dataset into the project folder."""
    repo_id: str  # e.g. "google/vit-base-patch16-224"
    repo_type: str = "model"  # model | dataset | space
    project_id: str | None = None


# ── GitHub ───────────────────────────────────────────────────────────────────

class GitHubRepoContentsRequest(BaseModel):
    """Request to read a specific path in a GitHub repo."""
    path: str = ""


class GitHubPushRequest(BaseModel):
    """Push generated code to a GitHub repo."""
    owner: str
    repo: str
    file_path: str  # path in the repo, e.g. "models/my_model.py"
    content: str    # file content (will be base64-encoded by the service)
    commit_message: str = "Add generated code from Vision Platform"
    branch: str = "main"


class GitHubCloneRequest(BaseModel):
    """Clone / pull a repo into the local project workspace."""
    owner: str
    repo: str
    branch: str = "main"
    project_id: str | None = None


# ── Google Colab ─────────────────────────────────────────────────────────────

class ColabLaunchRequest(BaseModel):
    """Generate a Colab notebook from code and get a launch URL."""
    code: str
    notebook_name: str = "vision_generated"
    project_id: str | None = None


class ColabExecuteRequest(BaseModel):
    """Execute code on a Colab-like runtime (Jupyter kernel gateway)."""
    code: str
    runtime_url: str | None = None  # optional custom runtime URL


# ── Local Runner ─────────────────────────────────────────────────────────────

class LocalRunRequest(BaseModel):
    """Run a Python script on the local machine."""
    code: str
    project_id: str | None = None
    timeout: int = Field(default=600, ge=10, le=3600)  # seconds


# ── Settings ─────────────────────────────────────────────────────────────────

class IntegrationSettingsUpdate(BaseModel):
    """Update integration API tokens."""
    huggingface_token: str | None = None
    github_token: str | None = None


class IntegrationSettingsResponse(BaseModel):
    """Masked view of configured tokens."""
    huggingface_configured: bool = False
    github_configured: bool = False
