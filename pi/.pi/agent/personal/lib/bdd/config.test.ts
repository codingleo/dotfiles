import { describe, expect, test } from "bun:test";
import {
	configTemplate,
	defaultConfig,
	inferCommandsFromPackage,
	loadConfigFromCwd,
	parseConfigJson,
} from "./config.ts";

describe("parseConfigJson", () => {
	test("applies defaults for missing fields", () => {
		const cfg = parseConfigJson({ version: 1, commands: { unitTest: "npm test" } });
		expect(cfg.commands.unitTest).toBe("npm test");
		expect(cfg.testPathPatterns.length).toBeGreaterThan(0);
		expect(cfg.version).toBe(1);
	});

	test("rejects non-objects", () => {
		expect(() => parseConfigJson(null)).toThrow();
	});
});

describe("inferCommandsFromPackage", () => {
	test("detects gherkin scripts with bun", () => {
		const c = inferCommandsFromPackage({
			packageManager: "bun@1.3.9",
			scripts: {
				test: "bun test",
				"gherkin:test": "bun run scripts/gherkin-run.ts",
				"gherkin:generate": "bun run scripts/gherkin-compile.ts",
				typecheck: "tsc -p .",
			},
		});
		expect(c.unitTest).toBe("bun test");
		expect(c.acceptanceTest).toBe("bun run gherkin:test");
		expect(c.acceptanceGenerate).toBe("bun run gherkin:generate");
		expect(c.typecheck).toBe("bun run typecheck");
	});

	test("npm fallback", () => {
		const c = inferCommandsFromPackage({
			packageManager: "npm@10",
			scripts: { test: "jest", "test:e2e": "playwright test" },
		});
		expect(c.unitTest).toBe("npm test --");
		expect(c.acceptanceTest).toBe("npm run test:e2e");
	});
});

describe("loadConfigFromCwd", () => {
	test("loads file config", () => {
		const files: Record<string, string> = {
			"/proj/.pi/bdd.json": JSON.stringify({
				version: 1,
				projectLabel: "demo",
				commands: { unitTest: "bun test path" },
			}),
		};
		const result = loadConfigFromCwd("/proj", {
			exists: (p) => p in files,
			read: (p) => files[p]!,
		});
		expect(result.source).toBe("file");
		expect(result.config.projectLabel).toBe("demo");
		expect(result.config.commands.unitTest).toBe("bun test path");
	});

	test("infers from package.json when no bdd.json", () => {
		const files: Record<string, string> = {
			"/proj/package.json": JSON.stringify({
				packageManager: "bun@1",
				scripts: { test: "bun test", "gherkin:test": "x" },
			}),
		};
		const result = loadConfigFromCwd("/proj", {
			exists: (p) => p in files,
			read: (p) => files[p]!,
		});
		expect(result.source).toBe("inferred");
		expect(result.config.commands.acceptanceTest).toBe("bun run gherkin:test");
	});

	test("defaults when empty tree", () => {
		const result = loadConfigFromCwd("/empty", {
			exists: () => false,
			read: () => {
				throw new Error("nope");
			},
		});
		expect(result.source).toBe("default");
		expect(result.config.commands.unitTest).toBe("bun test");
	});
});

describe("configTemplate", () => {
	test("is valid json", () => {
		const t = configTemplate({ unitTest: "pnpm test" });
		const parsed = JSON.parse(t);
		expect(parsed.commands.unitTest).toBe("pnpm test");
		expect(defaultConfig().version).toBe(1);
	});
});
