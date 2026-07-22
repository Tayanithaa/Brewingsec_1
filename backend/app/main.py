from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .routers import rules, datasets, challenges
from .auth.jwt_handler import create_access_token

app = FastAPI(
    title="PWNDORA Sigma Rule Builder",
    description="Track: T-05 | PS: BSCDS26-SODE-01",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the PWNDORA frontend origin before production use
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rules.router)
app.include_router(datasets.router)
app.include_router(challenges.router)


@app.get("/health")
def health():
    return {"status": "ok"}


class LoginRequest(BaseModel):
    user_id: str


@app.post("/auth/demo-login")
def demo_login(req: LoginRequest):
    """Demo-only token issuance so judges/testers can get a working Bearer
    token without a full auth flow. A real PWNDORA integration would replace
    this with tokens issued by PWNDORA's own session system."""
    token = create_access_token(req.user_id)
    return {"access_token": token, "token_type": "bearer"}