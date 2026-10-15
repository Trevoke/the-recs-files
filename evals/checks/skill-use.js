import { result } from './workspace.js';

function used(context, skill) {
  const calls = context.providerResponse?.metadata?.skillCalls ?? [];
  return calls.some((c) => !c.is_error && (c.name === skill || c.name?.endsWith(`:${skill}`)));
}

function expectsSkills(context) {
  return !/without-skills/.test(context.provider?.label ?? '');
}

export function writingRecords(output, context) {
  const skill = 'recs-writing-records';
  const expected = expectsSkills(context);
  const actual = used(context, skill);
  return result(
    actual === expected,
    `${skill} ${actual ? 'was' : 'was not'} used, in the ${expected ? 'with' : 'without'}-skills arm`,
  );
}
