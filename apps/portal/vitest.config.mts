import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Unit tests for the application's pure modules (routing decisions, the content security policy,
// the copy lint and, from step 9, the directory reader and validator). Anything that talks to
// Supabase is covered by the pgTAP suite and the end-to-end suite instead.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
