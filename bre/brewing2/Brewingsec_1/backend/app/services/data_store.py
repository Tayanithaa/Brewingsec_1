"""
data_store.py — loads datasets and challenge data into memory once at startup.
At this dataset size (200 entries x 3 files) an in-memory dict is simpler and
faster than a database, and keeps the 3-second /run-rule budget trivial to hit.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

_datasets: dict[str, list[dict]] = {}
_challenge_definitions: list[dict] = []
_reference_rules: dict[str, str] = {}
_challenge_by_id: dict[str, dict] = {}


def load_all():
    global _datasets, _challenge_definitions, _reference_rules, _challenge_by_id

    for path in (DATA_DIR / "datasets").glob("*.json"):
        with open(path) as f:
            _datasets[path.stem] = json.load(f)["entries"]

    with open(DATA_DIR / "challenges" / "challenge_definitions.json") as f:
        _challenge_definitions = json.load(f)["challenges"]
        _challenge_by_id = {c["id"]: c for c in _challenge_definitions}

    # reference_rules.json is loaded but NEVER exposed via any router response —
    # only used internally by the /submit scoring path.
    with open(DATA_DIR / "challenges" / "reference_rules.json") as f:
        _reference_rules = json.load(f)


def get_dataset(name: str) -> list[dict] | None:
    return _datasets.get(name)


def list_datasets() -> list[dict]:
    return [
        {
            "id": name, 
            "name": name.replace("_", " ").title(), 
            "description": _describe(name), 
            "entry_count": len(entries),
            "fields": list({key for entry in entries for key in entry.keys()})
        }
        for name, entries in _datasets.items()
    ]


def _describe(name: str) -> str:
    return {
        "windows_security": "Windows Security Event Log — logons, scheduled tasks, service installs (Event IDs 4624, 4625, 4698, 7045).",
        "sysmon": "Sysmon Event Log — process creation, process access, registry changes (Event IDs 1, 10, 13).",
        "web_access": "Web server access log — HTTP requests including SQL injection attempts.",
    }.get(name, "Synthetic log dataset.")


def list_challenges() -> list[dict]:
    return _challenge_definitions


def get_challenge(challenge_id: str) -> dict | None:
    return _challenge_by_id.get(challenge_id)


def get_reference_rule(challenge_id: str) -> str | None:
    return _reference_rules.get(challenge_id)


load_all()
