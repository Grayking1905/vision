"""Integration service layer — HuggingFace, GitHub, Colab, Local Runner."""

from __future__ import annotations

import asyncio
import base64
import json
import os
import platform
import shutil
import subprocess
import textwrap
from pathlib import Path
from typing import Any

import httpx

from app.config import get_settings
from app.socketio_instance import sio

settings = get_settings()

INTEGRATIONS_NS = "/integrations"


# ── Socket.IO namespace for integration events ──────────────────────────────

@sio.on("connect", namespace=INTEGRATIONS_NS)
async def _on_integration_connect(sid, environ):
    pass


@sio.on("disconnect", namespace=INTEGRATIONS_NS)
async def _on_integration_disconnect(sid):
    pass


# ═══════════════════════════════════════════════════════════════════════════
# Hugging Face Service
# ═══════════════════════════════════════════════════════════════════════════

class HuggingFaceService:
    """Search models, datasets, and spaces on Hugging Face Hub."""

    HF_API = "https://huggingface.co/api"

    @staticmethod
    def _headers() -> dict[str, str]:
        token = settings.huggingface_token
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}

    @classmethod
    async def search_models(cls, query: str = "", limit: int = 20, sort: str = "downloads") -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            params: dict[str, Any] = {"limit": limit, "sort": sort}
            if query:
                params["search"] = query
            resp = await client.get(f"{cls.HF_API}/models", params=params, headers=cls._headers())
            resp.raise_for_status()
            models = resp.json()
            return [
                {
                    "id": m.get("modelId") or m.get("id", ""),
                    "author": m.get("author", ""),
                    "downloads": m.get("downloads", 0),
                    "likes": m.get("likes", 0),
                    "tags": m.get("tags", [])[:6],
                    "pipeline_tag": m.get("pipeline_tag", ""),
                    "last_modified": m.get("lastModified", ""),
                }
                for m in models
            ]

    @classmethod
    async def search_datasets(cls, query: str = "", limit: int = 20, sort: str = "downloads") -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            params: dict[str, Any] = {"limit": limit, "sort": sort}
            if query:
                params["search"] = query
            resp = await client.get(f"{cls.HF_API}/datasets", params=params, headers=cls._headers())
            resp.raise_for_status()
            datasets = resp.json()
            return [
                {
                    "id": d.get("id", ""),
                    "author": d.get("author", ""),
                    "downloads": d.get("downloads", 0),
                    "likes": d.get("likes", 0),
                    "tags": d.get("tags", [])[:6],
                    "last_modified": d.get("lastModified", ""),
                }
                for d in datasets
            ]

    @classmethod
    async def search_spaces(cls, query: str = "", limit: int = 20, sort: str = "likes") -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            params: dict[str, Any] = {"limit": limit, "sort": sort}
            if query:
                params["search"] = query
            resp = await client.get(f"{cls.HF_API}/spaces", params=params, headers=cls._headers())
            resp.raise_for_status()
            spaces = resp.json()
            return [
                {
                    "id": s.get("id", ""),
                    "author": s.get("author", ""),
                    "likes": s.get("likes", 0),
                    "sdk": s.get("sdk", ""),
                    "last_modified": s.get("lastModified", ""),
                }
                for s in spaces
            ]

    @classmethod
    async def download_repo(cls, repo_id: str, repo_type: str = "model", project_id: str | None = None) -> dict:
        """Download a HF repo using huggingface_hub (runs in thread to avoid blocking)."""
        try:
            from huggingface_hub import snapshot_download
        except ImportError:
            return {"success": False, "error": "huggingface_hub is not installed. Run: pip install huggingface_hub"}

        dest = Path(settings.upload_folder)
        if project_id:
            dest = dest / project_id
        dest = dest / "hf_downloads" / repo_id.replace("/", "__")
        dest.mkdir(parents=True, exist_ok=True)

        token = settings.huggingface_token or None

        def _download():
            return snapshot_download(
                repo_id=repo_id,
                repo_type=repo_type,
                local_dir=str(dest),
                token=token,
            )

        loop = asyncio.get_running_loop()
        local_path = await loop.run_in_executor(None, _download)
        return {"success": True, "repo_id": repo_id, "local_path": str(local_path)}


# ═══════════════════════════════════════════════════════════════════════════
# GitHub Service
# ═══════════════════════════════════════════════════════════════════════════

