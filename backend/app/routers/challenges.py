"""
routers/challenges.py — GET /challenges, POST /challenges/{id}/submit

Non-negotiable: reference rules are loaded from data_store internally and
NEVER serialized into any response from this router, including error paths.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..services.sigma_parser import validate_and_parse
from ..services.log_matcher import run_rule_against_dataset
from ..services.scorer import score_matches
from ..services import data_store
from ..auth.jwt_handler import verify_token

router = APIRouter()


class SubmitRuleRequest(BaseModel):
    rule: str


@router.get("/challenges")
def list_challenges(user_id: str = Depends(verify_token)):
    return {"challenges": data_store.list_challenges()}


@router.post("/challenges/{challenge_id}/submit")
def submit_challenge(challenge_id: str, req: SubmitRuleRequest, user_id: str = Depends(verify_token)):
    challenge = data_store.get_challenge(challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail=f"Unknown challenge '{challenge_id}'")

    result = validate_and_parse(req.rule)
    if not result.valid:
        raise HTTPException(status_code=400, detail={"valid": False, "errors": result.errors})

    dataset = data_store.get_dataset(challenge["dataset"])
    if dataset is None:
        raise HTTPException(status_code=500, detail="Challenge dataset misconfigured")

    matched = run_rule_against_dataset(result.condition, dataset)
    matched_entries = [m["entry"] for m in matched]

    score_result = score_matches(matched_entries, dataset, challenge["attack_type"])

    xp_earned = round(challenge["xp_reward"] * (score_result.score / 100))

    return {
        "precision": score_result.precision,
        "recall": score_result.recall,
        "fp_rate": score_result.fp_rate,
        "score": score_result.score,
        "xp_earned": xp_earned,
    }