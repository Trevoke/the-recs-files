import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { run, sandbox } from './common.js';

const secret = 'dummy-secret-value-not-real';

function dirs(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'recs-common-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  fs.mkdirSync(project);
  return { root, project };
}

test('sandbox keeps the environment out of the command line', (t) => {
  const call = sandbox(dirs(t), [], { TOKEN: secret }, ['/usr/bin/true']);
  assert.ok(!call.argv.some((a) => a.includes(secret)), 'no argument carries the secret');
  assert.deepEqual(call.argv.slice(-2), ['--', '/usr/bin/true']);
  assert.ok(call.options.includes(secret), 'the options read from a file descriptor carry the secret');
});

test('sandbox masks each path given to it with a tmpfs, after the system binds', (t) => {
  const { options } = sandbox(dirs(t), [], {}, ['/usr/bin/true'], ['/etc/ssl']);
  const args = options.split('\0');
  const at = args.indexOf('/etc/ssl');
  assert.equal(args[at - 1], '--tmpfs');
  assert.ok(at > args.lastIndexOf('/etc'), 'the mask comes after /etc is bound');
});

// docs/knowledge-base/bubblewrap-confines-an-eval-run.org: Options read from `--args` keep the environment out of `/proc/<pid>/cmdline`
test('a sandboxed run sees exactly the environment given, which no one reads from bwrap', async (t) => {
  const d = dirs(t);
  let seen;
  const result = await run(
    sandbox(d, [], { PATH: '/usr/bin', TOKEN: secret }, ['/usr/bin/sh', '-c', 'sleep 1; env']),
    30 * 1000,
    undefined,
    (child) => {
      setTimeout(() => {
        seen = {
          cmdline: fs.readFileSync(`/proc/${child.pid}/cmdline`, 'utf8'),
          environ: fs.readFileSync(`/proc/${child.pid}/environ`, 'utf8'),
        };
      }, 300);
    },
  );
  assert.equal(result.code, 0, result.stderr);
  assert.ok(seen.cmdline.startsWith('bwrap\0--args\0'), 'bwrap was read while it ran');
  assert.ok(!seen.cmdline.includes(secret), "bwrap's command line does not carry the secret");
  assert.ok(!seen.environ.includes(secret), "bwrap's own environment does not carry the secret");
  assert.equal(seen.environ, '', 'bwrap starts with an empty environment');
  const env = result.stdout.trim().split('\n').map((l) => l.split('=')[0]).filter((k) => k !== '_' && k !== 'SHLVL').sort();
  assert.deepEqual(env, ['PATH', 'PWD', 'TOKEN'], 'the run sees the given variables, and PWD');
  assert.ok(result.stdout.includes(`TOKEN=${secret}`), 'the run sees the secret');
});
