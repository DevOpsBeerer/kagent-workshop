from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.spa import mount_spa


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Light Manager", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


mount_spa(app)
