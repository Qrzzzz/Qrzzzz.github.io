import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const script of ["pull-lyrics-card-docs.mjs", "pull-project-readmes.mjs"]) {
  const result = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", script)], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
