import { defineConfig } from "@playwright/test";
const port = Number(process.env.SITE_TEST_PORT || 4179);
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true, trace: "retain-on-failure" },
  webServer: {
    command: `node node_modules/vitepress/bin/vitepress.js preview docs --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`, reuseExistingServer: false
  }
});
