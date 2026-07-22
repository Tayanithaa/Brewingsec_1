import json
import urllib.request
import subprocess
import time

server = subprocess.Popen(['.\\venv\\Scripts\\python.exe', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'])
time.sleep(3) # wait for server to start

try:
    req = urllib.request.Request('http://127.0.0.1:8000/auth/demo-login', data=json.dumps({'user_id': 'test'}).encode(), headers={'Content-Type': 'application/json'})
    token = json.loads(urllib.request.urlopen(req).read())['access_token']
    h = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    with open('app/data/challenges/reference_rules.json') as f:
        ref_rules = json.load(f)

    for ch_id, rule in ref_rules.items():
        req = urllib.request.Request(f'http://127.0.0.1:8000/challenges/{ch_id}/submit', data=json.dumps({'rule': rule}).encode(), headers=h)
        try:
            res = json.loads(urllib.request.urlopen(req).read())
            print(f"Challenge {ch_id} score: {res['score']}")
            if res['score'] != 100:
                print(f"FAILED {ch_id} did not score 100! Response: {res}")
        except Exception as e:
            print(f"Error {ch_id}: {e}")
finally:
    server.terminate()
