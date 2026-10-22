import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm --prefix ../backend run dev",
      url: "http://127.0.0.1:5100/api/health",
      env: {
        PORT: "5100",
        MONGODB_URI: "",
        NODE_ENV: "development",
        JWT_SECRET: "isolated-playwright-test-secret-0000000000000000",
      },
      timeout: 60000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 3100 --strictPort",
      url: "http://127.0.0.1:3100",
      env: { QUIKZ_API_TARGET: "http://127.0.0.1:5100" },
      timeout: 60000,
    },
  ],
});
