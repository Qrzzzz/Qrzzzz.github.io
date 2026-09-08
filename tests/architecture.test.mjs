import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import MiniSearch from "minisearch";
import { parseFrontmatterDocument, isCalendarDate } from "../docs/.vitepress/content/frontmatter.mjs";
import { tokenizeSearch, rankSearchResults, createSearchLoader } from "../docs/.vitepress/content/search.mjs";
import { checkSiteNavigation } from "../scripts/lib/site-navigation.mjs";
import { replaceStagedPaths, removeStage } from "../scripts/lib/staged-output.mjs";
import { importLyricsCardDocs } from "../scripts/lib/lyrics-card-docs.mjs";
import { PROJECTS } from "../docs/.vitepress/content/projects.mjs";
import { validateSourceLock } from "../scripts/lib/source-snapshot.mjs";

test("YAML comments, lists and multiline strings share one calendar-safe contract", () => {
  const { frontmatter, error } = parseFrontmatterDocument('---\ntitle: "A: B" # comment\ntags: [AI, Vue]\npublished: 2026-02-31\npreview: >-\n  first\n  second\n---\n');
  assert.equal(error, undefined);
  assert.equal(frontmatter.title, "A: B");
  assert.deepEqual(frontmatter.tags, ["AI", "Vue"]);
  assert.equal(frontmatter.preview, "first second");
  assert.equal(isCalendarDate(frontmatter.published), false);
  assert.equal(isCalendarDate("2024-02-29"), true);
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.ok(parseFrontmatterDocument("---\ntitle: A\ntitle: B\n---\n").error);
});

test("Chinese terms survive index serialization and ranking keeps different pages", () => {
  const options = { fields: ["title"], storeFields: ["title"], tokenize: tokenizeSearch };
  const index = new MiniSearch(options);
  index.addAll([{ id: "/article#title", title: "一个低占有欲公司的巨大野心" }, { id: "/excerpt", title: "公道世间唯白发" }]);
  const restored = MiniSearch.loadJSON(JSON.stringify(index), options);
  assert.equal(restored.search("野心")[0].id, "/article#title");
  assert.equal(restored.search("白发")[0].id, "/excerpt");
  const ranked = rankSearchResults([{ id: "/article#a", score: 10 }, { id: "/article#b", score: 9 }, { id: "/other", score: 8 }]);
  assert.deepEqual(ranked.map(result => result.id), ["/article#a", "/other"]);
});

test("search loads once concurrently and retries a failed load", async () => {
  const load = createSearchLoader(); let attempts = 0;
  const fail = () => { attempts++; throw new Error("offline"); };
  await Promise.all([assert.rejects(load("root", fail)), assert.rejects(load("root", fail))]);
  assert.equal(attempts, 1);
  assert.equal(await load("root", () => { attempts++; return "index"; }), "index");
  assert.equal(await load("root", fail), "index");
  assert.equal(attempts, 2);
});

test("navigation rejects fragments, resources, unsupported aliases and removed public URLs", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "site-navigation-"));
  try {
    writeFileSync(path.join(root, "index.html"), '<a href="/page.html#missing">bad</a><a href="/page/">alias</a><img src="/missing.png"><a href="https://qrzzzz.github.io/second-glow/">external</a>');
    writeFileSync(path.join(root, "page.html"), '<h1 id="valid">Page</h1>');
    const errors = checkSiteNavigation(root, { requiredRoutes: ["/removed.html"] }).errors.join("\n");
    assert.match(errors, /Missing fragment/);
    assert.match(errors, /missing.png/);
    assert.match(errors, /Missing resource \/page\//);
    assert.match(errors, /Removed public URL/);
    assert.doesNotMatch(errors, /second-glow/);
    writeFileSync(path.join(root, "index.html"), '<a href="/page#valid">good</a>');
    assert.deepEqual(checkSiteNavigation(root).errors, []);
  } finally { removeStage(root, os.tmpdir()); }
});

test("failed multi-output installation restores every previous file", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "site-transaction-"));
  try {
    for (const name of ["a", "b", "new-a", "new-b"]) writeFileSync(path.join(root, name), name);
    let installs = 0;
    const rename = (from, to) => {
      if (from.includes("new-") && ++installs === 2) throw new Error("locked destination");
      renameSync(from, to);
    };
    assert.throws(() => replaceStagedPaths(["a", "b"].map(name => ({ source: path.join(root, "new-" + name), target: path.join(root, name) })), rename), /locked destination/);
    for (const name of ["a", "b"]) assert.equal(readFileSync(path.join(root, name), "utf8"), name);
  } finally { removeStage(root, os.tmpdir()); }
});

test("late Markdown failure keeps the previous successful import and manifest", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "site-import-"));
  try {
    const source = path.join(root, "upstream/docs"), output = path.join(root, "published/docs");
    mkdirSync(path.join(source, "releases"), { recursive: true });
    writeFileSync(path.join(root, "upstream/README.md"), "# Lyrics Card Generator\n");
    for (const file of ["desktop.md", "examples.md", "releases/README.md"]) writeFileSync(path.join(source, file), "# Document\n");
    const options = { sourceRoot: source, outputRoot: output, publicOutputRoot: path.join(root, "assets"), commitSha: "a".repeat(40) };
    importLyricsCardDocs(options);
    const before = readFileSync(path.join(output, ".import-manifest.json"), "utf8");
    const page = readFileSync(path.join(root, "published/index.md"), "utf8");
    writeFileSync(path.join(source, "desktop.md"), "# Desktop\n\n[bad](./missing.md)\n");
    assert.throws(() => importLyricsCardDocs(options), /missing.md/);
    assert.equal(readFileSync(path.join(output, ".import-manifest.json"), "utf8"), before);
    assert.equal(readFileSync(path.join(root, "published/index.md"), "utf8"), page);
  } finally { removeStage(root, os.tmpdir()); }
});

test("source snapshot rejects omitted projects and moving refs", () => {
  const lock = { schemaVersion: 1, resolvedAt: "2026-09-08T00:00:00Z", sources: PROJECTS.map(project => ({ slug: project.slug, repository: project.repository, commit: "a".repeat(40) })) };
  assert.equal(validateSourceLock(lock), lock);
  assert.throws(() => validateSourceLock({ ...lock, sources: lock.sources.slice(1) }), /Incomplete/);
  assert.throws(() => validateSourceLock({ ...lock, sources: lock.sources.map(source => ({ ...source, commit: "main" })) }), /Invalid/);
});
