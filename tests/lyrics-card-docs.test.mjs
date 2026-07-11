import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  PRODUCTION_BASELINE,
  UPSTREAM_REPOSITORY,
  importLyricsCardDocs
} from "../scripts/lib/lyrics-card-docs.mjs";

const SHA = "a".repeat(40);
const IMPORTED_AT = "2026-07-11T00:00:00.000Z";
const RELEASE_LANGUAGES = ["zh-CN", "zh-TW", "en", "fr", "ja", "es"];
const LANGUAGE_NAMES = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  fr: "Français",
  ja: "日本語",
  es: "Español"
};
const LANGUAGE_PREFIXES = {
  "zh-CN": "语言：",
  "zh-TW": "語言：",
  en: "Languages:",
  fr: "Langues :",
  ja: "言語：",
  es: "Idiomas:"
};
const RELEASE_NAV_LABELS = {
  "zh-CN": (version) => `${version} 的版本语言`,
  "zh-TW": (version) => `${version} 的版本語言`,
  en: (version) => `Languages for ${version}`,
  fr: (version) => `Langues de ${version}`,
  ja: (version) => `${version} の言語`,
  es: (version) => `Idiomas de ${version}`
};

function writeReleaseSet(source, version) {
  for (const language of RELEASE_LANGUAGES) {
    const languageLine = RELEASE_LANGUAGES.map((candidate) => candidate === language
      ? LANGUAGE_NAMES[candidate]
      : `[${LANGUAGE_NAMES[candidate]}](./${version}.${candidate}.md)`)
      .join(" · ");
    const upstreamFrontmatter = version === "v1.0.0" && language === "en"
      ? "---\nlang: wrong-language\ncustomFlag: retained\n---\n\n"
      : "";
    const heading = version === "v1.0.0" && language === "en"
      ? ""
      : `# ${version} · ${LANGUAGE_NAMES[language]}\n\n`;
    writeFileSync(
      path.join(source, `releases/${version}.${language}.md`),
      `${upstreamFrontmatter}${LANGUAGE_PREFIXES[language]} ${languageLine}\n\n${heading}## Changes\n`
    );
  }
}

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "lyrics-card-docs-"));
  const source = path.join(root, "docs");
  const output = path.join(root, "output");
  const publicOutput = path.join(root, "public-output");
  mkdirSync(path.join(source, "releases"), { recursive: true });
  mkdirSync(path.join(source, "assets"), { recursive: true });
  writeFileSync(
    path.join(source, "desktop.md"),
    "# Desktop\n\n[示例](./examples.md)\n\n![图](./assets/demo.png)\n\n[维护手册](./assets/manual.pdf)\n\n<details><summary>详情</summary>内容</details>\n"
  );
  writeFileSync(path.join(source, "examples.md"), "# Examples\n\n[版本](./releases/)\n");
  writeFileSync(
    path.join(source, "releases/README.md"),
    "# 多语言发布说明规范\n\n[v1 中文](./v1.0.0.zh-CN.md) · [v1 English](./v1.0.0.en.md)\n"
  );
  writeReleaseSet(source, "v1.0.0");
  writeReleaseSet(source, "v1.10.0");
  writeReleaseSet(source, "v2.0.0-rc.2");
  writeReleaseSet(source, "v2.0.0-rc.10");
  writeReleaseSet(source, "v2.0.0");
  writeFileSync(path.join(source, "assets/demo.png"), "fixture");
  writeFileSync(path.join(source, "assets/manual.pdf"), "%PDF-1.4 fixture");
  return { root, source, output, publicOutput };
}

