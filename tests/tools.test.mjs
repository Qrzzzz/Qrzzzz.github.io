import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tools = readFileSync("docs/tools/index.md", "utf8");

test("opens the independently deployed password generator outside the VitePress router", () => {
  assert.match(
    tools,
    /href="https:\/\/qrzzzz\.github\.io\/password-generator\/" target="_self"/
  );
});
