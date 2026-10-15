import assert from "node:assert/strict";
import test from "node:test";
import { randomReadingUrls, pickRandomReadingUrl } from "../docs/.vitepress/content/randomReading.mjs";

const items = [
  { kind: "article", url: "/notes/first.html" },
  { kind: "excerpt", url: "/excerpts/2026-10-15-02.html" },
  { kind: "article", url: "/notes/nested/" },
  { kind: "article", url: "/notes/first.html" },
  { kind: "prompt", url: "/prompt-collection/prompt.html" },
  { kind: "article", url: "/projects/project.html" },
  { kind: "article", url: "/notes/" },
  { kind: "excerpt", url: "/excerpts/index.html" }
];

test("Random includes unique note/excerpt chapters and excludes collection indexes and other areas", () => {
  assert.deepEqual(randomReadingUrls(items), [
    "/notes/first.html", "/excerpts/2026-10-15-02.html", "/notes/nested/"
  ]);
});

test("Random can select every eligible chapter and avoids the previous reading across canonical URL forms", () => {
  assert.equal(pickRandomReadingUrl(items, "", () => 0), "/notes/first.html");
  assert.equal(pickRandomReadingUrl(items, "", () => .5), "/excerpts/2026-10-15-02.html");
  assert.equal(pickRandomReadingUrl(items, "", () => .999), "/notes/nested/");
  assert.equal(pickRandomReadingUrl(items, "/notes/first#heading", () => 0), "/excerpts/2026-10-15-02.html");
  assert.equal(pickRandomReadingUrl(items, "/notes/nested/?q=test", () => .999), "/excerpts/2026-10-15-02.html");
  assert.equal(pickRandomReadingUrl([items[0]], items[0].url), items[0].url);
  assert.equal(pickRandomReadingUrl([]), undefined);
});
