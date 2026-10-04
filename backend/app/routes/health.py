"""
app/routes/health.py — Health Check Router

Provides a simple endpoint to verify that the FastAPI backend
is running and reachable from the Chrome extension or a browser.

Endpoints:
  GET /api/health  →  Returns service status, name, and version
"""

import time
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Record the time when the server started
_START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the current status of the ContextLens AI backend.",
)
async def health_check() -> HealthResponse:
    """
    Returns a JSON payload confirming the service is alive.

    Example response:
    ```json
    {
        "status": "ok",
        "service": "ContextLens AI API",
        "version": "1.0.0",
        "uptime_seconds": 42.7
    }
    ```
    """
    return HealthResponse(
        status="ok",
        service="ContextLens AI API",
        version="1.0.0",
        uptime_seconds=round(time.time() - _START_TIME, 2),
    )
