import fs from 'node:fs';
import path from 'node:path';
import { memoryFile } from '../../packaging/markers.mjs';
import { roleFile, root } from '../../packaging/render.mjs';
import { changedFiles, result } from './workspace.js';

function transcript(context) {
  const file = context.providerResponse?.metadata?.transcript;
  if (!file || !fs.existsSync(file)) throw new Error('the provider reported no transcript');
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('{'))
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
}

function calls(context) {
  return transcript(context).filter((e) => e.type === 'tool_execution_start' || e.type === 'tool_execution_end');
}

function claudeCode(context) {
  return context.providerResponse?.metadata?.harness === 'claude-code';
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A print-mode run is `claude -p --output-format stream-json --verbose`
function toolUses(context) {
  const all = transcript(context);
  const results = new Map(
    all
      .filter((e) => e.type === 'user' && Array.isArray(e.message?.content))
      .flatMap((e) => e.message.content)
      .filter((c) => c.type === 'tool_result')
      .map((c) => [c.tool_use_id, c]),
  );
  return all
    .filter((e) => e.type === 'assistant' && e.parent_tool_use_id == null)
    .flatMap((e) => (e.message?.content ?? []).filter((c) => c.type === 'tool_use'))
    .map((c) => ({ ...c, succeeded: results.has(c.id) && !results.get(c.id).is_error }));
}

function succeeded(all) {
  const ended = new Map(all.filter((e) => e.type === 'tool_execution_end').map((e) => [e.toolCallId, e]));
  return all.filter((e) => e.type === 'tool_execution_start' && ended.has(e.toolCallId) && !ended.get(e.toolCallId).isError);
}

export function reviewerRole(context) {
  const pkg = context?.providerResponse?.metadata?.packageDir;
  if (pkg) {
    return fs
      .readFileSync(path.join(pkg, roleFile), 'utf8')
      .trim()
      .split('\n')[0];
  }
  return fs
    .readFileSync(new URL('../../agents/recs-code-reviewer.md', import.meta.url), 'utf8')
    .split('\n---\n')[1]
    .trim()
    .split('\n')[0];
}

function opening(prompt) {
  const lines = prompt.split('\n');
  let i = 0;
  let leadIn = false;
  for (; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === '' || /^#{1,6}\s/.test(line) || /^(```|~~~)/.test(line) || /^([-*_])(\s*\1){2,}$/.test(line)) continue;
    if (!leadIn && line.length <= 80 && line.endsWith(':')) {
      leadIn = true;
      continue;
    }
    break;
  }
  return { line: i + 1, text: (lines[i] ?? '').trim() };
}

// docs/knowledge-base/claude-code-as-an-eval-harness.org: A subagent is a `Task` tool use naming its `subagent_type`
function reviewerDelegatedOnClaudeCode(context) {
  const delegated = toolUses(context).filter((c) => ['Task', 'Agent'].includes(c.name));
  const named = delegated.filter((c) => /(?:^|:)recs-code-reviewer$/.test(c.input?.subagent_type ?? ''));
  return result(
    named.length > 0,
    `${delegated.length} subagent call(s); ${named.length} named the recs-code-reviewer agent`,
  );
}

export function reviewerDelegated(output, context) {
  if (claudeCode(context)) return reviewerDelegatedOnClaudeCode(context);
  const role = reviewerRole(context);
  const delegated = calls(context).filter((e) => e.type === 'tool_execution_start' && e.toolName === 'subagent');
  const prompts = delegated.map((e) => e.args?.prompt ?? '');
  const opened = prompts.find((p) => opening(p).text.startsWith(role));
  if (opened !== undefined) {
    return result(true, `${delegated.length} subagent call(s); one opened with the reviewer's role, at line ${opening(opened).line}`);
  }
  const at = prompts.map((p) => p.split('\n').findIndex((l) => l.includes(role))).find((n) => n >= 0);
  return result(
    false,
    `${delegated.length} subagent call(s); none opened with the reviewer's role${at === undefined ? '' : `, found at line ${at + 1} instead`}`,
  );
}

const memoryParts = memoryFile(JSON.parse(fs.readFileSync(path.join(root, 'packaging', 'profiles', 'pi.json'), 'utf8')))
  .split(/<[^>]*>/)
  .map((part) => part.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
export const memoryPath = new RegExp(`^${memoryParts.join('[^/]+')}$`);
const memoryInCommand = new RegExp(memoryParts.join(`[^/\\s'"]+`));

function writesMemoryByBash(command) {
  if (!memoryInCommand.test(command)) return false;
  const target = memoryInCommand.source;
  return [
    new RegExp(`>>?\\s*['"]?${target}`),
    new RegExp(`\\btee\\b[^|;&]*${target}`),
    new RegExp(`\\bsed\\s+(?:-[^\\s]*\\s+)*-i[^|;&]*${target}`),
  ].some((r) => r.test(command));
}

export function memoryFileKept(output, context) {
  if (claudeCode(context)) {
    // docs/knowledge-base/claude-code-as-an-eval-harness.org: `TaskCreate` adds a task to the task list, and `TaskUpdate` sets its status
    const kept = toolUses(context).filter((c) => ['TaskCreate', 'TaskUpdate'].includes(c.name) && c.succeeded);
    const updates = kept.filter((c) => c.name === 'TaskUpdate').length;
    return result(kept.length >= 2 && updates >= 1, `${kept.length} TaskCreate or TaskUpdate call(s), ${updates} of them TaskUpdate`);
  }
  const writes = succeeded(calls(context)).filter(
    (e) =>
      (['write', 'edit'].includes(e.toolName) && memoryPath.test(e.args?.path ?? '')) ||
      (e.toolName === 'bash' && writesMemoryByBash(e.args?.command ?? '')),
  );
  return result(writes.length >= 2, `${writes.length} write(s) to the memory file`);
}

export function onlyPlannedFilesWritten(output, context) {
  const planned = ['notes/one.txt', 'notes/two.txt', 'notes/three.txt'];
  const files = changedFiles(context);
  const extra = files.filter((f) => !planned.includes(f));
  const missing = planned.filter((f) => !files.includes(f));
  return result(
    extra.length === 0 && missing.length === 0,
    [extra.length && `also wrote ${extra.join(', ')}`, missing.length && `did not write ${missing.join(', ')}`]
      .filter(Boolean)
      .join('; ') || 'wrote the planned files and no others',
  );
}
