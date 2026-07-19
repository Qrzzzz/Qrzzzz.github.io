import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const contentRoot = path.resolve("docs");
const excludedPrefixes = [
  ".vitepress/",
  "projects/lyrics-card-generator/",
  "public/"
];

function markdownFiles(root = contentRoot, current = root) {
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (excludedPrefixes.some((prefix) => relative === prefix.slice(0, -1) || relative.startsWith(prefix))) {
      continue;
    }
    if (entry.isDirectory()) files.push(...markdownFiles(root, absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(relative);
  }
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

function parsePage(relativePath) {
  const source = readFileSync(path.join(contentRoot, ...relativePath.split("/")), "utf8").replace(/\r\n?/g, "\n");
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert.ok(frontmatter, `${relativePath} 缺少完整 Frontmatter`);
  assert.doesNotMatch(frontmatter[1], /^\s*\n/, `${relativePath} 的 Frontmatter 起始处不应留空行`);
  return {
    relativePath,
    source,
    frontmatter: frontmatter[1],
    body: source.slice(frontmatter[0].length).trimStart()
  };
}

function frontmatterValue(frontmatter, key) {
  const raw = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
  return raw.replace(/^(["'])([\s\S]*)\1$/, "$2");
}

function fenceMarker(line) {
  return line.match(/^\s*(`{3,}|~{3,})/)?.[1] ?? null;
}

function outsideFences(content) {
  const output = [];
  let fence = null;
  for (const line of content.split("\n")) {
    const marker = fenceMarker(line);
    if (marker) {
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (marker[0] === fence.character && marker.length >= fence.length) fence = null;
      output.push("");
      continue;
    }
    output.push(fence ? "" : line);
  }
  assert.equal(fence, null, "Markdown 代码围栏没有闭合");
  return output.join("\n");
}

function headingLevels(content) {
  const levels = [];
  for (const line of outsideFences(content).split("\n")) {
    const markdownHeading = line.match(/^(#{1,6})\s+/);
    if (markdownHeading) levels.push(markdownHeading[1].length);
    for (const htmlHeading of line.matchAll(/<h([1-6])(?:\s|>)/gi)) {
      levels.push(Number(htmlHeading[1]));
    }
  }
  return levels;
}

const pages = markdownFiles().map(parsePage);
const home = pages.find((page) => page.relativePath === "index.md");
const contentPages = pages.filter((page) => page !== home);

test("keeps every hand-written page on the same title, summary and lead contract", () => {
  assert.ok(home);
  assert.equal(frontmatterValue(home.frontmatter, "layout"), "home");

  for (const page of contentPages) {
    const title = frontmatterValue(page.frontmatter, "title");
    const description = frontmatterValue(page.frontmatter, "description");
    assert.ok(title, `${page.relativePath} 缺少 title`);
    assert.ok(description, `${page.relativePath} 缺少 description`);
    assert.match(
      description,
      /(?:[。！？.!?]|……)$/,
      `${page.relativePath} 的 description 应使用一句完整的话`
    );
    assert.doesNotMatch(description, /\s\|\s/, `${page.relativePath} 的 description 不应使用标签式片段`);

    const unfenced = outsideFences(page.body);
    const markdownH1 = unfenced.match(/^#\s+(.+)$/gm) ?? [];
    const htmlH1 = unfenced.match(/<h1(?:\s|>)/gi) ?? [];
    assert.equal(markdownH1.length + htmlH1.length, 1, `${page.relativePath} 应有且仅有一个一级标题`);

    if (!page.relativePath.startsWith("excerpts/20")) {
      assert.equal(markdownH1.length, 1, `${page.relativePath} 应使用 Markdown 一级标题`);
      const visibleTitle = markdownH1[0].replace(/^#\s+/, "").trim();
      assert.equal(visibleTitle, title, `${page.relativePath} 的 title 与一级标题应一致`);
      assert.match(
        unfenced,
        /^#\s+.+\n\n<p class="lead">.+<\/p>/m,
        `${page.relativePath} 的一级标题后应有明确导语`
      );
    }
  }
});

test("keeps heading levels continuous and semantic formatting free of visual-only shortcuts", () => {
  for (const page of contentPages) {
    const levels = headingLevels(page.body);
    for (let index = 1; index < levels.length; index += 1) {
      assert.ok(
        levels[index] <= levels[index - 1] + 1,
        `${page.relativePath} 的标题层级从 h${levels[index - 1]} 跳到了 h${levels[index]}`
      );
    }

    const unfenced = outsideFences(page.body);
    for (const [pattern, message] of [
      [/<u\b/i, "不应使用下划线制造强调"],
      [/<strong class="content-index-title"/, "索引标题不应依赖 strong 模拟层级"],
      [/::: details/, "折叠内容应使用原生 details"],
      [/^title: 页面标题$/m, "不应保留标题占位文字"],
      [/一句话说明本页的主要内容/, "不应保留摘要占位文字"],
      [/正文从这里开始/, "不应保留正文占位文字"]
    ]) {
      assert.doesNotMatch(unfenced, pattern, `${page.relativePath} ${message}`);
    }
  }
});

test("uses language-labelled code fences and stable native details spacing", () => {
  for (const page of contentPages) {
    let fence = null;
    for (const line of page.body.split("\n")) {
      const marker = fenceMarker(line);
      if (!marker) continue;
      if (!fence) {
        const language = line.slice(line.indexOf(marker) + marker.length).trim();
        assert.ok(language, `${page.relativePath} 的代码块缺少语言标记`);
        fence = { character: marker[0], length: marker.length };
      } else if (marker[0] === fence.character && marker.length >= fence.length) {
        fence = null;
      }
    }
    assert.equal(fence, null, `${page.relativePath} 的代码围栏没有闭合`);

    const lines = outsideFences(page.body).split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (/<summary\b[^>]*>.*<\/summary>/i.test(lines[index])) {
        assert.equal(lines[index + 1], "", `${page.relativePath} 的 summary 后应保留空行`);
      }
      if (/^\s*<\/details>\s*$/i.test(lines[index])) {
        assert.equal(lines[index - 1], "", `${page.relativePath} 的 details 结束标签前应保留空行`);
      }
    }
  }
});

test("frames every copyable prompt without altering its Markdown payload", () => {
  const promptPages = contentPages.filter(
    (page) => page.relativePath.startsWith("prompt-collection/") && page.relativePath !== "prompt-collection/index.md"
  );
  assert.ok(promptPages.length > 0);
  for (const page of promptPages) {
    assert.match(page.body, /<p class="lead">[\s\S]+?<\/p>\n\n::: tip 使用方式\n/);
    assert.equal((page.body.match(/^```md$/gm) ?? []).length, 1, `${page.relativePath} 应保留一个可复制的 Markdown 提示词`);
  }
});
