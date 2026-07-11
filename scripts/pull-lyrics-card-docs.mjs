import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { importLyricsCardDocs } from "./lib/lyrics-card-docs.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheRoot = path.join(repositoryRoot, ".cache/lyrics-card-generator");
const remote = "https://github.com/Qrzzzz/lyrics-card-generator.git";

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error || result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`Git 命令失败：git ${args.join(" ")}${detail ? `\n${detail}` : ""}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

try {
  if (!existsSync(path.join(cacheRoot, ".git"))) {
    console.log(`[docs:pull] 首次创建稀疏缓存：${cacheRoot}`);
    git(["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", "main", remote, cacheRoot]);
  } else {
    console.log("[docs:pull] 更新现有上游缓存。");
    git(["-C", cacheRoot, "fetch", "origin", "main", "--depth", "1", "--prune"]);
    git(["-C", cacheRoot, "checkout", "--force", "-B", "main", "FETCH_HEAD"]);
  }
  git(["-C", cacheRoot, "sparse-checkout", "set", "docs"]);
  const commitSha = git(["-C", cacheRoot, "rev-parse", "HEAD"], { capture: true });
  const manifest = importLyricsCardDocs({
    sourceRoot: path.join(cacheRoot, "docs"),
    outputRoot: path.join(repositoryRoot, "docs/projects/lyrics-card-generator/docs"),
    commitSha
  });
  console.log(
    `[docs:pull] 完成：${manifest.commit.slice(0, 8)}，${manifest.markdownCount} 个 Markdown 文件，` +
    `${manifest.routes.length} 条路由。`
  );
} catch (error) {
  console.error(
    `[docs:pull] 无法同步 Qrzzzz/lyrics-card-generator 的 docs/。` +
    `请检查网络、Git 和 GitHub 可用性。\n${error instanceof Error ? error.message : error}`
  );
  process.exit(1);
}
