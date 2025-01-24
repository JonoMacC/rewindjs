import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Vitest configuration options
    globals: true,
    environment: "node",
    // Add any other options you need
  },
});
