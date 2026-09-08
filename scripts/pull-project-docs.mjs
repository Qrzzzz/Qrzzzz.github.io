import { fileURLToPath } from "node:url";
import { syncProjectSnapshot } from "./lib/source-snapshot.mjs";
const args = process.argv.slice(2);
const lockIndex = args.indexOf("--lock");
if (lockIndex >= 0 && !args[lockIndex + 1]) throw new Error("--lock requires a snapshot file");
syncProjectSnapshot(fileURLToPath(new URL("..", import.meta.url)), {
  refresh: args.includes("--refresh"),
  ...(lockIndex >= 0 ? { lockFile: args[lockIndex + 1] } : {})
});
