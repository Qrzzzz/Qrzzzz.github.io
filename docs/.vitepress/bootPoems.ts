import { createHash } from "node:crypto";
import type { Plugin } from "vite";
import { sitePoems } from "./theme/sitePoems.mjs";

const source = JSON.stringify(sitePoems);
export const bootPoemsPath = `/assets/loading-poems.${createHash("sha256").update(source).digest("hex").slice(0, 12)}.json`;

export function bootPoems(): Plugin {
  return {
    name: "site-boot-poems",
    apply: (_config, env) => env.command === "serve" || !env.isSsrBuild,
    configureServer(server) {
      server.middlewares.use(bootPoemsPath, (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(source);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: bootPoemsPath.slice(1), source });
    }
  };
}
