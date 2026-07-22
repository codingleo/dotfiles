/**
 * Run a shell command and capture a truncated summary for red/green evidence.
 */

import { spawn } from "node:child_process";

export interface RunCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	summary: string;
	command: string;
	/** True when the runner hit timeoutMs */
	timedOut?: boolean;
	/** True when spawn failed (missing binary, etc.) */
	spawnError?: boolean;
}

export interface RunCommandOptions {
	cwd: string;
	command: string;
	timeoutMs?: number;
	env?: NodeJS.ProcessEnv;
	maxSummaryChars?: number;
	spawnImpl?: typeof spawn;
}

function summarizeOutput(
	exitCode: number,
	stdout: string,
	stderr: string,
	max: number,
	flags: { timedOut?: boolean; spawnError?: boolean },
): string {
	const combined = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
	const lines = combined.split("\n").filter(Boolean);
	const interesting = lines.filter((l) =>
		/(fail|error|✗|×|assert|expected|received|not ok|FAIL)/i.test(l),
	);
	const pick = (interesting.length > 0 ? interesting : lines).slice(-12).join(" | ");
	let head: string;
	if (flags.timedOut) head = `TIMEOUT (exit ${exitCode})`;
	else if (flags.spawnError) head = `SPAWN_ERROR (exit ${exitCode})`;
	else if (exitCode === 0) head = "PASS";
	else head = `FAIL (exit ${exitCode})`;
	const body = pick.replace(/\s+/g, " ").trim();
	const text = body ? `${head}: ${body}` : head;
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
	const {
		cwd,
		command,
		timeoutMs = 120_000,
		env = process.env,
		maxSummaryChars = 400,
		spawnImpl = spawn,
	} = options;

	return new Promise((resolve) => {
		const child = spawnImpl(command, {
			cwd,
			env,
			shell: true,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let settled = false;
		let timedOut = false;
		let spawnError = false;

		const finish = (exitCode: number) => {
			if (settled) return;
			settled = true;
			resolve({
				exitCode,
				stdout,
				stderr,
				command,
				timedOut,
				spawnError,
				summary: summarizeOutput(exitCode, stdout, stderr, maxSummaryChars, {
					timedOut,
					spawnError,
				}),
			});
		};

		const timer = setTimeout(() => {
			timedOut = true;
			try {
				// Kill the whole process group when possible
				if (typeof child.pid === "number" && child.pid > 0) {
					try {
						process.kill(-child.pid, "SIGTERM");
					} catch {
						child.kill("SIGTERM");
					}
				} else {
					child.kill("SIGTERM");
				}
			} catch {
				// ignore
			}
			finish(124);
		}, timeoutMs);

		child.stdout?.on("data", (chunk: Buffer | string) => {
			stdout += String(chunk);
			if (stdout.length > 200_000) stdout = stdout.slice(-100_000);
		});
		child.stderr?.on("data", (chunk: Buffer | string) => {
			stderr += String(chunk);
			if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
		});
		child.on("error", (err) => {
			clearTimeout(timer);
			spawnError = true;
			stderr += `\n${err.message}`;
			finish(1);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			finish(code ?? 1);
		});
	});
}

const INFRA_EXIT_CODES = new Set([124, 126, 127]);

/**
 * Red must be a real failing test run — not pass, timeout, or missing binary.
 */
export function validateRedResult(result: RunCommandResult): { ok: boolean; reason: string } {
	if (result.timedOut || result.exitCode === 124) {
		return {
			ok: false,
			reason:
				`Red rejected: command timed out (exit 124). Fix the hang or raise timeout; timeouts are not valid failing tests.\n` +
				`Command: ${result.command}\n${result.summary}`,
		};
	}
	if (result.spawnError) {
		return {
			ok: false,
			reason:
				`Red rejected: command failed to spawn (missing binary / shell error).\n` +
				`Command: ${result.command}\n${result.summary}`,
		};
	}
	if (result.exitCode === 127 || result.exitCode === 126) {
		return {
			ok: false,
			reason:
				`Red rejected: infrastructure exit ${result.exitCode} (command not found / not executable).\n` +
				`Command: ${result.command}\n${result.summary}`,
		};
	}
	if (result.exitCode === 0) {
		return {
			ok: false,
			reason:
				`Expected a failing test run for red, but command exited 0.\n` +
				`Command: ${result.command}\n${result.summary}`,
		};
	}
	// Soft warn on empty output for non-zero (still accept — could be tap/quiet runner)
	return { ok: true, reason: result.summary };
}

export function validateGreenResult(result: RunCommandResult): { ok: boolean; reason: string } {
	if (result.timedOut || result.exitCode === 124) {
		return {
			ok: false,
			reason:
				`Green rejected: command timed out.\nCommand: ${result.command}\n${result.summary}`,
		};
	}
	if (result.spawnError || INFRA_EXIT_CODES.has(result.exitCode)) {
		return {
			ok: false,
			reason:
				`Green rejected: infrastructure failure (exit ${result.exitCode}).\n` +
				`Command: ${result.command}\n${result.summary}`,
		};
	}
	if (result.exitCode !== 0) {
		return {
			ok: false,
			reason:
				`Expected a passing test run for green, but command exited ${result.exitCode}.\n` +
				`Command: ${result.command}\n${result.summary}`,
		};
	}
	return { ok: true, reason: result.summary };
}

/** True if green command is "same or broader" than red (simple heuristic). */
export function greenCoversRed(redCommand: string, greenCommand: string): boolean {
	const r = redCommand.trim();
	const g = greenCommand.trim();
	if (!r || !g) return false;
	if (r === g) return true;
	// green is prefix of red with extra args dropped, or red starts with green
	if (r.startsWith(g)) return true;
	// same base runner
	const r0 = r.split(/\s+/)[0];
	const g0 = g.split(/\s+/)[0];
	return Boolean(r0 && g0 && r0 === g0);
}
