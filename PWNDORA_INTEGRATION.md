# PWNDORA Integration Brief

This document outlines the design considerations and integration points for mounting the **Sigma Rule Builder & Live Validation Engine** as a native module within the **PWNDORA** learning platform.

---

## 1. Product Fit & Rationale

* **Blue-Team Gap**: PWNDORA has focused primarily on offensive security labs (SQLi, Auth Bypass, IDOR). This module provides the first structured **detection engineering** (blue-team) lab.
* **Red-to-Blue Mapping**: Directly matches existing offensive tasks. A learner executes an attack in a web penetration testing lab, then switches to the Sigma Lab to write detection filters for that same technique.

---

## 2. Mounting in PWNDORA Lab UI

The frontend is built as a self-contained single-page component:
- **Iframe Mounting**: The React application is packaged to be hosted as a sub-path (e.g. `/labs/sigma`) and loaded into an `iframe` within the PWNDORA workspace.
- **Responsive Layout**: Designed with fluid grid widths, adjusting to split-screen, vertical sidebar briefs, and wide monitor editor views.

---

## 3. JWT & API Authentication Flow

All endpoints are protected via JWT.
- **Shared Session**: The frontend shares the main PWNDORA cookie or bearer token. On startup, the frontend retrieves the active JWT token from local storage or cookie storage.
- **Interceptors**: Axios interceptors append `Authorization: Bearer <token>` to all queries.
- **Backend Validation**: The FastAPI service verifies the token using the shared platform `JWT_SECRET` keys, enabling authorization for scored attempts.

---

## 4. User Progress & XP Syncing

When a user submits a rule and scores >= 70, XP is awarded:
- **Sync Callback**: The `/challenges/{id}/submit` endpoint returns the score and `xp_earned` in the JSON response.
- **PWNDORA Profile DB**: The FastAPI backend can update the central PWNDORA SQL database directly, adding completed challenge IDs and modifying active student XP points.
