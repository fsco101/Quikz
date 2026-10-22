import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    pool: "forks",
    env: { MONGODB_URI: "" },
    hookTimeout: 30000,
    testTimeout: 15000,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
