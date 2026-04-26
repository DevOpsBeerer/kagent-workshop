import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_spa(app: FastAPI) -> None:
    """Mount the built React SPA when LIGHT_MANAGER_STATIC_DIR points to a build dir.

    No-op in dev; only kicks in inside the Docker image where Vite assets are baked at /app/static.
    """
    static_dir = os.environ.get("LIGHT_MANAGER_STATIC_DIR")
    if not static_dir:
        return
    root = Path(static_dir)
    if not root.is_dir():
        return

    assets = root / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets)), name="assets")

    index = root / "index.html"
    if not index.is_file():
        return

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> FileResponse:
        # Never swallow unknown /api/* routes — the SPA must not mask 404s on the JSON API.
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = root / full_path if full_path else index
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(index)
