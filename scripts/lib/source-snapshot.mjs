import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import path from "node:path";
import { PROJECTS, PROJECT_READMES } from "../../docs/.vitepress/content/projects.mjs";
import { importLyricsCardDocs, GENERATED_ROOT, GENERATED_PUBLIC_ROOT, GENERATED_PROJECT_PAGE } from "./lyrics-card-docs.mjs";
import { importProjectReadme, writeProjectReadmeManifest, MANIFEST_PATH } from "./project-readmes.mjs";
import { replaceStagedPaths, removeStage } from "./staged-output.mjs";

export const SOURCE_LOCK = "sources.lock.json";
function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
  if (result.error || result.status !== 0) throw new Error(`git ${args.join(" ")}: ${(result.stderr || result.error?.message || "failed").trim()}`);
  return result.stdout.trim();
}

export function validateSourceLock(lock) {
  if (lock?.schemaVersion !== 1 || !Number.isFinite(Date.parse(lock.resolvedAt))) throw new Error("Invalid source snapshot metadata");
  if (!Array.isArray(lock.sources) || lock.sources.length !== PROJECTS.length) throw new Error("Incomplete source snapshot");
  PROJECTS.forEach((project, i) => {
    const entry = lock.sources[i];
    if (entry.slug !== project.slug || entry.repository !== project.repository || !/^[a-f0-9]{40}$/i.test(entry.commit)) throw new Error(`Invalid source snapshot: ${project.slug}`);
  });
  return lock;
}

export function readSourceLock(root, filename = SOURCE_LOCK) {
  return validateSourceLock(JSON.parse(readFileSync(path.resolve(root, filename), "utf8")));
}

export function syncProjectSnapshot(root, { refresh = false, lockFile = SOURCE_LOCK } = {}) {
  root = path.resolve(root);
  const lockPath = path.resolve(root, lockFile);
  let lock;
  if (refresh) {
    const sources = PROJECTS.map(project => {
      const remote = `https://github.com/${project.repository}.git`;
      const commit = git(["ls-remote", remote, "refs/heads/main"]).split(/\s/)[0];
      if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error(`No main commit: ${project.repository}`);
      return { slug: project.slug, repository: project.repository, commit };
    });
    let previous;
    if (existsSync(lockPath)) previous = readSourceLock(root, lockFile);
    lock = previous && JSON.stringify(previous.sources) === JSON.stringify(sources)
      ? previous : { schemaVersion: 1, resolvedAt: new Date().toISOString(), sources };
  } else lock = readSourceLock(root, lockFile);
  validateSourceLock(lock);

  const cacheParent = path.join(root, ".cache");
  mkdirSync(cacheParent, { recursive: true });
  const sources = new Map();
  // Resolve all refs first, then obtain exactly those commits. Updating a cache
  // never changes the last successful generated output.
  for (const entry of lock.sources) {
    const cache = path.join(cacheParent, entry.slug === "lyrics-card-generator" ? entry.slug : `project-readmes/${entry.slug}`);
    mkdirSync(cache, { recursive: true });
    if (!existsSync(path.join(cache, ".git"))) {
      git(["init", cache]);
      git(["-C", cache, "remote", "add", "origin", `https://github.com/${entry.repository}.git`]);
    }
    const expectedRemote = `https://github.com/${entry.repository}.git`;
    if (git(["-C", cache, "remote", "get-url", "origin"]) !== expectedRemote) throw new Error(`Unexpected cache remote: ${cache}`);
    try { git(["-C", cache, "cat-file", "-e", `${entry.commit}^{commit}`]); }
    catch { git(["-C", cache, "fetch", "origin", entry.commit, "--depth", "1"]); }
    git(["-C", cache, "sparse-checkout", "set", "--no-cone", "/README.md", entry.slug === "lyrics-card-generator" ? "/docs/" : `/${PROJECTS.find(p => p.slug === entry.slug).sourcePath}`]);
    git(["-C", cache, "checkout", "--detach", "--force", entry.commit]);
    sources.set(entry.slug, cache);
  }

  const stage = mkdtempSync(path.join(cacheParent, "snapshot-"));
  try {
    const output = relative => path.join(stage, relative);
    const lyrics = lock.sources[0];
    const manifest = importLyricsCardDocs({ sourceRoot: path.join(sources.get(lyrics.slug), "docs"), outputRoot: output(GENERATED_ROOT), publicOutputRoot: output(GENERATED_PUBLIC_ROOT), commitSha: lyrics.commit, importedAt: lock.resolvedAt });
    const entries = PROJECT_READMES.map(project => {
      const relative = `docs/projects/${project.slug}/index.md`;
      const source = lock.sources.find(entry => entry.slug === project.slug);
      return { ...importProjectReadme({ project, sourceRoot: sources.get(project.slug), outputRoot: output(relative), commitSha: source.commit, importedAt: lock.resolvedAt }), output: relative };
    });
    writeProjectReadmeManifest(entries, output(MANIFEST_PATH), lock.resolvedAt);
    writeFileSync(output(SOURCE_LOCK), `${JSON.stringify(lock, null, 2)}\n`);
    const outputs = [GENERATED_ROOT, GENERATED_PUBLIC_ROOT, GENERATED_PROJECT_PAGE, MANIFEST_PATH, ...entries.map(entry => entry.output)];
    const replacements = outputs.map(relative => ({ source: output(relative), target: path.join(root, relative) }));
    // The active snapshot is always installed with its generated output, even
    // when replaying a separately downloaded lock file.
    replacements.push({ source: output(SOURCE_LOCK), target: path.join(root, SOURCE_LOCK) });
    replaceStagedPaths(replacements);
    console.log(`[docs:pull] Locked snapshot ${lyrics.commit.slice(0, 8)}: ${manifest.routes.length} routes, ${entries.length} project pages.`);
    return lock;
  } finally { removeStage(stage, cacheParent); }
}
