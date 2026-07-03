from __future__ import annotations

import time
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory sliding window rate limiter per IP."""

    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        limit = settings.rate_limit_per_minute

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = 60.0

        timestamps = self._requests[client_ip]
        timestamps[:] = [t for t in timestamps if now - t < window]

        if len(timestamps) >= limit:
            logger.warning("Rate limit exceeded for %s", client_ip)
            return JSONResponse(
                status_code=429,
                content={"error": {"code": "RATE_LIMITED", "message": "Too many requests"}},
            )

        timestamps.append(now)
        return await call_next(request)
