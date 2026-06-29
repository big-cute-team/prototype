#!/usr/bin/env python3
# 구 content_items.raw_url -> 새 raw_articles.source_url 백필 (본문 텍스트 정확 매칭)
# 사용: python3 scripts/backfill_source_url.py [--apply]   (--apply 없으면 dry-run)
import json, os, re, sys, urllib.request

def load_env(p='.env.local'):
    for line in open(p, encoding='utf-8'):
        m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
        if m and m.group(1) not in os.environ:
            os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")
load_env()
APPLY = '--apply' in sys.argv
norm = lambda s: re.sub(r'\s+', ' ', s or '').strip()
def base(u): return re.sub(r'/rest/v1$', '', (u or '').rstrip('/'))
NEW = (base(os.environ['SUPABASE_URL']), os.environ['SUPABASE_SERVICE_ROLE_KEY'])
OLD = (base(os.environ['OLD_SUPABASE_URL']), os.environ['OLD_SUPABASE_SERVICE_ROLE_KEY'])

def req(method, url, key, body=None, prefer=None):
    h = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    if prefer: h['Prefer'] = prefer
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(r) as resp:
        t = resp.read().decode()
        return json.loads(t) if t else None

def get_all(env, table, select):
    b, k = env; rows = []; size = 1000; frm = 0
    while True:
        h = {'apikey': k, 'Authorization': f'Bearer {k}', 'Range': f'{frm}-{frm+size-1}'}
        r = urllib.request.Request(f'{b}/rest/v1/{table}?select={select}', headers=h)
        with urllib.request.urlopen(r) as resp:
            batch = json.loads(resp.read().decode())
        rows += batch
        if len(batch) < size: break
        frm += size
    return rows

old = get_all(OLD, 'content_items', 'raw_url,raw_text')
new = get_all(NEW, 'raw_articles', 'raw_article_id,content,source_url')
by_text = {norm(o['raw_text']): o for o in old}

matched=missing=already=updated=failed=0; miss=[]
for n in new:
    o = by_text.get(norm(n['content']))
    if not o: missing+=1; miss.append(n['raw_article_id']); continue
    matched+=1
    if n.get('source_url'): already+=1; continue
    if not o.get('raw_url'): continue
    if not APPLY: updated+=1; continue
    try:
        req('PATCH', f"{NEW[0]}/rest/v1/raw_articles?raw_article_id=eq.{n['raw_article_id']}",
            NEW[1], body={'source_url': o['raw_url']}, prefer='return=minimal')
        updated+=1
    except Exception as e:
        failed+=1; print('ERR', n['raw_article_id'], e, file=sys.stderr)

print(json.dumps({'apply':APPLY,'new':len(new),'old':len(old),'matched':matched,
    'missing':missing,'already_set':already,'updated':updated,'failed':failed,
    'missing_ids':miss[:20]}, ensure_ascii=False, indent=2))
