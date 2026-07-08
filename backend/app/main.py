"""
RUIDO — Platform for creative degradation of AI-generated texts.

Main entry point of the FastAPI application.
Core: Base generation, Oxidation, Witness Mode, Degradation certificate.
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import testigo, certificado


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler: creates the DB tables on startup."""
    import app.models.obra  # noqa: F401
    import app.models.certificado  # noqa: F401

    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="RUIDO",
    description=(
        "Platform for creative degradation of AI-generated texts. "
        "Generates a base text and then degrades it in a controlled way, "
        "producing a unique, unrepeatable work."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_charset_to_json_response(request, call_next):
    """Force charset=utf-8 on JSON responses (PowerShell 5.1 compatibility)."""
    response = await call_next(request)
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type and "charset" not in content_type:
        response.headers["content-type"] = f"{content_type}; charset=utf-8"
    return response


app.include_router(testigo.router, prefix="/api", tags=["Witness Mode"])
app.include_router(certificado.router, prefix="/api", tags=["Certificate"])


@app.get("/")
async def root():
    """Health check."""
    return {
        "proyecto": "RUIDO",
        "version": "0.1.0",
        "estado": "activo",
        "docs": "/docs",
    }
