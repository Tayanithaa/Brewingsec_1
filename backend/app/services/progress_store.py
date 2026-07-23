"""
progress_store.py — tracks per-user XP and challenge completion, in memory.

At hackathon scale (single backend process, no horizontal scaling), an
in-memory dict is the right call — same reasoning as rate_limit.py. If this
ever needs to survive a backend restart or scale across replicas, swap the
dict for SQLite/Postgres; the function signatures below don't need to change.

Design decision on XP farming: a user only earns xp_reward the FIRST time
they clear a challenge (score >= PASS_THRESHOLD). Resubmitting an
already-passed challenge still returns a real score (so they can see it) but
awards 0 additional XP. This mirrors how the frontend's PASS/FAIL badge
already works (>=70 threshold) and stops someone from re-submitting the same
working rule 50 times to inflate their leaderboard position.
"""

from dataclasses import dataclass, field

PASS_THRESHOLD = 70
HINT_COST = 5


@dataclass
class UserProgress:
    user_id: str
    total_xp: int = 0
    completed_challenges: dict[str, int] = field(default_factory=dict)  # challenge_id -> best score
    unlocked_hints: dict[str, set] = field(default_factory=dict)  # challenge_id -> set of unlocked hint indices


_progress: dict[str, UserProgress] = {}


def _get_or_create(user_id: str) -> UserProgress:
    if user_id not in _progress:
        _progress[user_id] = UserProgress(user_id=user_id)
    return _progress[user_id]


def record_submission(user_id: str, challenge_id: str, score: int, xp_reward: int) -> dict:
    """Call this after scoring a /challenges/{id}/submit request.
    Returns {xp_awarded, total_xp, newly_completed, best_score}."""
    progress = _get_or_create(user_id)

    previous_best = progress.completed_challenges.get(challenge_id, 0)
    newly_completed = False
    xp_awarded = 0

    if score >= PASS_THRESHOLD and previous_best < PASS_THRESHOLD:
        # first time clearing this challenge
        xp_awarded = round(xp_reward * (score / 100))
        progress.total_xp += xp_awarded
        newly_completed = True

    if score > previous_best:
        progress.completed_challenges[challenge_id] = score

    return {
        "xp_awarded": xp_awarded,
        "total_xp": progress.total_xp,
        "newly_completed": newly_completed,
        "best_score": progress.completed_challenges.get(challenge_id, previous_best),
    }


def unlock_hint(user_id: str, challenge_id: str, hint_index: int) -> dict:
    """Deducts HINT_COST from total_xp, persisted server-side — unlike the
    submission flow, this can go negative-protected (floored at 0) but is
    otherwise a straight deduction. Idempotent: unlocking an already-unlocked
    hint again doesn't charge twice (covers page refresh / duplicate clicks)."""
    progress = _get_or_create(user_id)
    already_unlocked = progress.unlocked_hints.setdefault(challenge_id, set())

    charged = False
    if hint_index not in already_unlocked:
        if progress.total_xp < HINT_COST:
            return {"success": False, "reason": "insufficient_xp", "total_xp": progress.total_xp}
        progress.total_xp -= HINT_COST
        already_unlocked.add(hint_index)
        charged = True

    return {
        "success": True,
        "charged": charged,
        "total_xp": progress.total_xp,
        "unlocked_hints": sorted(already_unlocked),
    }


def get_progress(user_id: str) -> dict:
    progress = _get_or_create(user_id)
    return {
        "user_id": progress.user_id,
        "total_xp": progress.total_xp,
        "completed_challenges": progress.completed_challenges,
        "challenges_completed_count": sum(1 for s in progress.completed_challenges.values() if s >= PASS_THRESHOLD),
        "unlocked_hints": {k: sorted(v) for k, v in progress.unlocked_hints.items()},
    }


def get_leaderboard(limit: int = 10) -> list[dict]:
    ranked = sorted(_progress.values(), key=lambda p: p.total_xp, reverse=True)
    return [
        {
            "rank": i + 1,
            "user_id": p.user_id,
            "total_xp": p.total_xp,
            "challenges_completed": sum(1 for s in p.completed_challenges.values() if s >= PASS_THRESHOLD),
        }
        for i, p in enumerate(ranked[:limit])
    ]
