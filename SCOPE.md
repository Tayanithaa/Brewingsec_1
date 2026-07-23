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

- **`docker-compose up --build` was not verified in this environment.** Docker Desktop could
  not be started headlessly in this sandbox (no daemon connection after launch). Everything
  it would exercise was instead verified by running the backend directly with `uvicorn` and
  the frontend directly with `vite dev`, pointed at each other — all functional checks passed
  this way, but the literal one-command clean-clone launch still needs to be run on a machine
  with a working Docker daemon before submission.
- **`/explain-rule` is entirely unimplemented.** No route exists in `main.py` or any router
  file; confirmed by a live request returning 404. This was the ONLY place the spec allows an
  LLM call, and it's currently missing outright — it was in the "bonus, build after core is
  stable" tier, not the never-cut list, but the build spec didn't call it out on the cut list
  either, so treat this as an open decision, not a resolved cut.
- **No `verify_scores.py` (or equivalent) exists anywhere in the repo**, on any branch. The
  build spec requires every reference rule to pass a documented 3-part check (exact match,
  weak-rule penalty, narrow-rule penalty) before being trusted for scoring. That check was
  reproduced manually in this session and passed, but there's no script a judge (or teammate)
  can re-run to confirm it — this should be written and committed, at
  `backend/app/verify_scores.py` or similar.
- **`README.md`, `ARCHITECTURE.md`, and `PWNDORA_INTEGRATION.md` don't exist on `Master`**,
  but substantially complete versions of all three **already exist on the `frontend`
  branch** (commit `02dc6bd`), including the exact required README header line
  (`Track: T-05 | PS: BSCDS26-SODE-01`) and a Mermaid architecture diagram. These should be
  reviewed and ported/reconciled against Master's actual current state, not written from
  scratch — see the branch reconciliation report for details.
- **The `frontend` branch's `sigma.js` still contains a full client-side mock evaluation
  engine** (`USE_MOCK` flag, `mockLogs`, in-browser rule matching). If any content is cherry-
  picked from that branch's later commits (visual polish, docs), this file specifically must
  not be merged as-is — it would reintroduce the exact violation the build spec calls out
  ("No cached, pre-loaded, or simulated results anywhere... never do it in browser JS").
- **Branch consolidation itself is undecided** — Master, main, backend, and frontend all
  diverged from the same initial commit and were never merged back together. See the Task 2
  branch reconciliation report for what's unique to each.
- **Minor data bug**: challenge hints (e.g. ch_001's hint text) contain garbled em-dash
  characters (`Ã¢â‚¬...`), consistent with a UTF-8 string having been
  decoded as Latin-1 somewhere in `challenge_definitions.json` or its generation script. Not
  functionally breaking, but visible to judges in the Sandbox UI.
- **CORS is currently wide open** (`allow_origins=["*"]`) in `main.py`, flagged in-code as
  needing tightening before real PWNDORA production use — fine for a hackathon demo, worth
  flagging so it isn't forgotten.
