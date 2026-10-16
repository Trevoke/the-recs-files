import { spawn } from "node:child_process";
import * as fs from "node:fs";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const OUTPUT_CAP = 50 * 1024;

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
			prompt: Type.String({ description: "The complete prompt for the subagent" }),
		}),

		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const args = ["--mode", "json", "-p", "--no-session"];
			if (ctx.model) args.push("--model", `${ctx.model.provider}/${ctx.model.id}`);
			if (ctx.thinkingLevel) args.push("--thinking", ctx.thinkingLevel);
			args.push("--", params.prompt);

			const messages: any[] = [];
			let stderr = "";
			const usage = {
				input: 0,
				output: 0,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 0,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			};

			const code = await new Promise<number>((resolve) => {
				const { command, args: argv } = piInvocation(args);
				const proc = spawn(command, argv, { cwd: ctx.cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
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
				proc.stderr.on("data", (d) => (stderr += d.toString()));
				proc.on("close", (c) => {
					line(buffer);
					resolve(c ?? 0);
				});
				proc.on("error", () => resolve(1));
				signal?.addEventListener("abort", () => proc.kill("SIGTERM"), { once: true });
			});

			if (signal?.aborted) throw new Error("The subagent was aborted");
			const last = messages.at(-1);
			if (code !== 0 || !last || last.stopReason === "error") {
				throw new Error(last?.errorMessage ?? `The subagent exited ${code}: ${stderr.slice(-2000)}`);
			}
			const reply = text(last);
			return {
				content: [{ type: "text", text: reply.length > OUTPUT_CAP ? `${reply.slice(0, OUTPUT_CAP)}\n[truncated]` : reply }],
				details: { description: params.description, turns: messages.length },
				usage,
			};
		},
	});
}
