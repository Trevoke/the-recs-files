import { changedFiles, result } from './workspace.js';

export function recordFiles(files) {
  return files.filter((f) => /^docs\/.+\.org$/.test(f) && f !== 'docs/vision.org');
}

// UW-20261028-838j §Minimal guarantee: Answer a question the agent raises
export function recordsUnchanged(output, context) {
  const changed = recordFiles(changedFiles(context));
  return result(
    changed.length === 0,
    changed.length ? `${changed.length} faults in the records before the answer: ${changed.join('; ')}` : 'each record stands as it was',
  );
}
