from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.db import init_db
from app.routers import bulbs, state, users
from app.seed import seed_participants
from app.spa import mount_spa


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_participants()
    yield


app = FastAPI(title="Light Manager", version="0.1.0", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def _validation_error_to_400(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": exc.errors()})


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(bulbs.router)
app.include_router(users.router)
app.include_router(state.router)

mount_spa(app)
