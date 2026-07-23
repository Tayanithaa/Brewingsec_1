# SCOPE — PWNDORA Sigma Rule Builder & Live Validation Engine

Track: T-05 | PS: BSCDS26-SODE-01

## 1. What we set out to build

A browser-based blue-team detection engineering lab for PWNDORA. A learner writes a Sigma
detection rule in a Monaco editor, runs it server-side against synthetic Windows Security,
Sysmon, and web-access logs, sees exactly which log lines matched and why, and — across 5
gamified challenges mapped to real ATT&CK techniques (Pass-the-Hash, Scheduled Task Creation,
LSASS Access, Encoded PowerShell, SQL Injection) — gets scored on precision, recall, and
false-positive rate against a hidden reference rule. PWNDORA currently has zero blue-team
labs; this is the first one, designed to be embedded as a self-contained React component in
PWNDORA's existing lab iframe architecture, sharing its JWT session model.

## 2. What's actually built and working right now

Verified directly (backend run standalone + frontend via Vite dev server against it, since
Docker Desktop could not be brought up in this sandbox — see Task 4 report / Open Items below
for the one item that's still docker-specific).

- **Full API contract**: `/health`, `/auth/demo-login`, `/validate-rule`, `/run-rule`,
  `/log-datasets`, `/challenges`, `/challenges/{id}/submit`, `/user/progress`,
  `/challenges/{id}/hints/{i}/unlock`, `/leaderboard`, `/transpile-rule` — all present, all
  responding with the schemas specified in the build spec.
- **Matching engine**: real pySigma (`SigmaCollection`) for structural validation, a
  hand-written recursive-descent parser for `condition:` strings (and/or/not, parens, `1 of`/
  `all of`, `*`-prefix aggregates) — no `eval()`/`exec()` anywhere, confirmed by reading
  `condition_engine.py` and `log_matcher.py`.
- **Scoring formula**: exactly `(Precision × 40) + (Recall × 40) + (FP Penalty × 20)`,
  deterministic, implemented in `scorer.py`.
- **All 5 mandatory challenges**: verified live — each reference rule scores **exactly
  100/100** (precision 1.0, recall 1.0, fp_rate 0.0) via `/challenges/{id}/submit`.
- **3-part scoring integrity check**: no dedicated script exists for this (see Open Items),
  but manually reproduced against ch_001 — a deliberately broad rule (drops the two filter
  exclusions) scored 67/100 on the FP/precision penalty, and a deliberately narrow/wrong rule
  (adds a filter that matches nothing) scored 20/100 on the recall penalty. Both correctly
  penalized relative to the 100-point baseline.
- **JWT auth**: every data-bearing endpoint requires `Authorization: Bearer <token>`;
  `/auth/demo-login` issues a working token; invalid/missing tokens are rejected.
- **Rate limiting**: confirmed live — 30 requests/60s per user+path on `/validate-rule` and
  `/run-rule`; request #31 returns 429, exactly as specified.
- **`/transpile-rule`**: uses pySigma's real `SplunkBackend` and `KustoBackend` (not
  hand-rolled string conversion). Confirmed producing real output, e.g.
  `EventID=4624 LogonType IN (3, 9) AuthenticationPackageName="NTLM" NOT (...)` for Splunk SPL,
  and equivalent KQL for Sentinel. Wired end-to-end in the UI (Convert button →
  TranspilerOutput panel) and confirmed working in the browser, not just at the API layer.
- **Frontend flow**: Landing → Challenges → Sandbox (challenge detail with Monaco editor,
  live-lint validation, Run Rule with live log console, Convert, Submit) all confirmed working
  in-browser. Submitting the ch_001 reference rule returned 100/100, +200 XP, and the header
  XP tracker updated live (0/200 XP, Lvl 1 → 200/400 XP, Lvl 2, "SOC Analyst" rank).
- **Gamification**: XP per challenge, rank progression, and a real (non-mock) leaderboard
  endpoint are implemented and wired to actual submission data.
