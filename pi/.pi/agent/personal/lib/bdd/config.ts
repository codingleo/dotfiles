/**
 * Load / infer per-project BDD config. Works across repos without hardcoding
 * olhaminha.bio paths — projects opt in with `.pi/bdd.json` or get sensible defaults.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BddCommands, BddConfig } from "./types.ts";
import {
	DEFAULT_CONFIG_PATTERNS,
	DEFAULT_DOCS_PATTERNS,
	DEFAULT_FEATURE_PATTERNS,
	DEFAULT_IMPL_PATTERNS,
	DEFAULT_TEST_PATTERNS,
} from "./types.ts";

export const CONFIG_CANDIDATES = [".pi/bdd.json", "bdd.json", ".bdd-tdd.json"] as const;

export function defaultConfig(partial?: Partial<BddConfig> & { commands?: Partial<BddCommands> }): BddConfig {
	return {
		version: 1,
		enabledByDefault: partial?.enabledByDefault ?? false,
		strictGreenCoversRed: partial?.strictGreenCoversRed ?? true,
		featurePathPatterns: partial?.featurePathPatterns ?? [...DEFAULT_FEATURE_PATTERNS],
		testPathPatterns: partial?.testPathPatterns ?? [...DEFAULT_TEST_PATTERNS],
		implementationPathPatterns: partial?.implementationPathPatterns ?? [...DEFAULT_IMPL_PATTERNS],
		docsPathPatterns: partial?.docsPathPatterns ?? [...DEFAULT_DOCS_PATTERNS],
		configPathPatterns: partial?.configPathPatterns ?? [...DEFAULT_CONFIG_PATTERNS],
		alwaysAllowPathPatterns: partial?.alwaysAllowPathPatterns,
		projectLabel: partial?.projectLabel,
		commands: {
			unitTest: partial?.commands?.unitTest ?? "bun test",
			acceptanceTest: partial?.commands?.acceptanceTest,
			acceptanceGenerate: partial?.commands?.acceptanceGenerate,
			typecheck: partial?.commands?.typecheck,
		},
	};
}

export function parseConfigJson(raw: unknown): BddConfig {
	if (!raw || typeof raw !== "object") {
		throw new Error("bdd config must be a JSON object");
	}
	const o = raw as Record<string, unknown>;
	const commandsIn =
		o.commands && typeof o.commands === "object"
			? (o.commands as Record<string, unknown>)
			: {};

	const strArr = (v: unknown, fallback: string[]): string[] =>
		Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : fallback;

	const commands: BddCommands = {
		unitTest:
			typeof commandsIn.unitTest === "string" && commandsIn.unitTest.trim()
				? commandsIn.unitTest
				: "bun test",
		acceptanceTest:
			typeof commandsIn.acceptanceTest === "string" ? commandsIn.acceptanceTest : undefined,
		acceptanceGenerate:
			typeof commandsIn.acceptanceGenerate === "string"
				? commandsIn.acceptanceGenerate
				: undefined,
		typecheck: typeof commandsIn.typecheck === "string" ? commandsIn.typecheck : undefined,
	};

	return defaultConfig({
		enabledByDefault: o.enabledByDefault === true,
		strictGreenCoversRed: o.strictGreenCoversRed === false ? false : true,
		featurePathPatterns: strArr(o.featurePathPatterns, DEFAULT_FEATURE_PATTERNS),
		testPathPatterns: strArr(o.testPathPatterns, DEFAULT_TEST_PATTERNS),
		implementationPathPatterns: strArr(o.implementationPathPatterns, DEFAULT_IMPL_PATTERNS),
		docsPathPatterns: strArr(o.docsPathPatterns, DEFAULT_DOCS_PATTERNS),
		configPathPatterns: strArr(o.configPathPatterns, DEFAULT_CONFIG_PATTERNS),
		alwaysAllowPathPatterns: Array.isArray(o.alwaysAllowPathPatterns)
			? strArr(o.alwaysAllowPathPatterns, [])
			: undefined,
		projectLabel: typeof o.projectLabel === "string" ? o.projectLabel : undefined,
		commands,
	});
}

export interface PackageScripts {
	scripts?: Record<string, string>;
	packageManager?: string;
}

/** Infer runner commands from package.json scripts when no bdd.json exists. */
export function inferCommandsFromPackage(pkg: PackageScripts | null | undefined): BddCommands {
	const scripts = pkg?.scripts ?? {};
	const has = (name: string) => typeof scripts[name] === "string";

	let unitTest = "bun test";
	if (has("test")) {
		// Prefer package manager from packageManager field
		const pm = pkg?.packageManager?.split("@")[0];
		if (pm === "bun") unitTest = "bun test";
		else if (pm === "pnpm") unitTest = "pnpm test";
		else if (pm === "yarn") unitTest = "yarn test";
		else if (pm === "npm") unitTest = "npm test --";
		else if (existsOnPathHint("bun")) unitTest = "bun test";
		else unitTest = "npm test --";
	}

	const acceptanceTest = has("gherkin:test")
		? scriptRun(pkg, "gherkin:test")
		: has("test:acceptance")
			? scriptRun(pkg, "test:acceptance")
			: has("test:e2e")
				? scriptRun(pkg, "test:e2e")
				: undefined;

	const acceptanceGenerate = has("gherkin:generate")
		? scriptRun(pkg, "gherkin:generate")
		: has("gherkin:check")
			? scriptRun(pkg, "gherkin:check")
			: undefined;

	const typecheck = has("typecheck")
		? scriptRun(pkg, "typecheck")
		: has("tsc")
			? scriptRun(pkg, "tsc")
			: undefined;

	return { unitTest, acceptanceTest, acceptanceGenerate, typecheck };
}

