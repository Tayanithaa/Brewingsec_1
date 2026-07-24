"""
scorer.py — implements the scoring formula from the build spec, already
verified in this project against real reference/weak/narrow rule tests:

    Final Score = (Precision * 40) + (Recall * 40) + (FP Penalty * 20)
    FP Penalty  = 1 - false_positive_rate

Deterministic: same rule + same dataset -> same score, every time.
"""

from dataclasses import dataclass, asdict


@dataclass
class ScoreResult:
    match_count: int
    true_positives: int
    false_positives: int
    total_malicious: int
    precision: float
    recall: float
    fp_rate: float
    score: int  # 0-100

    def as_dict(self) -> dict:
        return asdict(self)


def is_target_malicious(entry: dict, attack_type: str) -> bool:
    """True if entry is malicious AND belongs to the given attack_type, since a
    dataset can hold malicious entries for more than one challenge (e.g.
    windows_security serves 2 challenges)."""
    return bool(entry.get("malicious")) and entry.get("attack_type") == attack_type


def score_matches(matched_entries: list[dict], full_dataset: list[dict], attack_type: str) -> ScoreResult:
    """attack_type scopes true-positive/recall counting to the entries THIS
    challenge targets, since a dataset can hold malicious entries for more
    than one challenge (e.g. windows_security serves 2 challenges)."""

    total_malicious = sum(1 for e in full_dataset if is_target_malicious(e, attack_type))
    true_positives = sum(1 for e in matched_entries if is_target_malicious(e, attack_type))
    false_positives = len(matched_entries) - true_positives

    precision = true_positives / len(matched_entries) if matched_entries else 0.0
    recall = true_positives / total_malicious if total_malicious else 0.0
    fp_rate = false_positives / len(full_dataset) if full_dataset else 0.0
    fp_penalty = 1.0 - fp_rate

    raw_score = (precision * 40) + (recall * 40) + (fp_penalty * 20)
    score = max(0, min(100, round(raw_score)))

    return ScoreResult(
        match_count=len(matched_entries),
        true_positives=true_positives,
        false_positives=false_positives,
        total_malicious=total_malicious,
        precision=round(precision, 3),
        recall=round(recall, 3),
        fp_rate=round(fp_rate, 3),
        score=score,
    )


def estimate_fp_rate(matched_count: int, dataset_size: int) -> float:
    """Used by /run-rule (practice mode, no ground truth about a specific
    challenge's attack_type) to give a rough FP signal without full scoring."""
    if dataset_size == 0:
        return 0.0
    return round(matched_count / dataset_size, 3)