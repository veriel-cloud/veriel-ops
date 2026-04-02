import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "happy-dom",
		setupFiles: ["src/__tests__/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
