import fs from 'node:fs';
import { changedFiles, result } from './workspace.js';

function calls(context) {
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
    })
    .filter((e) => e.type === 'tool_execution_start');
}

export function reviewerRole() {
  return fs
    .readFileSync(new URL('../../agents/recs-code-reviewer.md', import.meta.url), 'utf8')
    .split('\n---\n')[1]
    .trim()
    .split('\n')[0];
}

export function reviewerDelegated(output, context) {
  const role = reviewerRole();
  const delegated = calls(context).filter((e) => e.toolName === 'subagent');
  const withRole = delegated.some((e) => (e.args?.prompt ?? '').trimStart().startsWith(role));
  return result(withRole, `${delegated.length} subagent call(s); ${withRole ? 'one' : 'none'} opened with the reviewer's role`);
}

export function memoryFileKept(output, context) {
  const writes = calls(context).filter(
    (e) => ['write', 'edit'].includes(e.toolName) && /^\/tmp\/recs-files-memory-[^/]+\.md$/.test(e.args?.path ?? ''),
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
