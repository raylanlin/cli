import { $ } from 'bun';

const VERSION = process.env.VERSION ?? 'dev';

const targets = [
  { target: 'bun-linux-x64',    output: 'minimax-linux-x64' },
  { target: 'bun-linux-arm64',  output: 'minimax-linux-arm64' },
  { target: 'bun-darwin-x64',   output: 'minimax-darwin-x64' },
  { target: 'bun-darwin-arm64', output: 'minimax-darwin-arm64' },
  { target: 'bun-windows-x64',  output: 'minimax-windows-x64.exe' },
];

console.log(`Building minimax-cli ${VERSION}...\n`);

for (const { target, output } of targets) {
  console.log(`  Building ${output}...`);
  await $`bun build src/main.ts \
    --compile \
    --target ${target} \
    --outfile dist/${output} \
    --define "process.env.CLI_VERSION='${VERSION}'"`.quiet();
  console.log(`  ✓ dist/${output}`);
}

console.log('\nDone. Binaries are in dist/');
