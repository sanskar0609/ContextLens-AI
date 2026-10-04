"""
app/main.py — ContextLens AI FastAPI Application Entry Point

This is the root of the FastAPI backend. It:
 - Creates the FastAPI application instance
 - Configures CORS so the Chrome extension can reach the API
 - Registers all route blueprints (routers)
 - Provides a health-check endpoint to verify the server is running

Run with:
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"""

import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import health, page, chat

# ── Load environment variables from .env ──────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── FastAPI application ───────────────────────────────────────────────────────
app = FastAPI(
    title="ContextLens AI API",
    description=(
        "Backend API for the ContextLens AI Chrome extension. "
        "Handles webpage content ingestion, RAG-based retrieval, "
        "and AI-powered chat via Google Gemini."
    ),
    version="1.0.0",
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc",    # ReDoc UI
)

# ── CORS Middleware ───────────────────────────────────────────────────────────
# Allows the Chrome extension (chrome-extension://<id>) and the Vite dev
# server (localhost:5173) to call this API.
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,chrome-extension://YOUR_EXTENSION_ID",
)
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in allowed_origins else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(page.router, prefix="/api/v1/page", tags=["Page Analysis"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])

# ── Startup event ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    logger.info("ContextLens AI backend started.")
    logger.info("Swagger UI available at: http://127.0.0.1:8000/docs")


# ── Shutdown event ────────────────────────────────────────────────────────────
@app.on_event("shutdown")
async def on_shutdown():
    logger.info("ContextLens AI backend shutting down.")
