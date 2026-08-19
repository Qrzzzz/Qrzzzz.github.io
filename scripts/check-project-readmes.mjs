import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CONTENT_FORMAT, MANIFEST_PATH, PROJECT_READMES } from "./lib/project-readmes.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repositoryRoot, MANIFEST_PATH);
const distRoot = path.join(repositoryRoot, "docs/.vitepress/dist");
const checkDist = process.argv.includes("--dist");
const failures = [];

function outputPath(slug) {
  return path.join(repositoryRoot, `docs/projects/${slug}/index.md`);
}

try {
  if (!existsSync(manifestPath)) throw new Error(`未找到同步清单：${MANIFEST_PATH}。请先运行 npm run docs:pull。`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1) failures.push("项目 README 清单 schemaVersion 无效。");
  if (manifest.contentFormat !== CONTENT_FORMAT) failures.push(`项目 README 清单没有使用 ${CONTENT_FORMAT}。`);
  if (!manifest.importedAt || Number.isNaN(Date.parse(manifest.importedAt))) failures.push("项目 README 清单缺少有效同步时间。");

  const expectedSlugs = PROJECT_READMES.map((project) => project.slug);
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  const actualSlugs = entries.map((entry) => entry.slug);
  if (JSON.stringify(actualSlugs) !== JSON.stringify(expectedSlugs)) {
    failures.push(`同步项目集合或顺序不正确：${actualSlugs.join(", ")}。`);
  }

  for (const project of PROJECT_READMES) {
    const entry = entries.find((candidate) => candidate.slug === project.slug);
    if (!entry) continue;
    if (!/^[0-9a-f]{40}$/i.test(entry.commit)) failures.push(`${project.slug} 的 commit SHA 无效。`);
    if (entry.sourcePath !== project.sourcePath) failures.push(`${project.slug} 的来源文件不正确。`);
    if (entry.status !== project.status || entry.statusLabel !== project.statusLabel) {
      failures.push(`${project.slug} 没有保留经 README 核对的项目状态。`);
    }
    if (entry.statusEvidence !== project.statusEvidence) failures.push(`${project.slug} 没有记录项目状态依据。`);
    const expectedMode = project.readmeFallback ? "fallback" : "readme";
    if (entry.sourceMode !== expectedMode) failures.push(`${project.slug} 的同步模式不正确。`);

    const pagePath = outputPath(project.slug);
    if (!existsSync(pagePath)) {
      failures.push(`${project.slug} 的生成页缺失。`);
      continue;
    }
    const page = readFileSync(pagePath, "utf8");
    if (!page.includes(`contentFormat: "${CONTENT_FORMAT}"`)) failures.push(`${project.slug} 缺少内容格式标记。`);
    if (!page.includes(`sourceCommit: "${entry.commit}"`)) failures.push(`${project.slug} 没有锁定清单中的 commit。`);
    if (!page.includes(`sourcePath: "${project.sourcePath}"`)) failures.push(`${project.slug} 没有记录来源文件。`);
    if (!page.includes('class="project-docs-sync sync-notice"')) failures.push(`${project.slug} 缺少同步说明。`);
    if (!page.includes('class="project-docs-sync import-source"')) failures.push(`${project.slug} 缺少来源信息。`);
    if (!page.includes(`https://github.com/${project.repository}/commit/${entry.commit}`)) {
      failures.push(`${project.slug} 没有链接到锁定的上游 commit。`);
    }
    if (project.readmeFallback && !page.includes("源仓库目前没有 README")) {
      failures.push(`${project.slug} 没有透明说明 README 缺失状态。`);
    }
    if (!project.readmeFallback && !page.includes("本页由上游同步")) {
      failures.push(`${project.slug} 没有声明 README 同步关系。`);
    }

    if (checkDist) {
      const builtPage = path.join(distRoot, `projects/${project.slug}/index.html`);
      if (!existsSync(builtPage)) failures.push(`构建产物缺少 ${entry.route}。`);
      else {
        const html = readFileSync(builtPage, "utf8");
        if (!html.includes(`https://github.com/${project.repository}/commit/${entry.commit}`)) {
          failures.push(`${entry.route} 的构建页没有保留锁定 commit 来源。`);
        }
      }
    }
  }

  const works = readFileSync(path.join(repositoryRoot, "docs/works/index.md"), "utf8");
  const projectsIndex = readFileSync(path.join(repositoryRoot, "docs/projects/index.md"), "utf8");
  for (const project of PROJECT_READMES) {
    const route = `/projects/${project.slug}/`;
    if (!works.includes(route)) failures.push(`作品页没有收录 ${project.slug}。`);
    if (!projectsIndex.includes(route)) failures.push(`项目索引没有收录 ${project.slug}。`);
  }
  if (works.includes("battery-safety-h5")) failures.push("作品页不应收录本轮排除的《失控之前》。");

  const generatedPaths = PROJECT_READMES.map((project) => `docs/projects/${project.slug}/index.md`);
  const tracked = execFileSync("git", ["ls-files", "--", ...generatedPaths], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  if (tracked) failures.push(`自动生成的项目页被 Git 跟踪：\n${tracked}`);

  if (failures.length) {
    console.error(`[projects:check] 失败（${failures.length} 项）：\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`[projects:check] 通过：${entries.length} 个项目页均锁定 README/回退来源与状态${checkDist ? "，构建路由完整" : ""}。`);
} catch (error) {
  console.error(`[projects:check] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
