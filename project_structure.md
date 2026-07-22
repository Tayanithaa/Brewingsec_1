. Project Folder Structure
Brewingsec_1/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/
│   │   │   │   ├── MonacoEditor.jsx
│   │   │   │   ├── EditorToolbar.jsx
│   │   │   │   └── ErrorGutter.jsx
│   │   │   ├── LogViewer/
│   │   │   │   ├── LogPanel.jsx
│   │   │   │   ├── LogEntry.jsx
│   │   │   │   └── StatsBar.jsx
│   │   │   ├── Challenges/
│   │   │   │   ├── ChallengeList.jsx
│   │   │   │   ├── ChallengeDetail.jsx
│   │   │   │   └── ScoreDashboard.jsx
│   │   │   ├── Gamification/
│   │   │   │   ├── XPBar.jsx
│   │   │   │   ├── RankBadge.jsx
│   │   │   │   └── Leaderboard.jsx
│   │   │   ├── DatasetPicker.jsx
│   │   │   ├── AttackTechniqueBadge.jsx
│   │   │   └── TranspilerOutput.jsx
│   │   ├── api/sigma.js
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── auth/jwt_handler.py
│   │   ├── routers/
│   │   │   ├── rules.py
│   │   │   ├── datasets.py
│   │   │   ├── challenges.py
│   │   │   └── transpiler.py
│   │   ├── services/
│   │   │   ├── sigma_parser.py
│   │   │   ├── log_matcher.py
│   │   │   ├── scorer.py
│   │   │   ├── attack_mapper.py
│   │   │   └── rate_limit.py
│   │   └── data/
│   │       ├── datasets/
│   │       │   ├── windows_security.json
│   │       │   ├── sysmon.json
│   │       │   └── web_access.json
│   │       └── challenges/challenge_definitions.json
│   ├── Dockerfile
│   └── requirements.txt
│
├── demo/
│   ├── demo_script.md
│   ├── slide_deck.pptx
│   ├── break_it_test_log.md
│   └── backup_demo_video.mp4
│
├── docker-compose.yml
├── README.md
├── ARCHITECTURE.md
└── PWNDORA_INTEGRATION.md
