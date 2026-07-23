"""
Generates sysmon.json — synthetic Sysmon Event Log dataset.
Covers Sysmon Event IDs: 1 (process creation), 10 (process access), 13 (registry value set)
Feeds Challenge 3 (LSASS Access / Credential Dumping) and Challenge 4 (Encoded PowerShell).

Usage: python3 generate_sysmon.py
Output: ./output/datasets/sysmon.json
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
LSASS_MALICIOUS = MALICIOUS_TOTAL // 2                 # 30 — Challenge 3
POWERSHELL_MALICIOUS = MALICIOUS_TOTAL - LSASS_MALICIOUS  # 30 — Challenge 4

BENIGN_LSASS_ACCESS = round(BENIGN_TOTAL * 0.30)   # normal process access to lsass.exe (AV/EDR)
LSASS_TASKMGR_NOISE = 5  # legitimate admin troubleshooting via Task Manager dump
LSASS_DEFENDER_NOISE = 5 # legitimate Defender process access with 0x1010
BENIGN_POWERSHELL = round(BENIGN_TOTAL * 0.30)     # normal powershell process creation
SCCM_POWERSHELL_NOISE = 5  # legitimate automation via SCCM
ADMIN_POWERSHELL_NOISE = 5 # legitimate admin encoded script
BENIGN_REGISTRY = BENIGN_TOTAL - BENIGN_LSASS_ACCESS - LSASS_TASKMGR_NOISE - LSASS_DEFENDER_NOISE - BENIGN_POWERSHELL - SCCM_POWERSHELL_NOISE - ADMIN_POWERSHELL_NOISE  # registry padding, absorbs rounding

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


# ------------------------------------------------------------------
# CHALLENGE 3 — LSASS Access (Credential Dumping)
# Signature: EventID 10, TargetImage = lsass.exe, GrantedAccess = 0x1010 (classic Mimikatz)
# ------------------------------------------------------------------
MALICIOUS_SOURCE_IMAGES = [
    "C:\\Users\\Public\\update.exe",
    "C:\\Windows\\Temp\\svc.exe",
    "C:\\PerfLogs\\dbg.exe",
    "C:\\Users\\Public\\Downloads\\mimidrv.exe",
]


def add_lsass_malicious(count):
    for _ in range(count):
        entries.append({
            "EventID": 10,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SourceImage": random.choice(MALICIOUS_SOURCE_IMAGES),
            "TargetImage": "C:\\Windows\\System32\\lsass.exe",
            "GrantedAccess": "0x1010",
            "CallTrace": "C:\\Windows\\SYSTEM32\\ntdll.dll+9d9b4|C:\\Windows\\System32\\KERNELBASE.dll+21f6d",
            "malicious": True,
            "attack_type": "T1003.001"
        })


def add_lsass_benign(count):
    """Normal AV/EDR access to lsass.exe — different GrantedAccess value, must NOT match the rule."""
    benign_sources = [
        "C:\\Program Files\\Windows Defender\\MsMpEng.exe",
        "C:\\Windows\\System32\\wbem\\WmiPrvSE.exe",
        "C:\\Program Files\\CrowdStrike\\CSFalconService.exe",
    ]
    for _ in range(count):
        entries.append({
            "EventID": 10,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SourceImage": random.choice(benign_sources),
            "TargetImage": "C:\\Windows\\System32\\lsass.exe",
            "GrantedAccess": random.choice(["0x1000", "0x1400", "0x100000"]),
            "CallTrace": "C:\\Windows\\SYSTEM32\\ntdll.dll+a2c14",
            "malicious": False,
            "attack_type": None
        })

def add_lsass_taskmgr_noise(count):
    """Legitimate admin creating a memory dump of LSASS for troubleshooting."""
    for _ in range(count):
        entries.append({
            "EventID": 10,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SourceImage": "C:\\Windows\\System32\\Taskmgr.exe",
            "TargetImage": "C:\\Windows\\System32\\lsass.exe",
            "GrantedAccess": "0x1010",
            "CallTrace": "C:\\Windows\\SYSTEM32\\ntdll.dll+9d9b4",
            "malicious": False,
            "attack_type": None
        })

def add_lsass_defender_noise(count):
    """Legitimate Defender accessing LSASS with 0x1010."""
    for _ in range(count):
        entries.append({
            "EventID": 10,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "SourceImage": "C:\\Program Files\\Windows Defender\\MsMpEng.exe",
            "TargetImage": "C:\\Windows\\System32\\lsass.exe",
            "GrantedAccess": "0x1010",
            "CallTrace": "C:\\Windows\\SYSTEM32\\ntdll.dll+9d9b4",
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# CHALLENGE 4 — Encoded PowerShell
# Signature: EventID 1, Image = powershell.exe, CommandLine contains -enc / -EncodedCommand
# ------------------------------------------------------------------
ENCODED_COMMANDS = [
    "powershell.exe -enc SQBuAHYAbwBrAGUALQBFAHgAcAByAGUAcwBzAGkAbwBuAA==",
    "powershell.exe -EncodedCommand JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0AA==",
    "powershell -nop -w hidden -enc UwB0AGEAcgB0AC0AUAByAG8AYwBlAHMAcwA=",
    "powershell.exe -e JAB3AGMAIAA9ACAATgBlAHcALQBPAGIAagBlAGMAdAA=",
    "powershell.exe -EncodedCommand cwBlAG4AZAAtAGQAYQB0AGEA",
]

BENIGN_COMMANDS = [
    "powershell.exe -Command Get-Process",
    "powershell.exe -File C:\\Scripts\\backup.ps1",
    "powershell.exe -Command Get-Service -Name BITS",
    "powershell.exe -NoProfile -Command Import-Module ActiveDirectory",
]

PARENT_IMAGES = ["C:\\Windows\\explorer.exe", "C:\\Windows\\System32\\cmd.exe"]


def add_powershell_malicious(count):
    for _ in range(count):
        entries.append({
            "EventID": 1,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": random.choice(ENCODED_COMMANDS),
            "ParentImage": random.choice(PARENT_IMAGES),
            "User": random.choice(USERS),
            "malicious": True,
            "attack_type": "T1059.001"
        })


def add_powershell_benign(count):
    for _ in range(count):
        entries.append({
            "EventID": 1,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": random.choice(BENIGN_COMMANDS),
            "ParentImage": "C:\\Windows\\explorer.exe",
            "User": random.choice(USERS),
            "malicious": False,
            "attack_type": None
        })

def add_sccm_powershell_noise(count):
    """Legitimate endpoint management automation using encoded PowerShell."""
    for _ in range(count):
        entries.append({
            "EventID": 1,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe -enc <benign_automation_payload>",
            "ParentImage": "C:\\Windows\\CCM\\CcmExec.exe",
            "User": "NT AUTHORITY\\SYSTEM",
            "malicious": False,
            "attack_type": None
        })

def add_admin_powershell_noise(count):
    """Legitimate admin script using encoded PowerShell."""
    for _ in range(count):
        entries.append({
            "EventID": 1,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe -EncodedCommand <benign_admin_payload>",
            "ParentImage": "C:\\Windows\\explorer.exe",
            "User": "hr_admin",
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# Padding — EventID 13 (registry value set) for realism.
# Always benign; not targeted by either challenge.
# ------------------------------------------------------------------
def add_registry_padding(count):
    targets = [
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{App}",
        "HKCU\\Software\\Microsoft\\Office\\16.0\\Common\\General",
    ]
    for _ in range(count):
        entries.append({
            "EventID": 13,
            "TimeCreated": ts(next_idx()),
            "Computer": random.choice(HOSTS),
            "TargetObject": random.choice(targets),
            "Details": "DWORD (0x00000001)",
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# Build the dataset at exactly TOTAL_ENTRIES with MALICIOUS_RATIO applied
# ------------------------------------------------------------------
add_lsass_malicious(LSASS_MALICIOUS)
add_lsass_benign(BENIGN_LSASS_ACCESS)
add_lsass_taskmgr_noise(LSASS_TASKMGR_NOISE)
add_lsass_defender_noise(LSASS_DEFENDER_NOISE)
add_powershell_malicious(POWERSHELL_MALICIOUS)
add_powershell_benign(BENIGN_POWERSHELL)
add_sccm_powershell_noise(SCCM_POWERSHELL_NOISE)
add_admin_powershell_noise(ADMIN_POWERSHELL_NOISE)
add_registry_padding(BENIGN_REGISTRY)

random.shuffle(entries)

out_path = f"{OUT_DIR}/sysmon.json"
with open(out_path, "w") as f:
    json.dump({"entries": entries}, f, indent=2)

# ------------------------------------------------------------------
# Verify ratio before moving on — should land close to target
# ------------------------------------------------------------------
total = len(entries)
malicious_count = sum(1 for e in entries if e["malicious"])
print(f"sysmon.json: {total} entries")
print(f"  malicious: {malicious_count} ({malicious_count/total*100:.1f}%)")
print(f"  benign:    {total - malicious_count} ({(total - malicious_count)/total*100:.1f}%)")
print(f"Written to {out_path}")