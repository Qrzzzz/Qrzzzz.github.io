import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateLibraryContent } from "./lib/content-library.mjs";
export * from "./lib/content-library.mjs";

function main() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = validateLibraryContent(repositoryRoot);
  if (result.errors.length) {
    throw new Error(
      `Library 内容元数据校验失败：\n${result.errors.map((error) => `- ${error}`).join("\n")}`
    );
  }

  console.log(
    `[docs:content-check] 通过：${result.records.length} 项 Library 内容元数据有效，URL 无重复。`
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