test("imports stable routes, links, assets and metadata", () => {
  const { root, source, output, publicOutput } = fixture();
  try {
    const manifest = importLyricsCardDocs({
      sourceRoot: source,
      outputRoot: output,
      publicOutputRoot: publicOutput,
      commitSha: SHA,
      importedAt: IMPORTED_AT
    });
    assert.equal(manifest.markdownCount, 33);
    assert.equal(manifest.assetCount, 2);
    assert.deepEqual(
      manifest.assets.map((entry) => entry.output),
      [
        "projects/lyrics-card-generator/docs/assets/demo.png",
        "projects/lyrics-card-generator/docs/assets/manual.pdf"
      ]
    );
    assert.ok(manifest.routes.some((entry) => entry.route.endsWith("/desktop/")));
    assert.ok(manifest.routes.some((entry) => entry.route.endsWith("/releases/v1.0.0.en/")));
    const desktop = readFileSync(path.join(output, "desktop/index.md"), "utf8");
    assert.match(desktop, /\/projects\/lyrics-card-generator\/docs\/examples\//);
    assert.match(desktop, /\/projects\/lyrics-card-generator\/docs\/assets\/demo\.png/);
    assert.match(desktop, /\/projects\/lyrics-card-generator\/docs\/assets\/manual\.pdf/);
    assert.match(desktop, /<details><summary>详情<\/summary>/);
    assert.match(desktop, /<\/nav>\n\n# Desktop/);
    assert.match(desktop, /aria-current="page" lang="zh-CN">桌面端维护<\/span>/);
    assert.match(desktop, />项目文档<\/a>/);

    for (const language of RELEASE_LANGUAGES) {
      const release = readFileSync(path.join(output, `releases/v1.0.0.${language}/index.md`), "utf8");
      assert.match(release, new RegExp(`^lang: "${language}"$`, "m"));
      assert.equal((release.match(/^lang:/gm) ?? []).length, 1);
      assert.match(release, new RegExp(`sourcePath: "docs/releases/v1\\.0\\.0\\.${language}\\.md"`));
      assert.match(release, new RegExp(`sourceCommit: "${SHA}"`));
      assert.match(release, /<nav class="docs-breadcrumb" aria-label="面包屑" lang="zh-CN">/);
      assert.match(
        release,
        new RegExp(`<span aria-current="page" lang="${language}">[^<]+<\\/span>`)
      );
      const navigation = release.match(/<nav class="release-language-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
      assert.ok(navigation, `${language} release should contain a language navigation`);
      assert.ok(navigation.includes(`aria-label="${RELEASE_NAV_LABELS[language]("v1.0.0")}"`));
      assert.ok(navigation.includes(`lang="${language}"`));
      assert.equal((navigation.match(/class="release-language-nav__link"/g) ?? []).length, 6);
      assert.equal((navigation.match(/aria-current="page"/g) ?? []).length, 1);
      const currentLink = navigation.match(/<a\b[^>]*aria-current="page"[^>]*>/)?.[0];
      assert.ok(currentLink?.includes(`lang="${language}"`));
      assert.ok(currentLink?.includes(`hreflang="${language}"`));
      for (const candidate of RELEASE_LANGUAGES) {
        assert.ok(navigation.includes(`lang="${candidate}" hreflang="${candidate}"`));
      }
      const sourceInfo = release.match(/<footer class="project-docs-sync import-source"[\s\S]*?<\/footer>/)?.[0];
      assert.ok(sourceInfo, `${language} release should expose visible source information`);
      assert.ok(sourceInfo.includes(`lang="${language}"`));
      assert.ok(sourceInfo.includes(`href="${UPSTREAM_REPOSITORY}"`));
      assert.ok(sourceInfo.includes(`href="${UPSTREAM_REPOSITORY}/commit/${SHA}"`));
      assert.ok(sourceInfo.includes(`<code>${SHA.slice(0, 8)}</code>`));
      assert.ok(sourceInfo.includes(`<time datetime="${IMPORTED_AT}">${IMPORTED_AT}</time>`));
      assert.match(release, /<\/footer>\n$/);
    }

    for (const entry of manifest.routes.filter((route) => route.source)) {
      const imported = readFileSync(path.join(output, ...entry.output.split("/")), "utf8");
      assert.match(
        imported,
        new RegExp(
          `<footer class="project-docs-sync import-source"[\\s\\S]*?` +
          `href="${UPSTREAM_REPOSITORY}/commit/${SHA}"[\\s\\S]*?<time datetime="${IMPORTED_AT}">`
        ),
        `${entry.source} should render source provenance at the page tail`
      );
      assert.match(imported, /<\/footer>\n$/);
    }

    const englishRelease = readFileSync(path.join(output, "releases/v1.0.0.en/index.md"), "utf8");
    assert.match(englishRelease, /# v1\.0\.0 · English/);
    assert.match(englishRelease, /^customFlag: retained$/m);
    assert.doesNotMatch(englishRelease, /^Languages?:/m);
    const releaseIndex = readFileSync(path.join(output, "releases/index.md"), "utf8");
    assert.match(releaseIndex, /^title: "版本说明"$/m);
    assert.match(releaseIndex, /^# 版本说明$/m);
    assert.match(releaseIndex, /^## 多语言发布说明规范$/m);
    assert.doesNotMatch(releaseIndex, /^# 多语言发布说明规范$/m);
    assert.match(releaseIndex, /class="release-archive__summary"/);
    assert.match(releaseIndex, /已从上游同步 <strong>5<\/strong> 个版本、<strong>30<\/strong> 篇/);
    assert.match(releaseIndex, /<ol class="release-archive" aria-label="全部版本说明" lang="zh-CN">/);
    assert.equal((releaseIndex.match(/class="release-archive__row"/g) ?? []).length, 5);
    assert.equal((releaseIndex.match(/class="release-archive__version"/g) ?? []).length, 5);
    const archiveLanguageGroups = releaseIndex.match(/<nav class="release-archive__languages"[^>]*>[\s\S]*?<\/nav>/g) ?? [];
    assert.equal(archiveLanguageGroups.length, 5);
    for (const group of archiveLanguageGroups) {
      assert.equal((group.match(/class="release-archive__language"/g) ?? []).length, 6);
      assert.equal((group.match(/aria-current="page"/g) ?? []).length, 0);
      assert.ok(group.includes('lang="zh-CN"'));
    }
    assert.equal((releaseIndex.match(/class="release-archive__language"/g) ?? []).length, 30);
    assert.doesNotMatch(releaseIndex, /^\|\s*版本\s*\|/m);
    assert.ok(releaseIndex.indexOf("v2.0.0</strong>") < releaseIndex.indexOf("v2.0.0-rc.10</strong>"));
    assert.ok(releaseIndex.indexOf("v2.0.0-rc.10</strong>") < releaseIndex.indexOf("v2.0.0-rc.2</strong>"));
    assert.ok(releaseIndex.indexOf("v2.0.0-rc.2</strong>") < releaseIndex.indexOf("v1.10.0</strong>"));
    assert.ok(releaseIndex.indexOf("v2.0.0") < releaseIndex.indexOf("v1.10.0"));
    assert.ok(releaseIndex.indexOf("v1.10.0") < releaseIndex.indexOf("v1.0.0"));
    assert.ok(releaseIndex.indexOf("release-archive") < releaseIndex.indexOf("## 多语言发布说明规范"));
    for (const language of RELEASE_LANGUAGES) {
      assert.match(
        releaseIndex,
        new RegExp(`class="release-archive__language"[^>]+lang="${language}" hreflang="${language}"[^>]+aria-label="v2\\.0\\.0 · ${LANGUAGE_NAMES[language]}"`)
      );
    }
    assert.ok(!existsSync(path.join(output, "assets/demo.png")));
    assert.ok(existsSync(path.join(publicOutput, "assets/demo.png")));
    assert.ok(existsSync(path.join(publicOutput, "assets/manual.pdf")));
    const landing = readFileSync(path.join(output, "index.md"), "utf8");
    assert.match(landing, /^title: 项目文档$/m);
    assert.match(landing, /^# 项目文档$/m);
    assert.doesNotMatch(landing, /发布文档/);
    assert.match(landing, new RegExp(SHA.slice(0, 8)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("requires exactly the six supported release languages before replacing output", () => {
  const { root, source, output, publicOutput } = fixture();
  try {
    importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA });
    const previousManifest = readFileSync(path.join(output, ".import-manifest.json"), "utf8");

    rmSync(path.join(source, "releases/v1.0.0.ja.md"));
    assert.throws(
      () => importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA }),
      (error) => {
        assert.match(error.message, /每个版本必须恰有 zh-CN, zh-TW, en, fr, ja, es 六种语言/);
        assert.match(error.message, /版本 v1\.0\.0 缺少 Release Note 语言：ja/);
        return true;
      }
    );
    assert.equal(readFileSync(path.join(output, ".import-manifest.json"), "utf8"), previousManifest);

    writeReleaseSet(source, "v1.0.0");
    writeFileSync(path.join(source, "releases/v1.0.0.de.md"), "# Deutsch\n");
    assert.throws(
      () => importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA }),
      /版本 v1\.0\.0 包含不支持的 Release Note 语言：de/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("pins explicit production anti-shrink baselines", () => {
  assert.deepEqual(PRODUCTION_BASELINE, {
    referenceCommit: "01166666",
    minimumReleasePages: 234,
    minimumImportedRoutes: 238,
    minimumReachablePages: 246
  });
});

test("a repeated import removes deleted pages and discovers new Markdown", () => {
  const { root, source, output, publicOutput } = fixture();
  try {
    writeFileSync(path.join(source, "releases/obsolete.md"), "# Obsolete\n");
    importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA });
    assert.ok(existsSync(path.join(output, "releases/obsolete/index.md")));
    assert.ok(existsSync(path.join(publicOutput, "assets/manual.pdf")));
    rmSync(path.join(source, "releases/obsolete.md"));
    rmSync(path.join(source, "assets/manual.pdf"));
    writeFileSync(
      path.join(source, "desktop.md"),
      "# Desktop\n\n[示例](./examples.md)\n\n![图](./assets/demo.png)\n"
    );
    writeFileSync(path.join(source, "releases/new-page.md"), "# New page\n");
    importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA });
    assert.ok(!existsSync(path.join(output, "releases/obsolete")));
    assert.ok(!existsSync(path.join(publicOutput, "assets/manual.pdf")));
    assert.ok(existsSync(path.join(output, "releases/new-page/index.md")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails explicitly for unresolved links and duplicate routes", () => {
  const first = fixture();
  try {
    writeFileSync(path.join(first.source, "desktop.md"), "# Desktop\n\n[missing](./missing.md)\n");
    assert.throws(
      () => importLyricsCardDocs({
        sourceRoot: first.source,
        outputRoot: first.output,
        publicOutputRoot: first.publicOutput,
        commitSha: SHA
      }),
      /无法解析链接/
    );
    assert.ok(!existsSync(first.output));
    assert.ok(!existsSync(first.publicOutput));
  } finally {
    rmSync(first.root, { recursive: true, force: true });
  }

  const second = fixture();
  try {
    mkdirSync(path.join(second.source, "foo"));
    writeFileSync(path.join(second.source, "foo.md"), "# Foo\n");
    writeFileSync(path.join(second.source, "foo/README.md"), "# Duplicate Foo\n");
    assert.throws(
      () => importLyricsCardDocs({
        sourceRoot: second.source,
        outputRoot: second.output,
        publicOutputRoot: second.publicOutput,
        commitSha: SHA
      }),
      /路由重名/
    );
  } finally {
    rmSync(second.root, { recursive: true, force: true });
  }
});
