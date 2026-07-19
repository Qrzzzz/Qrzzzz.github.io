import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CONTENT_FORMAT,
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
const SYNC_NOTICE_TITLES = {
  "zh-CN": "本页由上游同步",
  "zh-TW": "本頁由上游同步",
  en: "This page is synchronized from upstream",
  fr: "Cette page est synchronisée depuis le dépôt source",
  ja: "このページは上流リポジトリと同期しています",
  es: "Esta página se sincroniza desde el repositorio de origen"
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
    path.join(root, "README.md"),
    `<div align="center">\n\n# 🎧 Lyrics Card Generator\n\n### 生成可用于分享的高质感歌词分享卡片\n\n` +
    `**Windows desktop · High-quality export**\n\n` +
    `<p><a href="./README.en.md">English</a> · <a href="https://qrzzzz.github.io/lyrics-card-generator/">在线版</a></p>\n\n` +
    `</div>\n\n---\n\n<img src="./public/app-icon.png" alt="icon" align="right" />\n\n` +
    `* 项目入口\n\n` +
    `## 下载\n\n[桌面文档](./docs/desktop.md) · [发布说明](./docs/releases/v1.0.0.zh-CN.md) · [许可证](./LICENSE)\n`
  );
  writeFileSync(
    path.join(source, "desktop.md"),
    "---\nlang: en\n---\n\n# Desktop\n\n* Desktop entry  \n\n[Examples](./examples.md)\n\n![Image](./assets/demo.png)\n\n[Maintenance manual](./assets/manual.pdf)\n\n<details><summary>Show desktop maintenance notes</summary>Content</details>\n"
  );
  writeFileSync(
    path.join(source, "examples.md"),
    "# 示例歌曲维护\n\n这里记录示例歌曲的维护流程与内容约束。\n\n[版本说明](./releases/)\n"
  );
  writeFileSync(
    path.join(source, "maintenance-plan.md"),
    "# Maintenance plan\n\nThis plan documents a small upstream maintenance change.\n"
  );
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
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.contentFormat, CONTENT_FORMAT);
    assert.equal(manifest.markdownCount, 34);
    assert.equal(manifest.assetCount, 2);
    assert.deepEqual(manifest.projectPage, {
      source: "README.md",
      route: "/projects/lyrics-card-generator/",
      output: "docs/projects/lyrics-card-generator/index.md"
    });
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
    assert.match(desktop, /^contentFormat: "site-writing-style@1"$/m);
    assert.match(desktop, /^lang: "en"$/m);
    assert.match(desktop, /^description: "Desktop: upstream maintenance documentation for Lyrics Card Generator\."$/m);
    assert.match(
      desktop,
      /<details>\n<summary>Show desktop maintenance notes<\/summary>\n\nContent\n\n<\/details>/
    );
    assert.match(desktop, /^- Desktop entry$/m);
    assert.doesNotMatch(desktop, /^- Desktop entry[ \t]+$/m);
    assert.match(desktop, /<\/nav>\n\n# Desktop/);
    assert.match(
      desktop,
      new RegExp(
        `# Desktop\\n\\n<aside class="project-docs-sync sync-notice"[\\s\\S]*?` +
        `${UPSTREAM_REPOSITORY}/blob/${SHA}/docs/desktop\\.md`
      )
    );
    assert.match(desktop, /it does not maintain a separate copy\. Make content changes upstream first\./);
    assert.match(desktop, /aria-current="page" lang="en">Desktop maintenance<\/span>/);
    assert.match(desktop, />项目文档<\/a>/);
    const maintenancePlan = readFileSync(path.join(output, "maintenance-plan/index.md"), "utf8");
    assert.match(maintenancePlan, /^lang: "en"$/m);
    assert.match(maintenancePlan, /This page is synchronized from upstream/);
    const examples = readFileSync(path.join(output, "examples/index.md"), "utf8");
    assert.match(examples, /^lang: "zh-CN"$/m);
    assert.match(examples, /本页由上游同步/);

    for (const language of RELEASE_LANGUAGES) {
      const release = readFileSync(path.join(output, `releases/v1.0.0.${language}/index.md`), "utf8");
      assert.match(release, new RegExp(`^lang: "${language}"$`, "m"));
      assert.equal((release.match(/^lang:/gm) ?? []).length, 1);
      assert.match(release, new RegExp(`sourcePath: "docs/releases/v1\\.0\\.0\\.${language}\\.md"`));
      assert.match(release, new RegExp(`sourceCommit: "${SHA}"`));
      assert.match(release, new RegExp(`^contentFormat: "${CONTENT_FORMAT}"$`, "m"));
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
      const syncNotice = release.match(/<aside class="project-docs-sync sync-notice"[\s\S]*?<\/aside>/)?.[0];
      assert.ok(syncNotice, `${language} release should explain the synchronization model`);
      assert.ok(syncNotice.includes(`lang="${language}"`));
      assert.ok(syncNotice.includes(SYNC_NOTICE_TITLES[language]));
      assert.ok(syncNotice.includes(`${UPSTREAM_REPOSITORY}/blob/${SHA}/docs/releases/v1.0.0.${language}.md`));
      assert.ok(release.indexOf("# v1.0.0") < release.indexOf("release-language-nav"));
      assert.ok(release.indexOf("release-language-nav") < release.indexOf("sync-notice"));
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
      assert.match(imported, new RegExp(`^contentFormat: "${CONTENT_FORMAT}"$`, "m"));
      assert.match(imported, /<aside class="project-docs-sync sync-notice"/);
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
    const projectPage = readFileSync(path.join(root, "index.md"), "utf8");
    assert.match(projectPage, /^sourcePath: "README\.md"$/m);
    assert.match(projectPage, new RegExp(`^sourceCommit: "${SHA}"$`, "m"));
    assert.match(projectPage, new RegExp(`^contentFormat: "${CONTENT_FORMAT}"$`, "m"));
    assert.match(projectPage, /# 🎧 Lyrics Card Generator/);
    assert.match(projectPage, /<p class="lead">生成可用于分享的高质感歌词分享卡片<\/p>/);
    assert.match(projectPage, /<p class="project-readme-summary">Windows desktop · High-quality export<\/p>/);
    assert.doesNotMatch(projectPage, /^\*\*Windows desktop/m);
    assert.match(projectPage, /class="project-readme-icon"/);
    assert.doesNotMatch(projectPage, /\salign="right"/);
    assert.match(projectPage, /^- 项目入口$/m);
    assert.match(
      projectPage,
      new RegExp(
        `<aside class="project-docs-sync sync-notice"[\\s\\S]*?` +
        `${UPSTREAM_REPOSITORY}/blob/${SHA}/README\\.md`
      )
    );
    assert.match(projectPage, /\/projects\/lyrics-card-generator\/docs\/desktop\//);
    assert.match(projectPage, /\/projects\/lyrics-card-generator\/docs\/releases\/v1\.0\.0\.zh-CN\//);
    assert.match(projectPage, new RegExp(`${UPSTREAM_REPOSITORY}/blob/${SHA}/README\.en\.md`));
    assert.match(projectPage, new RegExp(`${UPSTREAM_REPOSITORY}/blob/${SHA}/LICENSE`));
    assert.match(projectPage, new RegExp(`raw\.githubusercontent\.com/Qrzzzz/lyrics-card-generator/${SHA}/public/app-icon\.png`));
    assert.match(projectPage, /https:\/\/qrzzzz\.github\.io\/lyrics-card-generator\//);
    assert.doesNotMatch(projectPage, /<div align="center">/);
    const landing = readFileSync(path.join(output, "index.md"), "utf8");
    assert.match(landing, /^title: 项目文档$/m);
    assert.match(landing, new RegExp(`^contentFormat: "${CONTENT_FORMAT}"$`, "m"));
    assert.match(landing, /^# 项目文档$/m);
    assert.match(landing, /<p class="lead">这里集中展示该项目从源仓库同步的公开维护文档和版本资料。<\/p>/);
    assert.doesNotMatch(landing, /发布文档/);
    assert.match(landing, /href="\/projects\/lyrics-card-generator\/docs\/maintenance-plan\/"/);
    assert.match(landing, /class="content-index-title" lang="en">Maintenance plan<\/span>/);
    assert.match(landing, /<code>docs\/maintenance-plan\.md<\/code>/);
    assert.doesNotMatch(landing, /<a class="project-docs-card"[^>]*><strong>/);
    assert.match(landing, new RegExp(SHA.slice(0, 8)));

    const sourceBeforeRepeat = readFileSync(path.join(source, "desktop.md"), "utf8");
    const outputBeforeRepeat = readFileSync(path.join(output, "desktop/index.md"), "utf8");
    const projectBeforeRepeat = readFileSync(path.join(root, "index.md"), "utf8");
    const manifestBeforeRepeat = readFileSync(path.join(output, ".import-manifest.json"), "utf8");
    importLyricsCardDocs({
      sourceRoot: source,
      outputRoot: output,
      publicOutputRoot: publicOutput,
      commitSha: SHA,
      importedAt: IMPORTED_AT
    });
    assert.equal(readFileSync(path.join(source, "desktop.md"), "utf8"), sourceBeforeRepeat);
    assert.equal(readFileSync(path.join(output, "desktop/index.md"), "utf8"), outputBeforeRepeat);
    assert.equal(readFileSync(path.join(root, "index.md"), "utf8"), projectBeforeRepeat);
    assert.equal(readFileSync(path.join(output, ".import-manifest.json"), "utf8"), manifestBeforeRepeat);
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
