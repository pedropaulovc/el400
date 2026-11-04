import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

try {
  const tag = process.argv[2];
  const runnerTemp = process.env.RUNNER_TEMP;
  const output = process.env.GITHUB_OUTPUT;
  if (!tag || !runnerTemp || !output) {
    throw new Error('Expected a tag argument, RUNNER_TEMP, and GITHUB_OUTPUT');
  }

  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
  const match = typeof version === 'string' && version.match(semver);
  if (!match || tag !== `v${version}`) {
    throw new Error('Tag must exactly match v followed by the valid semver package.json version');
  }

  const lines = readFileSync('changelog.md', 'utf8').split(/\r?\n/);
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^##\s+\[([^\]]+)\](?:\s+-\s+\d{4}-\d{2}-\d{2})?\s*$/);
    if (heading?.[1] === version) headings.push(i);
  }
  if (headings.length !== 1) {
    throw new Error(`Expected exactly one changelog section for ${version}`);
  }
  const start = headings[0] + 1;
  let end = start;
  while (end < lines.length && !/^##(?:\s|$)/.test(lines[end])) end++;
  const notes = lines.slice(start, end).join('\n').trim();
  if (!notes.replace(/<!--[^]*?-->/g, '').replace(/^\s*#{1,6}\s*.*$/gm, '').trim()) {
    throw new Error(`Changelog section for ${version} is empty`);
  }

  const notesFile = join(runnerTemp, 'npm-release-notes.md');
  writeFileSync(notesFile, `${notes}\n`);
  appendFileSync(output, `notes_file=${notesFile}\ndist_tag=${match[4] ? 'next' : 'latest'}\nprerelease=${Boolean(match[4])}\n`);
} catch (error) {
  console.error(`Release validation failed: ${error.message}`);
  process.exitCode = 1;
}
