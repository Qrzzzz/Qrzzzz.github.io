import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { importLyricsCardDocs } from "./lib/lyrics-card-docs.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceArgument = process.argv.indexOf("--source");
const sourceRoot = sourceArgument === -1
  ? process.env.LYRICS_CARD_DOCS_SOURCE ?? path.join(repositoryRoot, ".external/lyrics-card-generator/docs")
  : process.argv[sourceArgument + 1];

if (!sourceRoot) {
  console.error("[docs:import] --source 后缺少上游 docs 目录。");
  process.exit(1);
}

try {
  const manifest = importLyricsCardDocs({
    sourceRoot: path.resolve(repositoryRoot, sourceRoot),
    outputRoot: path.join(repositoryRoot, "docs/projects/lyrics-card-generator/docs"),
    publicOutputRoot: path.join(repositoryRoot, "docs/public/projects/lyrics-card-generator/docs"),
    commitSha: process.env.LYRICS_CARD_DOCS_SHA
  });
  console.log(
    `[docs:import] 已从 ${manifest.commit.slice(0, 8)} 导入 ${manifest.markdownCount} 个 Markdown 文件、` +
    `${manifest.assetCount} 个资源，生成 ${manifest.routes.length} 条路由。`
  );
} catch (error) {
  console.error(`[docs:import] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
