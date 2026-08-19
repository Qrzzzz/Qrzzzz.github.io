import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forwardedArgs = process.argv.slice(2);

for (const script of ["check-lyrics-card-docs.mjs", "check-project-readmes.mjs"]) {
  const result = spawnSync(process.execPath, [path.join(repositoryRoot, "scripts", script), ...forwardedArgs], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
