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
  put('docs/user-workflows/uw-2-maybe-do-a-thing.org', '* UW-2 Maybe do a thing\n:PROPERTIES:\n:STATUS: Proposed\n:END:\n** Main success scenario\n*** 1. Agent reads\n');
  put('docs/architectural-decisions/adr-1-build-it-another-way.org', '* ADR-1 Build it another way\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n** Decision\ny\n');
  put('docs/architectural-decisions/adr-9-build-it-so.org', '* ADR-9 Build it so\n:PROPERTIES:\n:STATUS: Accepted\n:END:\n** Context\nx\n** Decision\ny\n');
  if (flow !== undefined) put('skills/skill-flow.dot', flow);
  for (const [file, text] of Object.entries(skillFiles)) put(`skills/${file}`, text);
  return root;
}

const good = `digraph skill_flow {
  // the skills
  "recs-a";
  "recs-b";

  "recs-a" -> "recs-b" [kind="load", condition="same session", cite="UW-1 §2: Do a thing; ADR-9 §Decision: Build it so"];
  "recs-a" -> "recs-a/helper-prompt.md" [kind="delegate", cite="UW-1 §2a: Do a thing"];
}
`;
const goodSkills = {
  'recs-a/SKILL.md': 'Use {{trf: load recs-b}} next.',
  'recs-a/helper-prompt.md': '{{trf: delegate general-purpose brief}}:',
  'recs-b/SKILL.md': 'Plain.',
};
const flowOf = (...lines) => `digraph skill_flow {\n${lines.map((l) => `  ${l}\n`).join('')}}\n`;

