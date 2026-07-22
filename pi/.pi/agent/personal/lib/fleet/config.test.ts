import { describe, expect, test } from "bun:test";
import { ensureSubagentCaps, loadFleetUserConfigDetailed, resolveCaps } from "./config.ts";

describe("ensureSubagentCaps", () => {
	test("warn-only by default does not write", () => {
		const files: Record<string, string> = {
			"/cfg.json": JSON.stringify({
				asyncWidget: false,
				toolDescriptionMode: "compact",
				parallel: { concurrency: 6, maxTasks: 12 },
			}),
		};
		const result = ensureSubagentCaps(
			{ maxTasks: 48, concurrency: 16, globalConcurrencyLimit: 48, maxSubagentSpawnsPerSession: 0 },
			"/cfg.json",
			{
				exists: (p) => p in files,
				read: (p) => files[p]!,
				write: (p, b) => {
					files[p] = b;
				},
				mkdir: () => {},
			},
			{ allowWrite: false },
		);
		expect(result.wrote).toBe(false);
		expect(result.needsRaise).toBe(true);
		expect(result.effectiveMaxTasks).toBe(12);
		expect(JSON.parse(files["/cfg.json"]!).asyncWidget).toBe(false);
		expect(JSON.parse(files["/cfg.json"]!).toolDescriptionMode).toBe("compact");
	});

	test("allowWrite raises low caps and preserves other keys", () => {
		const files: Record<string, string> = {
			"/cfg.json": JSON.stringify({
				asyncWidget: false,
				toolDescriptionMode: "compact",
				parallel: { concurrency: 6, maxTasks: 12 },
			}),
		};
		const result = ensureSubagentCaps(
			{ maxTasks: 48, concurrency: 16, globalConcurrencyLimit: 48, maxSubagentSpawnsPerSession: 0 },
			"/cfg.json",
			{
				exists: (p) => p in files,
				read: (p) => files[p]!,
				write: (p, b) => {
					files[p] = b;
				},
				mkdir: () => {},
				isSymlink: () => false,
			},
			{ allowWrite: true },
		);
		expect(result.wrote).toBe(true);
		const parsed = JSON.parse(files["/cfg.json"]!);
		expect(parsed.parallel.maxTasks).toBe(48);
		expect(parsed.parallel.concurrency).toBe(16);
		expect(parsed.toolDescriptionMode).toBe("compact");
		// must NOT force asyncWidget
		expect(parsed.asyncWidget).toBe(false);
	});

	test("does not lower higher existing caps", () => {
		const files: Record<string, string> = {
			"/cfg.json": JSON.stringify({
				parallel: { concurrency: 32, maxTasks: 100 },
				globalConcurrencyLimit: 100,
			}),
		};
		const result = ensureSubagentCaps(
			{ maxTasks: 48, concurrency: 16, globalConcurrencyLimit: 48, maxSubagentSpawnsPerSession: 0 },
			"/cfg.json",
			{
				exists: (p) => p in files,
				read: (p) => files[p]!,
				write: (p, b) => {
					files[p] = b;
				},
				mkdir: () => {},
				isSymlink: () => false,
			},
			{ allowWrite: true },
		);
		expect(result.config.parallel).toMatchObject({ maxTasks: 100, concurrency: 32 });
	});

	test("refuses to overwrite corrupt JSON", () => {
		const files: Record<string, string> = { "/cfg.json": "{not json" };
		const result = ensureSubagentCaps(
			{ maxTasks: 48, concurrency: 16, globalConcurrencyLimit: 48, maxSubagentSpawnsPerSession: 0 },
			"/cfg.json",
			{
				exists: (p) => p in files,
				read: (p) => files[p]!,
				write: () => {
					throw new Error("should not write");
				},
				mkdir: () => {},
			},
			{ allowWrite: true },
		);
		expect(result.wrote).toBe(false);
		expect(result.error).toMatch(/corrupt|Refusing/i);
		expect(files["/cfg.json"]).toBe("{not json");
	});

	test("never auto-clears positive spawn cap to unlimited", () => {
		const files: Record<string, string> = {
			"/cfg.json": JSON.stringify({
				maxSubagentSpawnsPerSession: 5,
				parallel: { maxTasks: 48, concurrency: 16 },
			}),
		};
		ensureSubagentCaps(
			{ maxTasks: 48, concurrency: 16, globalConcurrencyLimit: 48, maxSubagentSpawnsPerSession: 0 },
			"/cfg.json",
			{
				exists: (p) => p in files,
				read: (p) => files[p]!,
				write: (p, b) => {
					files[p] = b;
				},
				mkdir: () => {},
				isSymlink: () => false,
			},
			{ allowWrite: true },
		);
		expect(JSON.parse(files["/cfg.json"]!).maxSubagentSpawnsPerSession).toBe(5);
	});
});

describe("loadFleetUserConfigDetailed", () => {
	test("reports parse errors", () => {
		const r = loadFleetUserConfigDetailed("/f.json", {
			exists: (p) => p === "/f.json",
			read: () => "{bad",
		});
		expect(r.config).toEqual({});
		expect(r.parseError).toBeTruthy();
	});
});

describe("resolveCaps", () => {
	test("defaults", () => {
		expect(resolveCaps({}).maxTasks).toBe(48);
	});
});
