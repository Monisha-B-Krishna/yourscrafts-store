import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a React Server environment; stub it for tests.
      "server-only": fileURLToPath(new URL("./tests/unit/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    // Integration tests read the local Supabase keys from .env.local
    // (and skip themselves when it isn't a local database).
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 20000,
  },
});
