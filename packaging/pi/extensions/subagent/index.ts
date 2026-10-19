import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const OUTPUT_CAP = 50 * 1024;
const STDERR_CAP = 10 * 1024;
const KILL_GRACE_MS = 5000;
// ADR-13 §Decision: Stop delegation two levels deep
const DEPTH_LIMIT = 2;

function delegateDepth(env: NodeJS.ProcessEnv): number {
	const value = env.TRF_DELEGATE_DEPTH ?? "";
	return /^\d+$/.test(value) ? Number(value) : 0;
}

function piInvocation(args: string[]): { command: string; args: string[] } {
	const script = process.argv[1];
	if (script && !script.startsWith("/$bunfs/") && fs.existsSync(script)) {
		return { command: process.execPath, args: [script, ...args] };
	}
	return { command: "pi", args };
}

function text(message: any): string {
	return (message?.content ?? [])
		.filter((c: any) => c.type === "text")
		.map((c: any) => c.text)
		.join("\n");
}

export default function (pi: ExtensionAPI) {
	const depth = delegateDepth(process.env);
	// ADR-13 §Decision: Stop delegation two levels deep
	if (depth >= DEPTH_LIMIT) return;
	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description: [
			"Dispatch a subagent: run a task in a separate pi process with a fresh context, and return its final reply.",
			"Use it wherever a skill says to dispatch a subagent.",
			"The subagent sees nothing of this conversation, so the prompt must carry everything it needs.",
		].join(" "),
		parameters: Type.Object({
			description: Type.Optional(Type.String({ description: "A few words saying what the subagent is for" })),
			prompt: Type.String({ minLength: 1, description: "The complete prompt for the subagent" }),
		}),

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const args = ["--mode", "json", "-p", "--no-session"];
			if (ctx.model) args.push("--model", `${ctx.model.provider}/${ctx.model.id}`);
			if (ctx.thinkingLevel) args.push("--thinking", ctx.thinkingLevel);

			const messages: any[] = [];
			let stderr = "";
			let spawnError: string | undefined;
			let aborted = false;
			const usage = {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			};

			const promptDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-subagent-"));
			const promptFile = path.join(promptDir, "prompt.md");
			try {
				await fs.promises.writeFile(promptFile, params.prompt, { encoding: "utf-8", mode: 0o600 });
				args.push("--", `@${promptFile}`, "Carry out the task in the file above. It is your whole prompt.");

				const code = await new Promise<number | null>((resolve) => {
					const { command, args: argv } = piInvocation(args);
					const proc = spawn(command, argv, {
						cwd: ctx.cwd,
						// ADR-13 §Decision: Stop delegation two levels deep
						env: { ...process.env, TRF_DELEGATE_DEPTH: String(depth + 1) },
						shell: false,
						stdio: ["ignore", "pipe", "pipe"],
					});
					let buffer = "";
					const line = (l: string) => {
						if (!l.startsWith("{")) return;
						let event: any;
						try {
							event = JSON.parse(l);
						} catch {
							return;
						}
						if (event.type === "message_end" && event.message?.role === "assistant") {
							messages.push(event.message);
							const u = event.message.usage;
							if (u) {
								for (const k of ["input", "output", "cacheRead", "cacheWrite", "totalTokens"] as const) usage[k] += u[k] || 0;
								for (const k of ["input", "output", "cacheRead", "cacheWrite", "total"] as const) usage.cost[k] += u.cost?.[k] || 0;
							}
						}
					};
					proc.stdout.on("data", (d) => {
						buffer += d.toString();
						const lines = buffer.split("\n");
						buffer = lines.pop() ?? "";
						lines.forEach(line);
					});
					proc.stderr.on("data", (d) => {
						stderr = (stderr + d.toString()).slice(-STDERR_CAP);
					});
					proc.on("close", (c) => {
						line(buffer);
						resolve(c);
					});
					proc.on("error", (e) => {
						spawnError = e.message;
						resolve(1);
					});
					if (signal) {
						const kill = () => {
							aborted = true;
							proc.kill("SIGTERM");
							setTimeout(() => {
								if (proc.exitCode === null && proc.signalCode === null) proc.kill("SIGKILL");
							}, KILL_GRACE_MS).unref();
						};
						if (signal.aborted) kill();
						else signal.addEventListener("abort", kill, { once: true });
					}
				});

				if (aborted || signal?.aborted) throw new Error("The subagent was aborted");
				const last = messages.at(-1);
				if (spawnError) throw new Error(`The subagent could not start: ${spawnError}`);
				if (code !== 0 || !last || last.stopReason === "error" || last.stopReason === "aborted") {
					throw new Error(last?.errorMessage ?? `The subagent exited ${code ?? "on a signal"}: ${stderr.slice(-2000)}`);
				}
				const reply = text(last);
				return {
					content: [{ type: "text", text: reply.length > OUTPUT_CAP ? `${reply.slice(0, OUTPUT_CAP)}\n[truncated]` : reply }],
					details: { description: params.description, turns: messages.length },
					usage,
				};
			} finally {
				await fs.promises.rm(promptDir, { recursive: true, force: true });
			}
		},
	});
}
