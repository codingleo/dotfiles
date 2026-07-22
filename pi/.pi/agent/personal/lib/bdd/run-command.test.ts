import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import {
	greenCoversRed,
	runCommand,
	validateGreenResult,
	validateRedResult,
} from "./run-command.ts";

function fakeSpawn(exitCode: number, stdout = "", stderr = "", opts?: { error?: Error }) {
	return (() => {
		const ee = new EventEmitter() as EventEmitter & {
			stdout: EventEmitter;
			stderr: EventEmitter;
			kill: () => void;
			pid: number;
		};
		ee.stdout = new EventEmitter();
		ee.stderr = new EventEmitter();
		ee.pid = 12345;
		ee.kill = () => {
			ee.emit("close", 124);
		};
		queueMicrotask(() => {
			if (opts?.error) {
				ee.emit("error", opts.error);
				return;
			}
			if (stdout) ee.stdout.emit("data", stdout);
			if (stderr) ee.stderr.emit("data", stderr);
			ee.emit("close", exitCode);
		});
		return ee;
	}) as unknown as typeof import("node:child_process").spawn;
}

describe("runCommand", () => {
	test("captures failure summary", async () => {
		const result = await runCommand({
			cwd: process.cwd(),
			command: "false",
			spawnImpl: fakeSpawn(1, "expected true\n", "error line\n"),
		});
		expect(result.exitCode).toBe(1);
		expect(result.summary).toMatch(/FAIL/);
	});

	test("captures pass", async () => {
		const result = await runCommand({
			cwd: process.cwd(),
			command: "true",
			spawnImpl: fakeSpawn(0, "ok\n"),
		});
		expect(result.exitCode).toBe(0);
		expect(result.summary).toMatch(/PASS/);
	});
});

describe("validateRedResult / validateGreenResult", () => {
	test("red requires non-zero real failure", () => {
		expect(
			validateRedResult({
				exitCode: 0,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "PASS",
			}).ok,
		).toBe(false);
		expect(
			validateRedResult({
				exitCode: 1,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "FAIL",
			}).ok,
		).toBe(true);
	});

	test("red rejects timeout 124", () => {
		expect(
			validateRedResult({
				exitCode: 124,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "TIMEOUT",
				timedOut: true,
			}).ok,
		).toBe(false);
		expect(
			validateRedResult({
				exitCode: 124,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "TIMEOUT",
			}).ok,
		).toBe(false);
	});

	test("red rejects command not found 127 and spawn errors", () => {
		expect(
			validateRedResult({
				exitCode: 127,
				command: "missing",
				stdout: "",
				stderr: "",
				summary: "not found",
			}).ok,
		).toBe(false);
		expect(
			validateRedResult({
				exitCode: 1,
				command: "x",
				stdout: "",
				stderr: "",
				summary: "SPAWN",
				spawnError: true,
			}).ok,
		).toBe(false);
	});

	test("green requires zero and rejects infra", () => {
		expect(
			validateGreenResult({
				exitCode: 1,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "FAIL",
			}).ok,
		).toBe(false);
		expect(
			validateGreenResult({
				exitCode: 0,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "PASS",
			}).ok,
		).toBe(true);
		expect(
			validateGreenResult({
				exitCode: 124,
				command: "t",
				stdout: "",
				stderr: "",
				summary: "TIMEOUT",
				timedOut: true,
			}).ok,
		).toBe(false);
	});
});

describe("greenCoversRed", () => {
	test("same or prefix", () => {
		expect(greenCoversRed("bun test foo", "bun test foo")).toBe(true);
		expect(greenCoversRed("bun test foo", "bun test")).toBe(true);
		expect(greenCoversRed("bun test", "npm test")).toBe(false);
	});
});
