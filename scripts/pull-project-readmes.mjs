import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PROJECT_READMES, importProjectReadme, writeProjectReadmeManifest } from "./lib/project-readmes.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheRoot = path.join(repositoryRoot, ".cache/project-readmes");

function git(args) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`Git 命令失败：git ${args.join(" ")}${detail ? `\n${detail}` : ""}`);
  }
  return result.stdout.trim();
}

try {
  const importedAt = new Date().toISOString();
  const entries = [];
  for (const project of PROJECT_READMES) {
    const projectCache = path.join(cacheRoot, project.slug);
    const remote = `https://github.com/${project.repository}.git`;
    if (!existsSync(path.join(projectCache, ".git"))) {
      console.log(`[projects:pull] 首次创建缓存：${project.repository}`);
      git(["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", "main", remote, projectCache]);
    } else {
      console.log(`[projects:pull] 更新缓存：${project.repository}`);
      git(["-C", projectCache, "fetch", "origin", "main", "--depth", "1", "--prune"]);
      git(["-C", projectCache, "checkout", "--force", "-B", "main", "FETCH_HEAD"]);
    }
    git(["-C", projectCache, "sparse-checkout", "set", "--no-cone", project.sourcePath]);
    const commitSha = git(["-C", projectCache, "rev-parse", "HEAD"]);
    entries.push(importProjectReadme({
      project,
      sourceRoot: projectCache,
      outputRoot: path.join(repositoryRoot, `docs/projects/${project.slug}/index.md`),
      commitSha,
      importedAt
    }));
  }
  writeProjectReadmeManifest(entries, path.join(repositoryRoot, ".cache/project-readmes-manifest.json"), importedAt);
  console.log(`[projects:pull] 完成：${entries.length} 个项目页。`);
} catch (error) {
  console.error(`[projects:pull] 同步失败。\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
