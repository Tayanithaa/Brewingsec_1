"""
routers/rules.py — POST /validate-rule, POST /run-rule
Exact schemas per the build spec's API contract.
"""

import time
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..services.sigma_parser import validate_and_parse
from ..services.log_matcher import run_rule_against_dataset
from ..services.scorer import estimate_fp_rate
from ..services import data_store
from ..services.rate_limit import limit_or_raise
from ..auth.jwt_handler import verify_token

router = APIRouter()


class ValidateRuleRequest(BaseModel):
    rule: str


class RunRuleRequest(BaseModel):
    rule: str
    dataset: str


@router.post("/validate-rule")
def validate_rule(req: ValidateRuleRequest, request: Request, user_id: str = Depends(verify_token)):
    limit_or_raise(request, user_id)
    result = validate_and_parse(req.rule)
    if not result.valid:
        return {"valid": False, "errors": result.errors}
    return {
        "valid": True,
        "parsed_fields": {
            "title": result.title,
            "detection_fields": result.detection_fields,
        },
    }


@router.post("/run-rule")
def run_rule(req: RunRuleRequest, request: Request, user_id: str = Depends(verify_token)):
    limit_or_raise(request, user_id)
    start = time.monotonic()

    result = validate_and_parse(req.rule)
    if not result.valid:
        raise HTTPException(status_code=400, detail={"valid": False, "errors": result.errors})

    dataset = data_store.get_dataset(req.dataset)
    if dataset is None:
        raise HTTPException(status_code=404, detail=f"Unknown dataset '{req.dataset}'. Use GET /log-datasets to list valid options.")

    matched = run_rule_against_dataset(result.condition, dataset)

    elapsed = time.monotonic() - start
    if elapsed > 3.0:
        # Should never happen at this dataset size — surfaced loudly if it does,
        # since the 3-second budget is a hard requirement.
        import logging
        logging.warning(f"/run-rule exceeded 3s budget: {elapsed:.2f}s for dataset={req.dataset}")

    matched_entries_response = [
        {
            "index": m["index"],
            "entry": m["entry"],
            "matched_fields": result.detection_fields,
        }
        for m in matched
    ]

    total_malicious = sum(1 for e in dataset if e.get("malicious", False))
    true_positives = sum(1 for m in matched if m["entry"].get("malicious", False))
    precision = (true_positives / len(matched)) if len(matched) > 0 else 0.0
    recall = (true_positives / total_malicious) if total_malicious > 0 else 0.0

    return {
        "match_count": len(matched),
        "total_entries": len(dataset),
        "fp_rate_estimate": estimate_fp_rate(len(matched), len(dataset)),
        "precision": precision,
        "recall": recall,
        "matched_entries": matched_entries_response,
    }