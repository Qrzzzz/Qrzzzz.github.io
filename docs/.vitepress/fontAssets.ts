import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

const source = readFileSync(new URL("./theme/styles/fonts.css", import.meta.url), "utf8");
export const fontStylesPath = `/assets/fonts.${createHash("sha256").update(source).digest("hex").slice(0, 12)}.css`;

export function fontAssets(): Plugin {
  return {
    name: "site-font-assets",
    apply: (_config, env) => env.command === "serve" || !env.isSsrBuild,
    configureServer(server) {
      server.middlewares.use(fontStylesPath, (_req, res) => {
        res.setHeader("Content-Type", "text/css");
        res.end(source);
      });
    },
    // VitePress selects the first emitted CSS asset as the main stylesheet.
    generateBundle: {
      order: "post",
      handler() {
        this.emitFile({ type: "asset", fileName: fontStylesPath.slice(1), source });
      }
    }
  };
}
