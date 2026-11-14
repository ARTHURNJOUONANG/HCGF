import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Base SQLite dédiée aux tests (jamais dev.db ni Postgres).
    env: {
      DATABASE_URL: "file:./test.db",
      AUTH_SECRET: "test-secret-0123456789abcdef0123456789",
      NODE_ENV: "test",
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
