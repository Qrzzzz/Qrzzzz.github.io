import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSourceLock } from "./lib/source-snapshot.mjs";
import { outputFiles } from "./lib/site-navigation.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(root, "docs/.vitepress/dist");
const sourceLock = readSourceLock(root);
const lyrics = JSON.parse(readFileSync(path.join(root, "docs/projects/lyrics-card-generator/docs/.import-manifest.json"), "utf8"));
const readmes = JSON.parse(readFileSync(path.join(root, ".cache/project-readmes-manifest.json"), "utf8"));
for (const source of sourceLock.sources) {
  const actual = source.slug === "lyrics-card-generator" ? lyrics : readmes.entries.find(entry => entry.slug === source.slug);
  if (actual?.commit !== source.commit) throw new Error(`Generated content differs from source lock: ${source.slug}`);
}
const hash = data => createHash("sha256").update(data).digest("hex");
const contentHash = createHash("sha256");
for (const file of outputFiles(dist).filter(file => path.basename(file) !== "build-info.json").sort()) {
  contentHash.update(path.relative(dist, file).replaceAll("\\", "/") + "\0" + hash(readFileSync(file)) + "\n");
}
const importerHash = createHash("sha256");
for (const file of outputFiles(path.join(root, "scripts/lib")).sort()) importerHash.update(readFileSync(file));
const info = {
  schemaVersion: 1,
  siteCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  sourceLock,
  lockfileSha256: hash(readFileSync(path.join(root, "package-lock.json"))),
  importerSha256: importerHash.digest("hex"),
  contentSha256: contentHash.digest("hex"),
  node: process.version,
  buildTimestamp: new Date().toISOString(),
  workflowRun: process.env.GITHUB_RUN_ID ?? null
};
writeFileSync(path.join(dist, "build-info.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`[docs:provenance] ${info.contentSha256}; ${sourceLock.sources.length} pinned upstream commits.`);