class GitHubService:
    """Interact with GitHub repos via REST API v3."""

    GH_API = "https://api.github.com"

    @staticmethod
    def _headers() -> dict[str, str]:
        token = settings.github_token
        h: dict[str, str] = {"Accept": "application/vnd.github+json"}
        if token:
            h["Authorization"] = f"Bearer {token}"
        return h

    @classmethod
    async def list_repos(cls, per_page: int = 30, page: int = 1) -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{cls.GH_API}/user/repos",
                params={"per_page": per_page, "page": page, "sort": "updated"},
                headers=cls._headers(),
            )
            resp.raise_for_status()
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "full_name": r["full_name"],
                    "description": r.get("description", ""),
                    "language": r.get("language", ""),
                    "stars": r.get("stargazers_count", 0),
                    "updated_at": r.get("updated_at", ""),
                    "html_url": r.get("html_url", ""),
                    "private": r.get("private", False),
                }
                for r in resp.json()
            ]

    @classmethod
    async def get_repo_contents(cls, owner: str, repo: str, path: str = "") -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            url = f"{cls.GH_API}/repos/{owner}/{repo}/contents/{path}"
            resp = await client.get(url, headers=cls._headers())
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict):
                data = [data]
            return [
                {
                    "name": item["name"],
                    "path": item["path"],
                    "type": item["type"],
                    "size": item.get("size", 0),
                    "download_url": item.get("download_url"),
                }
                for item in data
            ]

    @classmethod
    async def push_file(
        cls,
        owner: str,
        repo: str,
        file_path: str,
        content: str,
        commit_message: str = "Add generated code from Vision",
        branch: str = "main",
    ) -> dict:
        encoded = base64.b64encode(content.encode()).decode()
        async with httpx.AsyncClient(timeout=30) as client:
            url = f"{cls.GH_API}/repos/{owner}/{repo}/contents/{file_path}"
            # Check if file exists (to get sha for update)
            sha = None
            try:
                existing = await client.get(url, params={"ref": branch}, headers=cls._headers())
                if existing.status_code == 200:
                    sha = existing.json().get("sha")
            except Exception:
                pass

            payload: dict[str, Any] = {
                "message": commit_message,
                "content": encoded,
                "branch": branch,
            }
            if sha:
                payload["sha"] = sha

            resp = await client.put(url, json=payload, headers=cls._headers())
            resp.raise_for_status()
            return {"success": True, "path": file_path, "sha": resp.json().get("content", {}).get("sha", "")}

    @classmethod
    async def clone_repo(cls, owner: str, repo: str, branch: str = "main", project_id: str | None = None) -> dict:
        dest = Path(settings.upload_folder)
        if project_id:
            dest = dest / project_id
        dest = dest / "github_repos" / repo
        dest.mkdir(parents=True, exist_ok=True)

        clone_url = f"https://github.com/{owner}/{repo}.git"
        token = settings.github_token
        if token:
            clone_url = f"https://{token}@github.com/{owner}/{repo}.git"

        loop = asyncio.get_running_loop()

        def _clone():
            if (dest / ".git").exists():
                subprocess.run(["git", "-C", str(dest), "pull", "origin", branch], check=True, capture_output=True)
            else:
                subprocess.run(["git", "clone", "-b", branch, clone_url, str(dest)], check=True, capture_output=True)

        await loop.run_in_executor(None, _clone)
        return {"success": True, "owner": owner, "repo": repo, "local_path": str(dest)}


# ═══════════════════════════════════════════════════════════════════════════
# Google Colab Service
# ═══════════════════════════════════════════════════════════════════════════

class ColabService:
    """Generate .ipynb notebooks and provide 'Open in Colab' links."""

    @staticmethod
    def generate_notebook(code: str, notebook_name: str = "vision_generated") -> dict:
        """Create a Jupyter notebook JSON from code string."""
        cells = []
        # Split code into logical cells (separated by double newlines or by markers)
        code_blocks = [block.strip() for block in code.split("\n\n") if block.strip()]
        if not code_blocks:
            code_blocks = [code]

        # Add a header cell
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Vision Platform — Generated Notebook\n",
                "Auto-generated by [Vision](http://localhost:5173).\n",
            ],
        })

        # Add a pip install cell
        cells.append({
            "cell_type": "code",
            "metadata": {},
            "source": ["# Install dependencies (edit as needed)\n", "!pip install torch torchvision -q\n"],
            "execution_count": None,
            "outputs": [],
        })

        # Add code cells
        for block in code_blocks:
            cells.append({
                "cell_type": "code",
                "metadata": {},
                "source": [line + "\n" for line in block.split("\n")],
                "execution_count": None,
                "outputs": [],
            })

        notebook = {
            "nbformat": 4,
            "nbformat_minor": 5,
            "metadata": {
                "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                "language_info": {"name": "python", "version": "3.10.0"},
                "colab": {"name": f"{notebook_name}.ipynb", "provenance": []},
                "accelerator": "GPU",
            },
            "cells": cells,
        }
        return notebook

    @classmethod
    async def launch(cls, code: str, notebook_name: str = "vision_generated", project_id: str | None = None) -> dict:
        notebook = cls.generate_notebook(code, notebook_name)
        # Save notebook locally
        dest = Path(settings.upload_folder)
        if project_id:
            dest = dest / project_id
        dest = dest / "notebooks"
        dest.mkdir(parents=True, exist_ok=True)
        nb_path = dest / f"{notebook_name}.ipynb"
        nb_path.write_text(json.dumps(notebook, indent=2))

        return {
            "success": True,
            "notebook_path": str(nb_path),
            "notebook_name": f"{notebook_name}.ipynb",
            "colab_upload_url": "https://colab.research.google.com/#create=true",
            "tip": "Download the notebook and upload it to Google Colab, or use 'File > Upload notebook' in Colab.",
        }

    @staticmethod
    def get_status() -> dict:
        return {
            "runtime": "not_connected",
            "gpu": "N/A (connect via Colab)",
            "tip": "Generate a notebook and open it in Google Colab to access GPU resources.",
        }


