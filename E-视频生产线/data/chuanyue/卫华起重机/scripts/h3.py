import sys, json, base64, os, time, urllib.request, urllib.error, pathlib
P = pathlib.Path(sys.argv[1]); cmd = sys.argv[2]
env = {}
for line in open(r"E:/卫华黑客松/E-视频生产线/.env", encoding="utf-8"):
    if "=" in line and not line.startswith("#"):
        k, v = line.strip().split("=", 1); env[k] = v
KEY = env["TUZI_API_KEY"]; BASE = (env.get("TUZI_API_BASE_URL") or "https://api.tu-zi.com").rstrip("/")
STATE = P / "h3-tasks.json"
state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
def save(): STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
def call(path, body=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body else None, method="POST" if body else "GET",
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        return {"_http": e.code, "_body": e.read().decode("utf-8", "replace")[:800]}
if cmd == "submit":
    shots = json.loads((P / "h3-shots.json").read_text(encoding="utf-8"))
    only = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None
    for s in shots:
        sid = s["id"]
        if only and sid not in only: continue
        if sid in state and state[sid].get("id") and state[sid].get("status") != "failed":
            print(sid, "已提交过，跳过", state[sid]["id"]); continue
        img = base64.b64encode((P / "ref" / f"{sid}.jpg").read_bytes()).decode()
        body = {"model": "MiniMax-H3", "prompt": s["prompt"], "seconds": s.get("seconds", "4"), "size": "1280x720",
                "input_reference": "data:image/jpeg;base64," + img}
        res = call("/v1/videos", body)
        tid = res.get("id") or res.get("task_id")
        state[sid] = {"id": tid, "status": res.get("status"), "submit": {k: v for k, v in res.items() if k != "_body"} if tid else res}
        save(); print(sid, json.dumps(state[sid], ensure_ascii=False)[:400])
elif cmd == "poll":
    for sid, t in state.items():
        if not t.get("id") or t.get("file"): continue
        res = call("/v1/videos/" + t["id"])
        t["status"] = res.get("status"); t["progress"] = res.get("progress"); t["last"] = {k: v for k, v in res.items() if k not in ("_body",)} if "_http" not in res else res
        md = res.get("metadata") or {}
        url = res.get("video_url") or res.get("url") or md.get("url") or (res.get("output") or {}).get("url") if isinstance(res.get("output"), (dict, type(None))) else None
        if url and t["status"] in ("completed", "succeeded", "success", "done"):
            out = P / "clips" / f"{sid}.mp4"
            urllib.request.urlretrieve(url, out); t["file"] = str(out)
        print(sid, t["status"], t.get("progress"), "→", t.get("file", ""), "" if t["status"] not in ("failed","error") else json.dumps(res, ensure_ascii=False)[:300])
    save()

elif cmd == "wait":
    while True:
        pend=[k for k,t in state.items() if t.get("id") and not t.get("file") and t.get("status") not in ("failed","error")]
        if not pend: break
        for sid in pend:
            t=state[sid]; res=call("/v1/videos/"+t["id"]); t["status"]=res.get("status"); t["last"]=res
            md=res.get("metadata") or {}
            url=res.get("video_url") or res.get("url") or md.get("url")
            if url and t["status"] in ("completed","succeeded","success","done"):
                out=P/"clips"/f"{sid}.mp4"; urllib.request.urlretrieve(url,out); t["file"]=str(out)
            print(sid,t["status"],res.get("progress"),t.get("file",""),flush=True)
        save(); time.sleep(20)
    print("ALL DONE", json.dumps({k:(t.get("status"),t.get("file")) for k,t in state.items()},ensure_ascii=False))