function scriptRun(pkg: PackageScripts | null | undefined, script: string): string {
	const pm = pkg?.packageManager?.split("@")[0];
	if (pm === "bun") return `bun run ${script}`;
	if (pm === "pnpm") return `pnpm run ${script}`;
	if (pm === "yarn") return `yarn ${script}`;
	return `npm run ${script}`;
}

function existsOnPathHint(_bin: string): boolean {
	// Pure default — actual PATH checks happen at runtime in the extension if needed.
	return true;
}

export interface LoadConfigResult {
	config: BddConfig;
	source: "default" | "file" | "inferred";
	path?: string;
}

export function loadConfigFromCwd(
	cwd: string,
	io: {
		exists?: (p: string) => boolean;
		read?: (p: string) => string;
	} = {},
): LoadConfigResult {
	const exists = io.exists ?? existsSync;
	const read = io.read ?? ((p: string) => readFileSync(p, "utf8"));

	for (const rel of CONFIG_CANDIDATES) {
		const full = join(cwd, rel);
		if (!exists(full)) continue;
		try {
			const raw = JSON.parse(read(full)) as unknown;
			return { config: parseConfigJson(raw), source: "file", path: full };
		} catch (err) {
			throw new Error(
				`Failed to parse BDD config at ${full}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	// Infer from package.json
	const pkgPath = join(cwd, "package.json");
	if (exists(pkgPath)) {
		try {
			const pkg = JSON.parse(read(pkgPath)) as PackageScripts;
			const commands = inferCommandsFromPackage(pkg);
			return {
				config: defaultConfig({ commands }),
				source: "inferred",
				path: pkgPath,
			};
		} catch {
			// fall through
		}
	}

	return { config: defaultConfig(), source: "default" };
}

/** Template written by `/bdd init`. */
export function configTemplate(overrides?: Partial<BddCommands>): string {
	const cfg = defaultConfig({
		enabledByDefault: false,
		commands: {
			unitTest: overrides?.unitTest ?? "bun test",
			acceptanceTest: overrides?.acceptanceTest,
			acceptanceGenerate: overrides?.acceptanceGenerate,
			typecheck: overrides?.typecheck,
		},
		projectLabel: undefined,
	});
	return `${JSON.stringify(cfg, null, 2)}\n`;
}
