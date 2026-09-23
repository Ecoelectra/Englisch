import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages under /<repo>/ as well as on any other host.
export default defineConfig({
  base: "./",
  build: { target: "safari15" },
});
