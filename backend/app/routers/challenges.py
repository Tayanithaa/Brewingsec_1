"""
routers/challenges.py — GET /challenges, POST /challenges/{id}/submit,
GET /user/progress, GET /leaderboard

Non-negotiable: reference rules are loaded from data_store internally and
NEVER serialized into any response from this router, including error paths.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..services.sigma_parser import validate_and_parse
from ..services.log_matcher import run_rule_against_dataset
from ..services.scorer import score_matches
from ..services import data_store, progress_store
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

    progress_update = progress_store.record_submission(
        user_id=user_id,
        challenge_id=challenge_id,
        score=score_result.score,
        xp_reward=challenge["xp_reward"],
    )

    return {
        "precision": score_result.precision,
        "recall": score_result.recall,
        "fp_rate": score_result.fp_rate,
        "score": score_result.score,
        "xp_earned": progress_update["xp_awarded"],
        "total_xp": progress_update["total_xp"],
        "newly_completed": progress_update["newly_completed"],
        "best_score": progress_update["best_score"],
    }


@router.get("/user/progress")
def get_user_progress(user_id: str = Depends(verify_token)):
    return progress_store.get_progress(user_id)


@router.post("/challenges/{challenge_id}/hints/{hint_index}/unlock")
def unlock_hint(challenge_id: str, hint_index: int, user_id: str = Depends(verify_token)):
    challenge = data_store.get_challenge(challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail=f"Unknown challenge '{challenge_id}'")
    if hint_index < 0 or hint_index >= len(challenge["hints"]):
        raise HTTPException(status_code=400, detail=f"hint_index out of range for this challenge")

    result = progress_store.unlock_hint(user_id, challenge_id, hint_index)
    if not result["success"]:
        raise HTTPException(status_code=402, detail="Not enough XP to unlock this hint")
    return result


@router.get("/leaderboard")
def get_leaderboard(user_id: str = Depends(verify_token)):
    return {"leaderboard": progress_store.get_leaderboard(limit=10)}
