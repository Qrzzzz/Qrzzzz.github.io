import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:4179", headless: true, trace: "retain-on-failure" },
  webServer: {
    command: "node node_modules/vitepress/bin/vitepress.js preview docs --port 4179",
    url: "http://127.0.0.1:4179", reuseExistingServer: false
  }
});
