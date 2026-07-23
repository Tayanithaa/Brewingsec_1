"""
routers/transpiler.py — POST /transpile-rule

Bonus feature, per the build spec's cut list: only worth building once the
core detection engine (validate/run/submit) is solid, which it now is.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..services.sigma_parser import validate_and_parse
from ..services.transpiler import transpile
from ..auth.jwt_handler import verify_token

router = APIRouter()

VALID_TARGETS = {"splunk_spl", "sentinel_kql"}


class TranspileRequest(BaseModel):
    rule: str
    target: str


@router.post("/transpile-rule")
def transpile_rule(req: TranspileRequest, user_id: str = Depends(verify_token)):
    if req.target not in VALID_TARGETS:
        raise HTTPException(status_code=400, detail=f"target must be one of {sorted(VALID_TARGETS)}")

    result = validate_and_parse(req.rule)
    if not result.valid:
        raise HTTPException(status_code=400, detail={"valid": False, "errors": result.errors})

    try:
        converted = transpile(req.rule, req.target)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Rule is valid Sigma but could not be converted: {e}")

    if req.target == "splunk_spl":
        return {"splunk_spl": converted}
    return {"sentinel_kql": converted}
