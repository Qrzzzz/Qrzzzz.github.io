"""Retain three deployed asset generations so cached HTML can still navigate."""
import json
import shutil
import sys
import tarfile
from pathlib import Path, PurePosixPath

dist = Path("docs/.vitepress/dist")
manifest_path = dist / "asset-generations.json"
current = [p.relative_to(dist).as_posix() for p in (dist / "assets").rglob("*") if p.is_file()]
generations = [{"commit": sys.argv[1], "files": current}]
archive = Path(".cache/previous-pages/artifact.tar")
if archive.exists():
    with tarfile.open(archive) as tar:
        members = {m.name.removeprefix("./"): m for m in tar.getmembers() if m.isfile()}
        previous_manifest = members.get("asset-generations.json")
        previous = json.load(tar.extractfile(previous_manifest)) if previous_manifest else [
            {"commit": "previous", "files": [name for name in members if name.startswith("assets/")]}
        ]
        generations.extend(previous[:2])
        for generation in generations[1:]:
            for name in generation["files"]:
                path = PurePosixPath(name)
                if not name.startswith("assets/") or ".." in path.parts:
                    raise ValueError(f"Unsafe asset path: {name}")
                target = dist / name
                if target.exists():
                    continue
                member = members.get(name)
                if member is None:
                    raise ValueError(f"Missing previous asset: {name}")
                target.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
manifest_path.write_text(json.dumps(generations), encoding="utf-8")
print(f"Retained {len(generations)} asset generations")
