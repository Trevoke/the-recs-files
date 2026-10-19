import { harnesses, render } from './render.mjs';

const [harness, out, version] = process.argv.slice(2);
if (!harnesses.includes(harness) || !out || !version) {
  console.error(`usage: node packaging/build.mjs <${harnesses.join('|')}> <out-dir> <version>`);
  process.exit(2);
}
try {
  const dir = render(harness, out, version);
  console.log(`built the-recs-files-${harness} ${version.replace(/^v/, '')} in ${dir}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