# ═══════════════════════════════════════════════════════════════════════════
# Local Runner Service
# ═══════════════════════════════════════════════════════════════════════════

class LocalRunnerService:
    """Execute Python scripts locally with output streaming via Socket.IO."""

    @classmethod
    async def run_code(cls, code: str, project_id: str | None = None, timeout: int = 600) -> dict:
        """Run code in a subprocess, streaming stdout/stderr to Socket.IO."""
        dest = Path(settings.upload_folder)
        if project_id:
            dest = dest / project_id
        dest = dest / "local_runs"
        dest.mkdir(parents=True, exist_ok=True)

        script_path = dest / "vision_run.py"
        script_path.write_text(code)

        loop = asyncio.get_running_loop()

        async def _stream():
            proc = await asyncio.create_subprocess_exec(
                "python", str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(dest),
            )

            async def _read_stream(stream, stream_type):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    text = line.decode(errors="replace")
                    await sio.emit(
                        "terminal_output",
                        {"type": stream_type, "data": text},
                        namespace=INTEGRATIONS_NS,
                    )

            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        _read_stream(proc.stdout, "stdout"),
                        _read_stream(proc.stderr, "stderr"),
                    ),
                    timeout=timeout,
                )
                returncode = await proc.wait()
            except asyncio.TimeoutError:
                proc.kill()
                await sio.emit(
                    "terminal_output",
                    {"type": "stderr", "data": f"\n[Vision] Process killed — exceeded {timeout}s timeout.\n"},
                    namespace=INTEGRATIONS_NS,
                )
                returncode = -1

            await sio.emit(
                "run_complete",
                {"returncode": returncode},
                namespace=INTEGRATIONS_NS,
            )
            return returncode

        asyncio.ensure_future(_stream())
        return {"success": True, "message": "Execution started. Output is streaming in real-time."}

    @staticmethod
    def get_status() -> dict:
        """Return local machine resource info."""
        import shutil as _shutil

        info: dict[str, Any] = {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "cpu_count": os.cpu_count(),
        }

        # Disk usage for data folder
        try:
            total, used, free = _shutil.disk_usage(settings.upload_folder)
            info["disk"] = {
                "total_gb": round(total / (1024 ** 3), 1),
                "used_gb": round(used / (1024 ** 3), 1),
                "free_gb": round(free / (1024 ** 3), 1),
            }
        except Exception:
            info["disk"] = "unavailable"

        # GPU check (best-effort)
        try:
            import torch
            if torch.cuda.is_available():
                info["gpu"] = {
                    "name": torch.cuda.get_device_name(0),
                    "count": torch.cuda.device_count(),
                    "memory_gb": round(torch.cuda.get_device_properties(0).total_mem / (1024 ** 3), 1),
                }
            else:
                info["gpu"] = "No CUDA GPU detected"
        except ImportError:
            info["gpu"] = "PyTorch not installed — GPU status unknown"

        return info


# ═══════════════════════════════════════════════════════════════════════════
# Settings helpers
# ═══════════════════════════════════════════════════════════════════════════

def get_integration_settings() -> dict:
    return {
        "huggingface_configured": bool(settings.huggingface_token),
        "github_configured": bool(settings.github_token),
    }


def update_integration_settings(hf_token: str | None = None, gh_token: str | None = None) -> dict:
    """Persist tokens into the .env file and update runtime settings."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        env_path.touch()

    content = env_path.read_text()

    if hf_token is not None:
        settings.huggingface_token = hf_token
        if "HUGGINGFACE_TOKEN=" in content:
            lines = content.splitlines()
            lines = [f"HUGGINGFACE_TOKEN={hf_token}" if l.startswith("HUGGINGFACE_TOKEN=") else l for l in lines]
            content = "\n".join(lines) + "\n"
        else:
            content += f"HUGGINGFACE_TOKEN={hf_token}\n"

    if gh_token is not None:
        settings.github_token = gh_token
        if "GITHUB_TOKEN=" in content:
            lines = content.splitlines()
            lines = [f"GITHUB_TOKEN={gh_token}" if l.startswith("GITHUB_TOKEN=") else l for l in lines]
            content = "\n".join(lines) + "\n"
        else:
            content += f"GITHUB_TOKEN={gh_token}\n"

    env_path.write_text(content)
    return get_integration_settings()
