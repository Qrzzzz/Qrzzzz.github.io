import assert from "node:assert/strict";
import test from "node:test";
import { PROJECTS } from "../docs/.vitepress/content/projects.mjs";
test("keeps the independent tool in the shared catalog", () => {
  const tools = PROJECTS.filter(project => project.kind === "tool");
  assert.equal(tools.length, 1);
  assert.equal(tools[0].homepage, "https://qrzzzz.github.io/password-generator/");
});
