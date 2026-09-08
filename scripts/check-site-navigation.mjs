import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkSiteNavigation } from "./lib/site-navigation.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const requiredRoutes = JSON.parse(readFileSync(path.join(root, "config/public-routes.json"), "utf8"));
const result = checkSiteNavigation(path.resolve(root, process.argv[2] || "docs/.vitepress/dist"), { requiredRoutes });
if (result.errors.length) throw new Error(result.errors.slice(0, 35).join("\n") + (result.errors.length > 35 ? "\nAdditional failures: " + (result.errors.length - 35) : ""));
console.log(`[docs:navigation-test] 通过：${result.pages} 个页面可达；公开 URL、片段和本地资源有效。`);
