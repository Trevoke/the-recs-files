import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root } from '../render.mjs';

const extension = path.join(root, 'packaging', 'pi', 'extensions', 'subagent', 'index.ts');

function toolsOffered(t, depth) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subagent-depth-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'node_modules', 'typebox'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}\n');
  fs.writeFileSync(path.join(dir, 'node_modules', 'typebox', 'package.json'), '{"name":"typebox","type":"module","exports":"./index.js"}\n');
  fs.writeFileSync(path.join(dir, 'node_modules', 'typebox', 'index.js'), 'export const Type = { Object: (o) => o, Optional: (o) => o, String: (o) => o };\n');
  fs.copyFileSync(extension, path.join(dir, 'index.ts'));
  const script = `const m = await import(${JSON.stringify(path.join(dir, 'index.ts'))}); let n = 0; m.default({ registerTool: () => n++ }); console.log(n);`;
  const env = { ...process.env };
  if (depth === undefined) delete env.TRF_DELEGATE_DEPTH;
  else env.TRF_DELEGATE_DEPTH = depth;
  return Number(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', script], { env, encoding: 'utf8' }).trim());
}

// ADR-13 §Decision: Stop delegation two levels deep
test('the pi subagent extension offers the subagent tool at depths 0 and 1, and with no depth set', (t) => {
  assert.equal(toolsOffered(t, undefined), 1, 'the tool is offered with no TRF_DELEGATE_DEPTH');
  assert.equal(toolsOffered(t, '0'), 1, 'the tool is offered at depth 0');
  assert.equal(toolsOffered(t, '1'), 1, 'the tool is offered at depth 1');
});

// ADR-13 §Decision: Stop delegation two levels deep
test('the pi subagent extension does not offer the subagent tool at depth 2', (t) => {
  assert.equal(toolsOffered(t, '2'), 0, 'no tool is offered at depth 2');
});
