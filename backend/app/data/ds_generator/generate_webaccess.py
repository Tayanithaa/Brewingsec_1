"""
Generates web_access.json — synthetic web server access log dataset.
Standard combined log format: IP, timestamp, HTTP method, URI, status code, user-agent.
Feeds Challenge 5 (SQL Injection).

Usage: python3 generate_web_access.py
Output: ./output/datasets/web_access.json
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

SCANNER_NOISE = 5
ADMIN_PANEL_NOISE = 5
BENIGN_ROUTINE = BENIGN_TOTAL - SCANNER_NOISE - ADMIN_PANEL_NOISE

OUT_DIR = "output/datasets"
os.makedirs(OUT_DIR, exist_ok=True)

BASE_TIME = datetime(2026, 7, 25, 8, 0, 0)

entries = []
idx = 0


def ts(offset_min):
    return (BASE_TIME + timedelta(minutes=offset_min)).strftime("%Y-%m-%dT%H:%M:%SZ")


def next_idx():
    global idx
    idx += 1
    return idx


def malicious_ip():
    """Attack traffic sourced from a small pool of external IPs — repeated IPs read
    as a real campaign rather than random noise, which is more realistic and also
    gives judges an obvious pivot point to look for during the demo."""
    return f"185.220.101.{random.randint(2, 40)}"


def benign_ip():
    return f"10.0.{random.randint(0, 5)}.{random.randint(2, 254)}"


# ------------------------------------------------------------------
# CHALLENGE 5 — SQL Injection
# Signature: query string / URI contains UNION SELECT, ' OR 1=1, or SQL comment sequences (--)
# ------------------------------------------------------------------
SQLI_PAYLOADS = [
    "/products?id=1' UNION SELECT username,password FROM users--",
    "/login?user=admin'--&pass=x",
    "/search?q=test' OR 1=1--",
    "/item?id=5 UNION SELECT NULL,NULL,version()--",
    "/account?uid=1' OR '1'='1",
    "/report?filter=1; DROP TABLE orders--",
    "/products?id=9 UNION SELECT NULL,table_name,NULL FROM information_schema.tables--",
    "/login?user=' OR 1=1 LIMIT 1--&pass=x",
    "/search?q=1' AND SLEEP(5)--",
    "/item?id=-1' UNION SELECT credit_card,NULL,NULL FROM payments--",
]

SQLI_USER_AGENTS = ["sqlmap/1.7#stable", "Mozilla/5.0 (compatible; sqlmap)", "python-requests/2.31.0"]


def add_sqli_malicious(count):
    for _ in range(count):
        entries.append({
            "IP": malicious_ip(),
            "TimeCreated": ts(next_idx()),
            "Method": "GET",
            "URI": random.choice(SQLI_PAYLOADS),
            "StatusCode": random.choice([200, 500]),
            "UserAgent": random.choice(SQLI_USER_AGENTS),
            "malicious": True,
            "attack_type": "T1190"
        })


# ------------------------------------------------------------------
# Benign traffic — routine site usage, no injection patterns
# ------------------------------------------------------------------
BENIGN_URIS = [
    "/products?id=42", "/login?user=priya.k", "/search?q=laptop",
    "/item?id=17", "/account?uid=8", "/report?filter=weekly",
    "/dashboard", "/api/health", "/static/logo.png", "/checkout?cart=99",
    "/products?id=103", "/search?q=running+shoes", "/account?uid=21",
    "/item?id=250", "/report?filter=monthly", "/api/user/profile",
]

BENIGN_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
]


def add_benign(count):
    for _ in range(count):
        entries.append({
            "IP": benign_ip(),
            "TimeCreated": ts(next_idx()),
            "Method": random.choice(["GET", "POST"]),
            "URI": random.choice(BENIGN_URIS),
            "StatusCode": 200,
            "UserAgent": random.choice(BENIGN_USER_AGENTS),
            "malicious": False,
            "attack_type": None
        })

def add_scanner_noise(count):
    """Legitimate vulnerability scanner generating SQLi-like noise from a known authorized IP."""
    for _ in range(count):
        entries.append({
            "IP": "10.0.99.100",  # Authorized scanner IP
            "TimeCreated": ts(next_idx()),
            "Method": "GET",
            "URI": "/search?q=1' OR '1'='1",
            "StatusCode": 403,
            "UserAgent": "Tenable/Nessus",
            "malicious": False,
            "attack_type": None
        })

def add_admin_panel_noise(count):
    """Legitimate admin panel search that looks like a tautology."""
    for _ in range(count):
        entries.append({
            "IP": "10.0.1.50",  # Internal Admin IP
            "TimeCreated": ts(next_idx()),
            "Method": "GET",
            "URI": "/admin/query?filter=' OR 1=1--",
            "StatusCode": 200,
            "UserAgent": "AdminApp/1.0",
            "malicious": False,
            "attack_type": None
        })


# ------------------------------------------------------------------
# Build the dataset at exactly TOTAL_ENTRIES with MALICIOUS_RATIO applied
# ------------------------------------------------------------------
add_sqli_malicious(MALICIOUS_TOTAL)
add_benign(BENIGN_ROUTINE)
add_scanner_noise(SCANNER_NOISE)
add_admin_panel_noise(ADMIN_PANEL_NOISE)

random.shuffle(entries)

out_path = f"{OUT_DIR}/web_access.json"
with open(out_path, "w") as f:
    json.dump({"entries": entries}, f, indent=2)

# ------------------------------------------------------------------
# Verify ratio before moving on — should land close to target
# ------------------------------------------------------------------
total = len(entries)
malicious_count = sum(1 for e in entries if e["malicious"])
print(f"web_access.json: {total} entries")
print(f"  malicious: {malicious_count} ({malicious_count/total*100:.1f}%)")
print(f"  benign:    {total - malicious_count} ({(total - malicious_count)/total*100:.1f}%)")
print(f"Written to {out_path}")