// ADR-11 §Decision: Keep the order of the skills in a skill flow beside them
test('reads nodes and edges with their attributes', () => {
  const { nodes, edges, problems } = parseFlow(good);
  assert.deepEqual([...nodes].sort(), ['recs-a', 'recs-a/helper-prompt.md', 'recs-b']);
  assert.deepEqual(edges[0], { from: 'recs-a', to: 'recs-b', kind: 'load', condition: 'same session', cite: 'UW-1 §2: Do a thing; ADR-9 §Decision: Build it so' });
  assert.deepEqual(problems, []);
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('a skill flow that matches the skills and the records passes', (t) => {
  assert.deepEqual(checkFlow(project(t, good, goodSkills)), []);
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('refuses a skill flow out of step with the skills or the records', (t) => {
  const bad = `digraph skill_flow {
  "recs-a";
  "recs-a" -> "recs-b" [kind="load", cite="UW-1 §9: Do a thing"];
  "recs-a" -> "recs-c" [kind="jump", cite="UW-2 §1: Maybe do a thing"];
}
`;
  const problems = checkFlow(project(t, bad, { ...goodSkills, 'recs-a/SKILL.md': 'Use {{trf: load recs-b}} and {{trf: load recs-a}}.' }));
  assert.deepEqual(problems, [
    'skill-flow.dot: recs-c is neither a skill nor a prompt template',
    'skill-flow.dot: recs-a -> recs-b: UW-1 §9: Do a thing: UW-1 has no section 9',
    'skill-flow.dot: recs-a -> recs-c has kind jump, not load, handoff or delegate',
    'skill-flow.dot: recs-a -> recs-c: UW-2 §1: Maybe do a thing: UW-2 is not Accepted',
    'skills/recs-a/SKILL.md: load recs-a has no load edge from recs-a',
    'skills/recs-a/helper-prompt.md: delegate has no delegate edge from recs-a to recs-a/helper-prompt.md',
  ]);
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('refuses a missing skill flow', (t) => {
  assert.deepEqual(checkFlow(project(t, undefined, goodSkills)), ['skills/skill-flow.dot is missing']);
});

// ADR-11 §Decision: Keep the order of the skills in a skill flow beside them
test('refuses a statement it cannot read, before anything else', (t) => {
  const split = `digraph skill_flow {
  "recs-a";
  "recs-b";
  "recs-a" -> "recs-b" [kind="load",
    cite="UW-1 §2: Do a thing"];
  "recs-a" -> "recs-a/helper-prompt.md" [kind="delegate", cite="UW-1 §2a: Do a thing"];
}
`;
  assert.deepEqual(checkFlow(project(t, split, goodSkills)), [
    'skill-flow.dot:4: not a node or an edge',
    'skill-flow.dot:5: not a node or an edge',
    'skills/recs-a/SKILL.md: load recs-b has no load edge from recs-a',
  ]);
});

// ADR-11 §Decision: Keep the order of the skills in a skill flow beside them
test('a node is a skill or a prompt template, and every skill is a node', (t) => {
  const flow = flowOf(
    '"recs-a";',
    '"recs-a/SKILL.md";',
    '"recs-a/notes.txt";',
    '"recs-a/missing-prompt.md";',
    '"recs-a" -> "recs-a/helper-prompt.md" [kind="delegate", cite="UW-1 §2a: Do a thing"];',
  );
  const skills = { 'recs-a/SKILL.md': 'Plain.', 'recs-a/notes.txt': 'x', 'recs-a/helper-prompt.md': goodSkills['recs-a/helper-prompt.md'], 'recs-b/SKILL.md': 'Plain.' };
  assert.deepEqual(checkFlow(project(t, flow, skills)), [
    'skill-flow.dot: recs-b is not a node',
    'skill-flow.dot: recs-a/SKILL.md is neither a skill nor a prompt template',
    'skill-flow.dot: recs-a/notes.txt is neither a skill nor a prompt template',
    'skill-flow.dot: recs-a/missing-prompt.md is neither a skill nor a prompt template',
  ]);
});

// ADR-11 §Decision: Keep the order of the skills in a skill flow beside them
test('an edge cites a user workflow step or extension, or ADR-9, as it stands on disk', (t) => {
  const flow = flowOf(
    '"recs-a";',
    '"recs-b";',
    '"recs-a" -> "recs-b" [kind="handoff", cite="ADR-1 §Decision: Build it another way"];',
    '"recs-b" -> "recs-a" [kind="handoff"];',
    '"recs-a" -> "recs-b" [kind="handoff", cite="UW-1 step 2"];',
    '"recs-b" -> "recs-a" [kind="handoff", cite="UW-3 §1: Do another thing"];',
    '"recs-a" -> "recs-b" [kind="handoff", cite="ADR-9 §Decision: Build it some way"];',
  );
  assert.deepEqual(checkFlow(project(t, flow, { 'recs-a/SKILL.md': 'Plain.', 'recs-b/SKILL.md': 'Plain.' })), [
    'skill-flow.dot: recs-a -> recs-b: ADR-1 §Decision: Build it another way is neither a user workflow step or extension nor ADR-9',
    'skill-flow.dot: recs-b -> recs-a cites nothing',
    "skill-flow.dot: recs-a -> recs-b: UW-1 step 2: not a citation of a record's section",
    'skill-flow.dot: recs-b -> recs-a: UW-3 §1: Do another thing: UW-3 is not on disk',
    'skill-flow.dot: recs-a -> recs-b: ADR-9 §Decision: Build it some way: ADR-9 is not titled Build it some way',
  ]);
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('a load or delegate edge needs its capability marker', (t) => {
  const flow = flowOf(
    '"recs-a";',
    '"recs-b";',
    '"recs-a" -> "recs-b" [kind="load", cite="UW-1 §1: Do a thing"];',
    '"recs-b" -> "recs-b/helper-prompt.md" [kind="delegate", cite="UW-1 §1: Do a thing"];',
  );
  assert.deepEqual(checkFlow(project(t, flow, { 'recs-a/SKILL.md': 'Plain.', 'recs-b/SKILL.md': 'Plain.', 'recs-b/helper-prompt.md': 'Plain.' })), [
    'skill-flow.dot: recs-a -> recs-b: no load capability marker in recs-a',
    'skill-flow.dot: recs-b -> recs-b/helper-prompt.md: no delegate capability marker in recs-b/helper-prompt.md or recs-b/SKILL.md',
  ]);
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('a delegate edge needs a marker of its own', (t) => {
  const flow = flowOf(
    '"recs-a";',
    '"recs-a" -> "recs-a/one-prompt.md" [kind="delegate", cite="UW-1 §1: Do a thing"];',
    '"recs-a" -> "recs-a/two-prompt.md" [kind="delegate", cite="UW-1 §1: Do a thing"];',
  );
  const skills = { 'recs-a/SKILL.md': 'Plain.', 'recs-a/one-prompt.md': '{{trf: delegate general-purpose brief}}:', 'recs-a/two-prompt.md': 'Plain.' };
  assert.deepEqual(checkFlow(project(t, flow, skills)), [
    'skill-flow.dot: recs-a -> recs-a/two-prompt.md: no delegate capability marker in recs-a/two-prompt.md or recs-a/SKILL.md',
  ]);
});

// ADR-11 §Consequences: Keep the order of the skills in a skill flow beside them
test('a delegate marker in a SKILL.md stands for its edges, and needs one', (t) => {
  const flow = flowOf(
    '"recs-a";',
    '"recs-b";',
    '"recs-a" -> "recs-a/reviewer.md" [kind="delegate", cite="UW-1 §1: Do a thing"];',
  );
  const skills = {
    'recs-a/SKILL.md': 'Use {{trf: delegate general-purpose sentence}}.',
    'recs-a/reviewer.md': 'Plain.',
    'recs-b/SKILL.md': 'Use {{trf: delegate general-purpose sentence}}.',
  };
  assert.deepEqual(checkFlow(project(t, flow, skills)), [
    'skills/recs-b/SKILL.md: delegate has no delegate edge from recs-b',
  ]);
});

// ADR-2 §Consequences: The recs files live apart from any project that uses them
test('a shipped skill flow carries no citations', () => {
  assert.equal(
    shippedFlow('  "a" -> "b" [kind="load", condition="x", cite="UW-1 §2: Do a thing"];\n  "a" -> "c" [cite="ADR-9 §Decision: Build it so", kind="delegate"];\n  "a" -> "d" [cite="UW-1 §1: Do a thing"];\n'),
    '  "a" -> "b" [kind="load", condition="x"];\n  "a" -> "c" [kind="delegate"];\n  "a" -> "d";\n',
  );
});
