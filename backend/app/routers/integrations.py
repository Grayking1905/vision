"""Integration connectors API router — HuggingFace, GitHub, Colab, Local."""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.schemas.integrations import (
    ColabLaunchRequest,
    GitHubCloneRequest,
    GitHubPushRequest,
    GitHubRepoContentsRequest,
    HFDownloadRequest,
    HFSearchParams,
    IntegrationSettingsUpdate,
    LocalRunRequest,
)
from app.services.integrations import (
    ColabService,
    GitHubService,
    HuggingFaceService,
    LocalRunnerService,
    get_integration_settings,
    update_integration_settings,
)

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ── Hugging Face ─────────────────────────────────────────────────────────────


@router.get("/huggingface/models")
async def hf_models(query: str = "", limit: int = Query(20, ge=1, le=100), sort: str = "downloads"):
    """Search Hugging Face models."""
    try:
        results = await HuggingFaceService.search_models(query, limit, sort)
        return JSONResponse(content={"success": True, "results": results})
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


@router.get("/huggingface/datasets")
async def hf_datasets(query: str = "", limit: int = Query(20, ge=1, le=100), sort: str = "downloads"):
    """Search Hugging Face datasets."""
    try:
        results = await HuggingFaceService.search_datasets(query, limit, sort)
        return JSONResponse(content={"success": True, "results": results})
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


@router.get("/huggingface/spaces")
async def hf_spaces(query: str = "", limit: int = Query(20, ge=1, le=100), sort: str = "likes"):
    """Search Hugging Face Spaces."""
    try:
        results = await HuggingFaceService.search_spaces(query, limit, sort)
        return JSONResponse(content={"success": True, "results": results})
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


@router.post("/huggingface/download")
async def hf_download(req: HFDownloadRequest):
    """Download a HF model/dataset to local storage."""
    try:
        result = await HuggingFaceService.download_repo(req.repo_id, req.repo_type, req.project_id)
        code = 200 if result["success"] else 400
        return JSONResponse(status_code=code, content=result)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── GitHub ───────────────────────────────────────────────────────────────────


@router.get("/github/repos")
async def gh_repos(per_page: int = Query(30, ge=1, le=100), page: int = Query(1, ge=1)):
    """List authenticated user's GitHub repos."""
    try:
        results = await GitHubService.list_repos(per_page, page)
        return JSONResponse(content={"success": True, "results": results})
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


@router.get("/github/repo/{owner}/{repo}")
async def gh_repo_contents(owner: str, repo: str, path: str = ""):
    """Read contents of a GitHub repo path."""
    try:
        results = await GitHubService.get_repo_contents(owner, repo, path)
        return JSONResponse(content={"success": True, "results": results})
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


@router.post("/github/repo/{owner}/{repo}/push")
async def gh_push(owner: str, repo: str, req: GitHubPushRequest):
    """Push a file to a GitHub repo."""
    try:
        result = await GitHubService.push_file(
            owner=req.owner, repo=req.repo,
            file_path=req.file_path, content=req.content,
            commit_message=req.commit_message, branch=req.branch,
        )
        return JSONResponse(content=result)
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


@router.post("/github/repo/{owner}/{repo}/pull")
async def gh_pull(owner: str, repo: str, req: GitHubCloneRequest):
    """Clone/pull a GitHub repo to local workspace."""
    try:
        result = await GitHubService.clone_repo(
            owner=req.owner, repo=req.repo,
            branch=req.branch, project_id=req.project_id,
        )
        return JSONResponse(content=result)
    except Exception as exc:
        return JSONResponse(status_code=502, content={"success": False, "error": str(exc)})


# ── Google Colab ─────────────────────────────────────────────────────────────


@router.post("/colab/launch")
async def colab_launch(req: ColabLaunchRequest):
    """Generate a Colab notebook from code and get a launch URL."""
    try:
        result = await ColabService.launch(req.code, req.notebook_name, req.project_id)
        return JSONResponse(content=result)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


@router.get("/colab/status")
async def colab_status():
    """Check Colab runtime status."""
    return JSONResponse(content={"success": True, **ColabService.get_status()})


@router.get("/colab/download")
async def colab_download(notebook_path: str = Query(...)):
    """Download a generated notebook file."""
    from pathlib import Path
    nb = Path(notebook_path)
    if not nb.exists():
        return JSONResponse(status_code=404, content={"success": False, "error": "Notebook not found"})
    return StreamingResponse(
        open(nb, "rb"),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={nb.name}"},
    )


# ── Local Runner ─────────────────────────────────────────────────────────────


@router.post("/local/run")
async def local_run(req: LocalRunRequest):
    """Execute Python code on the local machine with real-time streaming."""
    try:
        result = await LocalRunnerService.run_code(req.code, req.project_id, req.timeout)
        return JSONResponse(content=result)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


@router.get("/local/status")
async def local_status():
    """Get local machine resource info."""
    return JSONResponse(content={"success": True, **LocalRunnerService.get_status()})


# ── Settings ─────────────────────────────────────────────────────────────────


@router.get("/settings")
async def read_settings():
    """Get integration settings (masked)."""
    return JSONResponse(content={"success": True, **get_integration_settings()})


@router.put("/settings")
async def write_settings(req: IntegrationSettingsUpdate):
    """Update integration API tokens."""
    result = update_integration_settings(req.huggingface_token, req.github_token)
    return JSONResponse(content={"success": True, **result})
