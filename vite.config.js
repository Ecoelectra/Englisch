import { defineConfig } from "vite";

// The Mistral SDK loads its optional OpenTelemetry tracing via dynamic import and treats a failed
// import as "tracing off". OpenTelemetry isn't installed here, so these modules are replaced with
// one that fails to load – exactly the SDK's no-telemetry path.
const OTEL_MODULES = /@mistralai\/mistralai\/.*extra\/observability\/(otel|telemetry)\.js$/;
const DISABLED = "\0mistral-telemetry-disabled";

function disableMistralTelemetry() {
  return {
    name: "disable-mistral-telemetry",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer?.includes("@mistralai")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved && OTEL_MODULES.test(resolved.id) ? DISABLED : null;
    },
    load(id) {
      if (id === DISABLED) return 'throw new Error("Telemetry disabled");';
    },
  };
}

// Relative base so the build works on GitHub Pages under /<repo>/ as well as on any other host.
export default defineConfig({
  base: "./",
  build: { target: "safari15" },
  plugins: [disableMistralTelemetry()],
});