- **Live linting**: Monaco gutter error markers (`ErrorGutter.jsx`) wired to `/validate-rule`
  on debounce.
- **Reference rules are never serialized to any endpoint** — confirmed by reading
  `challenges.py`; only score/precision/recall/fp_rate/xp fields leave the router.

## 3. What's explicitly out of scope / intentionally cut

Per the build spec's cut list (Section 11), in the order it says to drop them if time runs
short — all of these were in fact dropped, which is the correct call for a 12-hour hackathon
once the non-negotiables (core engine, 5 challenges, docker-compose, three doc files) are
protected:

- **Bonus challenges** (Mimikatz variant, Registry Run Key Persistence) — not built. Correct
  cut; quality on the mandatory 5 matters more to judging than challenge count.
- **ATT&CK auto-suggestion** — what exists (`AttackTechniqueBadge.jsx`) is a static badge
  linking to the known MITRE ATT&CK page for a challenge's technique, not an
  auto-suggestion/detection feature. This is a reasonable simplification, not a full cut.
- **Gamification polish** (streak counters, accomplishment badges like "Zero False
  Positives") — not built; XP + rank + leaderboard were kept, which is exactly what the spec
  said to preserve.

## 4. What's still open (unowned — needs triage)

**Resolved since the first pass:**
- `verify_scores.py` now exists at `backend/app/verify_scores.py`, runs against any already-
  running server via `API_URL`, and passes all 3 parts of the reference-rule check.
- `README.md`, `ARCHITECTURE.md`, and `PWNDORA_INTEGRATION.md` are now committed at repo root,
  ported from the `frontend` branch's doc-only commit and corrected to match current reality
  (accurate `/explain-rule`/`/transpile-rule` status, correct rate-limit numbers, correct
  dataset event IDs, honest in-memory-vs-PWNDORA-DB framing for progress sync).
- The mojibake bug in challenge hints is fixed at the root cause: `data_store.py` was opening
  the JSON files with Python's platform-default encoding (not UTF-8) on Windows, silently
  mis-decoding the em-dash bytes. Fixed by opening with `encoding="utf-8"` explicitly.
- `Master` has been merged into `main` (fast-forward) and pushed; `main` was already GitHub's
  default branch and now contains everything. `backend`, `frontend`, and `Master` are queued
  for deletion pending explicit go-ahead (their unique value — the three docs — is now safely
  ported; see the branch reconciliation notes).

**Still open:**
- **`docker-compose up --build` still hasn't been verified through the actual container path
  in this sandbox.** Docker Desktop's own processes start and then exit/crash rather than the
  engine coming up — a real environment limitation, not a timing issue (confirmed by waiting
  and retrying). Everything the containerized stack would exercise was instead verified by
  running the backend directly with `uvicorn` and the frontend directly with `vite dev`,
  pointed at each other — all functional checks passed this way, including the full
  challenge-submit flow — but the literal one-command clean-clone launch through Docker itself
  needs to be run by someone with a working Docker daemon before submission.
- **`/explain-rule` is still entirely unimplemented.** No route exists in `main.py` or any
  router file; confirmed by a live request returning 404. This was the ONLY place the spec
  allows an LLM call. It was in the "bonus, build after core is stable" tier, not the
  never-cut list, so this is an open decision (build it, or explicitly move it to the cut
  list), not a resolved cut either way.
- **The `frontend` branch's `sigma.js` still contains a full client-side mock evaluation
  engine** (`USE_MOCK` flag, `mockLogs`, in-browser rule matching). This branch is queued for
  deletion (see above) and only its doc files were ever ported — this is a reminder of why, not
  an active risk, as long as the branch is deleted rather than merged wholesale.
- **CORS is currently wide open** (`allow_origins=["*"]`) in `main.py`, flagged in-code as
  needing tightening before real PWNDORA production use — fine for a hackathon demo, worth
  flagging so it isn't forgotten.
