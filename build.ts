import { $ } from 'bun';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

const VERSION = process.env.VERSION ?? 'dev';

const targets = [
  { bunTarget: 'bun-linux-x64',        platform: 'linux-x64',        output: 'minimax-linux-x64' },
  { bunTarget: 'bun-linux-x64-musl',   platform: 'linux-x64-musl',   output: 'minimax-linux-x64-musl' },
  { bunTarget: 'bun-linux-arm64',      platform: 'linux-arm64',      output: 'minimax-linux-arm64' },
  { bunTarget: 'bun-linux-arm64-musl', platform: 'linux-arm64-musl', output: 'minimax-linux-arm64-musl' },
  { bunTarget: 'bun-darwin-x64',       platform: 'darwin-x64',       output: 'minimax-darwin-x64' },
  { bunTarget: 'bun-darwin-arm64',     platform: 'darwin-arm64',     output: 'minimax-darwin-arm64' },
  { bunTarget: 'bun-windows-x64',      platform: 'windows-x64',      output: 'minimax-windows-x64.exe' },
];

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

console.log(`Building minimax-cli ${VERSION}...\n`);

const manifest: {
  version: string;
  platforms: Record<string, { file: string; checksum: string }>;
} = { version: VERSION, platforms: {} };

// Platform standalones
for (const { bunTarget, platform, output } of targets) {
  const outPath = `dist/${output}`;
  process.stdout.write(`  ${output}...`);

  await $`bun build src/main.ts \
    --compile \
    --minify \
    --target ${bunTarget} \
    --outfile ${outPath} \
    --define "process.env.CLI_VERSION='${VERSION}'"`.quiet();

  manifest.platforms[platform] = { file: output, checksum: sha256(outPath) };
  console.log(' ✓');
}

// Node.js .mjs bundle (much smaller, requires node >= 18)
process.stdout.write('  minimax.mjs...');
const mjsPath = 'dist/minimax.mjs';

await $`bun build src/main.ts \
  --outfile ${mjsPath} \
  --target node \
  --minify \
  --define "process.env.CLI_VERSION='${VERSION}'"`.quiet();

// Prepend shebang so the file is directly executable
const mjsContent = readFileSync(mjsPath);
writeFileSync(mjsPath, Buffer.concat([Buffer.from('#!/usr/bin/env node\n'), mjsContent]));

manifest.platforms['node'] = { file: 'minimax.mjs', checksum: sha256(mjsPath) };
console.log(' ✓');

writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
console.log('  manifest.json ✓');
console.log(`\nDone. ${targets.length + 1} builds in dist/`);
