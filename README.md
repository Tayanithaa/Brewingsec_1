# Track: T-05 | PS: BSCDS26-SODE-01

# PWNDORA Sigma Rule Builder & Live Validation Engine

This repository contains the **Sigma Rule Builder & Live Validation Engine**, a blue-team gamified cybersecurity training lab module designed as a native extension for **PWNDORA**.

---

## Setup & Deployment

### Quick Start (Production Build)

Launch the entire suite (FastAPI backend + React frontend + Data Layer mount) in one command:

```bash
docker-compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Local Frontend Development

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

---

## Technical Architecture Overview

The system runs a three-tier architecture:
1. **React Frontend**: Self-contained Monaco Editor layout with debounced (800ms) structural validation linting, collapsible log row previews with highlighted matched fields, and bar charts showcasing precision/recall/FP ratios.
2. **FastAPI Backend**: Rules parsing using the official `pySigma` library, event-log dataset scan match algorithms, and precision-recall scoring.
3. **Data Layer**: JSON event files representing Windows Security logs, Sysmon audits, and Web proxy access events (~30% malicious / ~70% benign mix).

---

## API Contract

The frontend and backend interact via the following JWT-protected endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/validate-rule` | Validates Sigma YAML rule grammar and fields. |
| `POST` | `/run-rule` | Matches rule against dataset. Returns matched lines. |
| `GET` | `/log-datasets` | Lists available datasets metadata. |
| `GET` | `/challenges` | Retrieves the 5 active challenges. |
| `POST` | `/challenges/{id}/submit` | Scored challenge run submission (Precision * 40 + Recall * 40 + (1 - FP Rate) * 20). |
| `POST` | `/transpile-rule` | Converts Sigma YAML into Splunk SPL or Sentinel KQL (Bonus). |
| `POST` | `/explain-rule` | Generates LLM-guided rule explanations and suggested fixes (Bonus). |

---

## The 5 Scored Challenges

1. **Pass-the-Hash Detection** (ATT&CK T1550.002): Match NTLM network logons without Kerberos ticket negotiations.
2. **Scheduled Task Creation** (ATT&CK T1053.005): Match Task Scheduler additions executing commands from Temp locations.
3. **LSASS Memory Access** (ATT&CK T1003.001): Monitor memory dumps of lsass.exe (Mimikatz accesses via 0x1010).
4. **Encoded PowerShell Execution** (ATT&CK T1059.001): Filter processes executing base64 encoded commands (`-enc`).
5. **SQL Injection Exploitation** (ATT&CK T1190): Parse web proxy logs for database injection query parameters (`UNION SELECT`, `--`).

---

## Known Limitations

- Monaco editor styling in dark mode depends on CDN resource fetches (using `@monaco-editor/react` lazy loaders). Internet connection is recommended.
- Rate limiting is configured at 60 requests/minute per client IP to prevent validation flooding during evaluation.
