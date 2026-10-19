import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFlow, parseFlow, shippedFlow } from '../flow.mjs';

function project(t, flow, skillFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  put('docs/user-workflows/uw-1-do-a-thing.org', '* UW-1 Do a thing\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n** Main success scenario\n*** 1. Agent reads\n*** 2. Agent writes\n** Extensions\n*** 2a. It fails\n');
  put('docs/architectural-decisions/adr-1-build-it-so.org', '* ADR-1 Build it so\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n** Context\nx\n** Decision\ny\n');
  put('docs/architectural-decisions/adr-2-maybe-so.org', '* ADR-2 Maybe so\n:PROPERTIES:\n:STATUS: Proposed\n:END:\n** Decision\ny\n');
  put('skills/skill-flow.dot', flow);
  for (const [file, text] of Object.entries(skillFiles)) put(`skills/${file}`, text);
  return root;
}

const good = `digraph skill_flow {
  "recs-a";
  "recs-b";
  "recs-a" -> "recs-b" [kind="load", condition="same session", cite="UW-1 §2: Do a thing; ADR-1 §Decision: Build it so"];
  "recs-a" -> "recs-a/helper-prompt.md" [kind="delegate", cite="UW-1 §2a: Do a thing"];
}
`;
const goodSkills = {
  'recs-a/SKILL.md': 'Use {{trf: load recs-b}} next.',
  'recs-a/helper-prompt.md': '{{trf: delegate general-purpose brief}}:',
  'recs-b/SKILL.md': 'Plain.',
};

test('reads nodes and edges with their attributes', () => {
  const { nodes, edges } = parseFlow(good);
  assert.deepEqual([...nodes].sort(), ['recs-a', 'recs-a/helper-prompt.md', 'recs-b']);
  assert.deepEqual(edges[0], { from: 'recs-a', to: 'recs-b', kind: 'load', condition: 'same session', cite: 'UW-1 §2: Do a thing; ADR-1 §Decision: Build it so' });
});

test('a skill flow that matches the skills and the records passes', (t) => {
  assert.deepEqual(checkFlow(project(t, good, goodSkills)), []);
});

test('refuses a skill flow out of step with the skills or the records', (t) => {
  const bad = `digraph skill_flow {
  "recs-a";
  "recs-a" -> "recs-b" [kind="load", cite="UW-1 §9: Do a thing"];
  "recs-a" -> "recs-c" [kind="jump", cite="ADR-2 §Decision: Maybe so"];
}
`;
  const problems = checkFlow(project(t, bad, { ...goodSkills, 'recs-a/SKILL.md': 'Use {{trf: load recs-b}} and {{trf: load recs-a}}.' }));
  assert.deepEqual(problems, [
    'skill-flow.dot: recs-c is neither a skill nor a prompt template',
    'skill-flow.dot: recs-a -> recs-b: UW-1 §9: Do a thing: UW-1 has no section 9',
    'skill-flow.dot: recs-a -> recs-c has kind jump, not load, handoff or delegate',
    'skill-flow.dot: recs-a -> recs-c: ADR-2 §Decision: Maybe so: ADR-2 is not Accepted',
    'skills/recs-a/SKILL.md: load recs-a has no load edge from recs-a',
    'skills/recs-a/helper-prompt.md: delegate has no delegate edge from recs-a to recs-a/helper-prompt.md',
  ]);
});

test('a shipped skill flow carries no citations', () => {
  assert.equal(
    shippedFlow('  "a" -> "b" [kind="load", condition="x", cite="UW-1 §2: Do a thing"];\n  "a" -> "c" [cite="ADR-1 §Decision: Build it so", kind="delegate"];\n'),
    '  "a" -> "b" [kind="load", condition="x"];\n  "a" -> "c" [kind="delegate"];\n',
  );
});
