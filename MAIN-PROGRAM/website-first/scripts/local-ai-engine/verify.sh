#!/usr/bin/env bash
set -euo pipefail
BASE="${KV_INTERNAL_MODEL_OPENAI_URL:-http://127.0.0.1:8080}"
MODEL="${KV_INTERNAL_MODEL:-qwen3:32b}"
python3 - "$BASE" "$MODEL" <<'PY'
import json,sys,urllib.request
base,model=sys.argv[1].rstrip('/'),sys.argv[2]
def get(url):
    try:
        with urllib.request.urlopen(url,timeout=8) as r:return json.load(r)
    except Exception as e:
        raise RuntimeError(f'local runtime unavailable at {url}: {e}') from e
def post(url,payload):
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={'content-type':'application/json'})
    with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)
try:
    data=get(base+'/v1/models')
except RuntimeError as e:
    print('NOT READY: '+str(e))
    print('No real local model inference was claimed.')
    raise SystemExit(2)
ids=[str(x.get('id') or x.get('name') or '') for x in data.get('data',[])]
if not any(x==model or x.startswith(model+':') or x.startswith(model+'@') for x in ids):
    raise SystemExit('FAIL: configured model is not listed by local runtime: '+model)
print('PASS: configured model visible:',model)
try:
    r=post(base+'/v1/chat/completions',{'model':model,'messages':[{'role':'user','content':'Reply with exactly: KV30 LOCAL AI READY'}],'stream':False,'temperature':0,'max_tokens':32})
except Exception as e:
    print('FAIL: local runtime inference request failed:', e)
    raise SystemExit(1)
text=((r.get('choices') or [{}])[0].get('message') or {}).get('content','').strip()
if not text: raise SystemExit('FAIL: empty inference output')
print('PASS: real local inference returned non-empty output')
print(text)
PY
