import json
import urllib.request
import urllib.error
from pathlib import Path

BASE_URL = "http://localhost:8000"
REF_RULES_PATH = Path(__file__).parent.parent / "backend" / "app" / "data" / "challenges" / "reference_rules.json"

def http_post(url, data_dict, token=None):
  req = urllib.request.Request(url, data=json.dumps(data_dict).encode("utf-8"), headers={"Content-Type": "application/json"})
  if token:
    req.add_header("Authorization", f"Bearer {token}")
  try:
    with urllib.request.urlopen(req) as resp:
      return json.loads(resp.read().decode("utf-8"))
  except urllib.error.HTTPError as e:
    err_body = e.read().decode("utf-8")
    print(f"HTTP Error {e.code}: {err_body}")
    raise e

def http_get(url, token=None):
  req = urllib.request.Request(url)
  if token:
    req.add_header("Authorization", f"Bearer {token}")
  with urllib.request.urlopen(req) as resp:
    return json.loads(resp.read().decode("utf-8"))

def main():
  print("=== LIVE API VERIFICATION SCRIPT ===")
  
  # 1. Login to get JWT Token
  print("\n1. Authenticaton via POST /auth/demo-login...")
  login_res = http_post(f"{BASE_URL}/auth/demo-login", {"user_id": "live_verifier"})
  token = login_res["access_token"]
  print(f"   -> Authenticated successfully. Token obtained: {token[:20]}...")

  # 2. Verify GET /challenges
  print("\n2. Verification of GET /challenges...")
  ch_res = http_get(f"{BASE_URL}/challenges", token)
  challenges = ch_res["challenges"]
  print(f"   -> GET /challenges count: {len(challenges)} challenges total")
  for c in challenges:
    print(f"      - [{c['id']}] {c['title']} ({c['attack_type']}, {c['difficulty']}, {c['xp_reward']} XP)")
  assert len(challenges) == 7, f"Expected 7 challenges, got {len(challenges)}"

  # 3. Verify GET /log-datasets
  print("\n3. Verification of GET /log-datasets...")
  ds_res = http_get(f"{BASE_URL}/log-datasets", token)
  datasets = ds_res["datasets"]
  print("   -> GET /log-datasets output:")
  for ds in datasets:
    print(f"      - Dataset: {ds['id']} | Entries: {ds['entry_count']} | Fields: {len(ds['fields'])} fields")
    if ds['id'] == 'windows_security':
      print(f"        Fields list: {sorted(ds['fields'])}")
  
  win_ds = next(d for d in datasets if d['id'] == 'windows_security')
  assert win_ds['entry_count'] == 400, f"Expected 400 entries in windows_security, got {win_ds['entry_count']}"

  # 4. Load Reference Rules from reference_rules.json
  print("\n4. Loading Reference Rules from reference_rules.json...")
  with open(REF_RULES_PATH, "r", encoding="utf-8") as f:
    ref_rules = json.load(f)
  print(f"   -> Loaded {len(ref_rules)} reference rules: {list(ref_rules.keys())}")

  # 5. Full 7-Challenge Reference Rule Scoring Check
  print("\n5. Submitting Reference Rules to POST /challenges/{id}/submit for all 7 challenges...")
  for cid in ["ch_001", "ch_002", "ch_003", "ch_004", "ch_005", "ch_006", "ch_007"]:
    rule_str = ref_rules[cid]
    res = http_post(f"{BASE_URL}/challenges/{cid}/submit", {"rule": rule_str}, token)
    print(f"   [{cid}] Score: {res['score']}/100 | Precision: {res['precision']} | Recall: {res['recall']} | FP Rate: {res['fp_rate']}")
    assert res['score'] == 100, f"Challenge {cid} reference rule failed to reach 100! Got {res['score']}"

  # 6. Detailed 4-Way Proof for ch_006
  print("\n6. Detailed 4-Way Proof for ch_006 (Malicious Service Persistence)...")
  
  ch006_variants = {
    "Both Filters (Reference Rule)": ref_rules["ch_006"],
    "0 Filters (Base Selection Only)": """title: Malicious Service Installation
status: experimental
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 7045
        ServiceFileName|contains:
            - '\\Temp\\'
            - '\\AppData\\'
            - 'powershell -enc'
    condition: selection
level: high""",
    "Filter 1 Only (IT_Audit_Agent excluded)": """title: Malicious Service Installation
status: experimental
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 7045
        ServiceFileName|contains:
            - '\\Temp\\'
            - '\\AppData\\'
            - 'powershell -enc'
    filter1:
        ServiceName: IT_Audit_Agent
    condition: selection and not filter1
level: high""",
    "Filter 2 Only (Corp_Backup_Svc excluded)": """title: Malicious Service Installation
status: experimental
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 7045
        ServiceFileName|contains:
            - '\\Temp\\'
            - '\\AppData\\'
            - 'powershell -enc'
    filter2:
        ServiceName: Corp_Backup_Svc
    condition: selection and not filter2
level: high"""
  }

  for label, rule_text in ch006_variants.items():
    res = http_post(f"{BASE_URL}/challenges/ch_006/submit", {"rule": rule_text}, token)
    print(f"\n--- ch_006 Variant: {label} ---")
    print(json.dumps(res, indent=2))

  # 7. Detailed 4-Way Proof for ch_007
  print("\n7. Detailed 4-Way Proof for ch_007 (Suspicious Service Account Interactive Logon)...")

  ch007_variants = {
    "Both Filters (Reference Rule)": ref_rules["ch_007"],
    "0 Filters (Base Selection Only)": """title: Suspicious Service Account Interactive Logon
status: experimental
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        LogonType: 2
        TargetUserName|contains: svc_
    condition: selection
level: medium""",
    "Filter 1 Only (svc_breakglass excluded)": """title: Suspicious Service Account Interactive Logon
status: experimental
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        LogonType: 2
        TargetUserName|contains: svc_
    filter1:
        TargetUserName: svc_breakglass
    condition: selection and not filter1
level: medium""",
    "Filter 2 Only (CONSOLE-STAGING-01 excluded)": """title: Suspicious Service Account Interactive Logon
status: experimental
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        LogonType: 2
        TargetUserName|contains: svc_
    filter2:
        WorkstationName: CONSOLE-STAGING-01
    condition: selection and not filter2
level: medium"""
  }

  for label, rule_text in ch007_variants.items():
    res = http_post(f"{BASE_URL}/challenges/ch_007/submit", {"rule": rule_text}, token)
    print(f"\n--- ch_007 Variant: {label} ---")
    print(json.dumps(res, indent=2))

  print("\n=== ALL LIVE VERIFICATIONS PASSED CLEANLY ===")

if __name__ == "__main__":
  main()
