import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Stub Next's `server-only` marker so pure modules import cleanly under vitest.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
