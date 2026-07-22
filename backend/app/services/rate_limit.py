"""
rate_limit.py — simple in-memory rate limiter.

At hackathon/demo scale (single process, no horizontal scaling), an in-memory
counter is sufficient and avoids adding Redis as a dependency. If PWNDORA
later runs this behind multiple backend replicas, swap _hits for a Redis
INCR + EXPIRE pair — the limit_or_raise() call site doesn't need to change.
"""

import time
from collections import defaultdict
from fastapi import HTTPException, Request

WINDOW_SECONDS = 60
MAX_REQUESTS_PER_WINDOW = 30  # generous for live demo typing/testing, still blocks abuse

_hits: dict[str, list[float]] = defaultdict(list)


def limit_or_raise(request: Request, user_id: str):
    key = f"{user_id}:{request.url.path}"
    now = time.monotonic()

    _hits[key] = [t for t in _hits[key] if now - t < WINDOW_SECONDS]

    if len(_hits[key]) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Rate limit exceeded — slow down and try again shortly.")

    _hits[key].append(now)