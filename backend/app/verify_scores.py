"""
verify_scores.py — proves the mandatory 3-part reference-rule check from the
build spec:

  1. Every reference rule matches exactly the intended malicious entries
     (submitting it to its own challenge scores 100/100).
  2. A deliberately broad/weak rule is correctly penalized on FP rate.
  3. A deliberately narrow/wrong rule is correctly penalized on recall.

Runs against an already-running server — does not spawn one itself, so it
works the same way for anyone on the team regardless of how they start the
backend (bare uvicorn, docker-compose, etc). Point it at a different host
with the API_URL env var if needed.

Usage (from repo root, backend running on the usual port):
    python backend/app/verify_scores.py
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API_URL = os.environ.get("API_URL", "http://localhost:8000")
REFERENCE_RULES_PATH = Path(__file__).parent / "data" / "challenges" / "reference_rules.json"

# Deliberately broad rule for part 2: drops both filter exclusions from ch_001,
# so it matches every NTLM network logon, not just the attack ones.
BROAD_RULE = """title: Verification - deliberately broad rule
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        LogonType:
            - 3
            - 9
        AuthenticationPackageName: NTLM
    condition: selection
"""

# Deliberately narrow/wrong rule for part 3: adds a field that doesn't exist
# in any log entry, so it matches nothing.
NARROW_RULE = """title: Verification - deliberately narrow/wrong rule
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        WorkstationName: THIS-HOST-DOES-NOT-EXIST-ANYWHERE
    condition: selection
"""


def _post(path: str, payload: dict, token: str | None = None) -> tuple[int, dict]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{API_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, {"detail": e.read().decode("utf-8")}


def get_token() -> str:
    status, body = _post("/auth/demo-login", {"user_id": "verify_scores"})
    if status != 200:
        raise RuntimeError(f"Login failed: {status} {body}")
    return body["access_token"]


def submit(challenge_id: str, rule_yaml: str, token: str) -> dict:
    status, body = _post(f"/challenges/{challenge_id}/submit", {"rule": rule_yaml}, token)
    if status != 200:
        return {"error": status, "detail": body}
    return body


def main() -> int:
    print(f"Verifying against {API_URL}\n")

    reference_rules = json.loads(REFERENCE_RULES_PATH.read_text(encoding="utf-8"))
    token = get_token()

    all_passed = True

    print("=== Part 1: each reference rule scores exactly 100 on its own challenge ===")
    for challenge_id, rule_yaml in reference_rules.items():
        result = submit(challenge_id, rule_yaml, token)
        score = result.get("score")
        passed = score == 100
        all_passed &= passed
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {challenge_id}: score={score} "
              f"(precision={result.get('precision')}, recall={result.get('recall')}, "
              f"fp_rate={result.get('fp_rate')})")

    print("\n=== Part 2: a deliberately broad/weak rule is penalized on FP rate ===")
    broad_result = submit("ch_001", BROAD_RULE, token)
    broad_score = broad_result.get("score")
    broad_passed = broad_score is not None and broad_score < 100
    all_passed &= broad_passed
    print(f"  [{'PASS' if broad_passed else 'FAIL'}] broad rule on ch_001: "
          f"score={broad_score} (expected < 100 due to FP penalty) "
          f"precision={broad_result.get('precision')}")

    print("\n=== Part 3: a deliberately narrow/wrong rule is penalized on recall ===")
    narrow_result = submit("ch_001", NARROW_RULE, token)
    narrow_score = narrow_result.get("score")
    narrow_passed = narrow_score is not None and narrow_score < 100
    all_passed &= narrow_passed
    print(f"  [{'PASS' if narrow_passed else 'FAIL'}] narrow rule on ch_001: "
          f"score={narrow_score} (expected < 100 due to recall penalty) "
          f"recall={narrow_result.get('recall')}")

    print(f"\n{'ALL CHECKS PASSED' if all_passed else 'SOME CHECKS FAILED'}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
