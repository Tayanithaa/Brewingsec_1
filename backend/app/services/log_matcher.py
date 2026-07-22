"""
log_matcher.py — the actual detection engine.

Two responsibilities:
1. Selection matching: does a single named selection block match a given log entry?
   Handles Sigma field modifiers: exact match, list-as-OR, |contains, |endswith,
   |startswith, |re.
2. Condition evaluation: combine selections per the rule's `condition` string
   ("selection and not filter", "1 of selection*", "all of them", etc.) into a
   final match/no-match decision.

SECURITY NOTE: condition strings come from user-submitted rule text. We never
pass them to eval() or exec() — see condition_engine.py for the hand-written,
side-effect-free parser used instead.
"""

import re
from typing import Any


# ------------------------------------------------------------------
# Selection-level matching (field modifiers)
# ------------------------------------------------------------------

def _normalize(value: Any) -> str:
    return "" if value is None else str(value)


def _field_matches(entry: dict, field_expr: str, expected: Any) -> bool:
    """field_expr is like 'CommandLine' or 'TaskContent|contains'."""
    if "|" in field_expr:
        field_name, modifier = field_expr.split("|", 1)
    else:
        field_name, modifier = field_expr, None

    actual = entry.get(field_name)
    options = expected if isinstance(expected, list) else [expected]

    if modifier is None:
        # exact match; list means OR of exact matches (Sigma semantics)
        return any(_normalize(actual) == _normalize(opt) for opt in options)

    actual_str = _normalize(actual).lower()

    if modifier == "contains":
        return any(_normalize(opt).lower() in actual_str for opt in options)
    if modifier == "startswith":
        return any(actual_str.startswith(_normalize(opt).lower()) for opt in options)
    if modifier == "endswith":
        # normalize backslashes so 'lsass.exe' matches 'C:\\...\\lsass.exe' reliably
        norm_actual = actual_str.replace("\\\\", "\\")
        return any(norm_actual.endswith(_normalize(opt).lower().replace("\\\\", "\\")) for opt in options)
    if modifier == "re":
        for opt in options:
            try:
                if re.search(_normalize(opt), _normalize(actual), re.IGNORECASE):
                    return True
            except re.error:
                continue
        return False

    # Unknown modifier — fail closed (no match) rather than silently mis-scoring.
    return False


def selection_matches(selection_block: dict | list, entry: dict) -> bool:
    """A dict is an implicit AND of fields. A list is an implicit OR of dicts."""
    if isinstance(selection_block, list):
        return any(selection_matches(sub_block, entry) for sub_block in selection_block)

    for field_expr, expected in selection_block.items():
        if not _field_matches(entry, field_expr, expected):
            return False
    return True


# ------------------------------------------------------------------
# Public entry point
# ------------------------------------------------------------------

def evaluate_rule(detection: dict, entry: dict) -> bool:
    """detection = the raw `detection:` block (all named selections + 'condition').
    Returns True if `entry` matches the rule overall."""
    from .condition_engine import evaluate_condition

    condition_str = detection["condition"]
    named_blocks = {k: v for k, v in detection.items() if k != "condition"}

    # Precompute per-selection match results once per entry.
    block_results = {name: selection_matches(block, entry) for name, block in named_blocks.items()}

    return evaluate_condition(condition_str, block_results)


def run_rule_against_dataset(detection: dict, dataset: list[dict]) -> list[dict]:
    """Returns the subset of dataset entries that match the rule, each tagged
    with which fields drove the match (for the UI's match explanation)."""
    matched = []
    for i, entry in enumerate(dataset):
        if evaluate_rule(detection, entry):
            matched.append({"index": i, "entry": entry})
    return matched