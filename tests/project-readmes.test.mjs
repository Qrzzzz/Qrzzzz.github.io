import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CONTENT_FORMAT, importProjectReadme } from "../scripts/lib/project-readmes.mjs";

const SHA = "b".repeat(40);
const IMPORTED_AT = "2026-08-19T00:00:00.000Z";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "project-readme-"));
  writeFileSync(
    path.join(root, "README.md"),
    `<div align="center">\n\n# Demo Project\n\n### Demo tagline\n\n</div>\n\n---\n\n` +
    `![Preview](./assets/preview.png)\n\n[English](./README.en.md)\n\n* Item\n`
  );
  mkdirSync(path.join(root, "assets"));
  writeFileSync(path.join(root, "assets/preview.png"), "fixture");
  writeFileSync(path.join(root, "index.html"), "<title>Demo</title>");
  return root;
}

test("imports a README into a commit-bound in-site project page", () => {
  const root = fixture();
  const output = path.join(root, "output/index.md");
  const project = {
    slug: "demo",
    repository: "Qrzzzz/demo",
    title: "Demo Project",
    description: "Demo description.",
    summary: "Demo summary.",
    status: "stable",
    statusLabel: "稳定版",
    statusEvidence: "Demo tagline",
    sourcePath: "README.md",
    homepage: "https://example.com"
  };
  try {
    const entry = importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT });
    const page = readFileSync(output, "utf8");
    assert.equal(entry.sourceMode, "readme");
    assert.equal(entry.statusEvidence, "Demo tagline");
    assert.match(page, new RegExp(`^contentFormat: "${CONTENT_FORMAT}"$`, "m"));
    assert.match(page, new RegExp(`^sourceCommit: "${SHA}"$`, "m"));
    assert.match(page, /本页由上游同步/);
    assert.match(page, new RegExp(`raw\.githubusercontent\.com/Qrzzzz/demo/${SHA}/assets/preview\.png`));
    assert.match(page, new RegExp(`github\.com/Qrzzzz/demo/blob/${SHA}/README\.en\.md`));
    assert.match(page, /^- Item$/m);
    assert.match(page, new RegExp(`github\.com/Qrzzzz/demo/commit/${SHA}`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("uses an explicit, non-README fallback only while README is absent", () => {
  const root = fixture();
  rmSync(path.join(root, "README.md"));
  const output = path.join(root, "output/index.md");
  const project = {
    slug: "demo",
    repository: "Qrzzzz/demo",
    title: "Demo Project",
    description: "Demo description.",
    summary: "Demo summary.",
    status: "online",
    statusLabel: "在线作品",
    statusEvidence: "<title>Demo</title>",
    sourcePath: "index.html",
    homepage: "https://example.com",
    readmeFallback: true
  };
  try {
    const entry = importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT });
    const page = readFileSync(output, "utf8");
    assert.equal(entry.sourceMode, "fallback");
    assert.match(page, /源仓库目前没有 README/);
    assert.match(page, /本页使用透明回退说明/);
    assert.match(page, /Demo summary\./);

    writeFileSync(path.join(root, "README.md"), "# Newly added");
    assert.throws(
      () => importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT }),
      /已新增 README\.md/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when upstream no longer supports the configured status label", () => {
  const root = fixture();
  const output = path.join(root, "output/index.md");
  const project = {
    slug: "demo",
    repository: "Qrzzzz/demo",
    title: "Demo Project",
    description: "Demo description.",
    summary: "Demo summary.",
    status: "stable",
    statusLabel: "稳定版",
    statusEvidence: "Current stable version: 2.0",
    sourcePath: "README.md",
    homepage: "https://example.com"
  };
  try {
    assert.throws(
      () => importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT }),
      /已不再包含状态依据/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("wires all project sync and check scripts into deployment", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
  const navigationCheck = readFileSync("scripts/check-site-navigation.mjs", "utf8");
  assert.equal(packageJson.scripts["docs:pull"], "node scripts/pull-project-docs.mjs");
  assert.equal(packageJson.scripts["docs:check"], "node scripts/check-project-docs.mjs");
  assert.match(workflow, /name: Pull project documentation\s+run: npm run docs:pull/);
  assert.doesNotMatch(workflow, /Checkout lyrics-card-generator docs/);
  assert.match(navigationCheck, /"\/second-glow\/"/);
  assert.match(navigationCheck, /"\/AI-slop-site\/"/);
});
