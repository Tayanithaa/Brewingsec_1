"""
sigma_parser.py — parses and validates Sigma rules.

Two jobs, kept deliberately separate:
1. Structural/spec validation — delegated to real pySigma (SigmaCollection).
   This is what /validate-rule uses. If pySigma rejects it, it's not valid Sigma,
   full stop — we don't second-guess that.
2. Extraction into a plain dict our log_matcher can evaluate against JSON log
   entries. pySigma's own evaluation targets SIEM backends (Splunk/KQL/etc.),
   not raw Python dicts, so this extraction step is what lets us run rules
   directly against our datasets without standing up a real SIEM.
"""

from dataclasses import dataclass
from typing import Any
import yaml
from sigma.collection import SigmaCollection
from sigma.exceptions import SigmaError


@dataclass
class ParseResult:
    valid: bool
    title: str | None = None
    detection_fields: list[str] | None = None
    condition: dict | None = None       # raw detection block, ready for log_matcher
    errors: list[dict] | None = None


def validate_and_parse(rule_yaml: str) -> ParseResult:
    """Full validation pipeline: pySigma spec check, then our own extraction."""
    # Step 1 — is this even parseable YAML?
    try:
        raw = yaml.safe_load(rule_yaml)
    except yaml.YAMLError as e:
        return ParseResult(valid=False, errors=[{"line": _yaml_error_line(e), "message": str(e)}])

    if not isinstance(raw, dict):
        return ParseResult(valid=False, errors=[{"line": 1, "message": "Rule must be a YAML mapping (title, logsource, detection, ...)."}])

    # Step 2 — is it spec-compliant Sigma? Delegate to the real library.
    try:
        SigmaCollection.from_yaml(rule_yaml)
    except SigmaError as e:
        return ParseResult(valid=False, errors=[{"line": None, "message": str(e)}])
    except Exception as e:
        return ParseResult(valid=False, errors=[{"line": None, "message": f"Rule rejected: {e}"}])

    # Step 3 — extract what our matcher needs.
    detection = raw.get("detection")
    if not detection or "condition" not in detection:
        return ParseResult(valid=False, errors=[{"line": None, "message": "detection.condition is required."}])

    field_names = set()
    for key, block in detection.items():
        if key == "condition":
            continue
        if isinstance(block, dict):
            for field_key in block.keys():
                field_names.add(field_key.split("|")[0])
        elif isinstance(block, list):
            for item in block:
                if isinstance(item, dict):
                    for field_key in item.keys():
                        field_names.add(field_key.split("|")[0])

    return ParseResult(
        valid=True,
        title=raw.get("title", "Untitled Rule"),
        detection_fields=sorted(field_names),
        condition=detection,
    )


def _yaml_error_line(e: yaml.YAMLError) -> int | None:
    mark = getattr(e, "problem_mark", None)
    return (mark.line + 1) if mark else None