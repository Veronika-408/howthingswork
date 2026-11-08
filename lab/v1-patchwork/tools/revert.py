"""Put a space back to an earlier version kept by region_edit.py (art/src/<space>/v<N>/).
  /usr/bin/python3 lab/v1-patchwork/tools/revert.py <space> <N>
The current files are kept too (as the next version folder), so a revert can itself be undone."""
import json, shutil, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import V, load, save, snapshot

sid, n = sys.argv[1], int(sys.argv[2])
src = V / "art" / "src" / sid / f"v{n}"
old = json.loads((src / "regions.json").read_text())
cur = load(sid)
snapshot(sid, cur)
for f in [old["base"]["file"]] + [t["file"] for t in old.get("tiles", [])]:
    shutil.copy2(src / Path(f).name, V / f)
old["history"] = cur.get("history", []) + [{"version": cur.get("version", 1) + 1, "revert_to": n}]
old["version"] = cur.get("version", 1) + 1
old["regions"] = {**old.get("regions", {}), **cur.get("regions", {})}      # keep regions defined since
save(sid, old)
subprocess.run([sys.executable, str(V / "tools/build.py"), sid], check=True)
print(f"{sid}: back to v{n} (now version {old['version']})")
