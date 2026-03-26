import { parseArgs } from './args';
import { registry } from './registry';
import { handleError } from './errors/handler';
import { loadConfig } from './config/loader';
import { resolveCredential } from './auth/resolver';
import { formatOutput } from './output/formatter';
import { detectRegion, saveDetectedRegion } from './config/detect-region';
import { REGIONS } from './config/schema';

const CLI_VERSION = process.env.CLI_VERSION ?? '0.1.0';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`minimax ${CLI_VERSION}`);
    process.exit(0);
  }

  const { commandPath, flags } = parseArgs(args);

  if (flags.help || commandPath.length === 0) {
    registry.printHelp(commandPath);
    process.exit(0);
  }

  const command = registry.resolve(commandPath);
  const config = loadConfig(flags);

  // Auto-detect region on first run when no region is configured
  if (config.needsRegionDetection) {
    const apiKey = config.apiKey || config.fileApiKey;
    if (apiKey) {
      const detected = await detectRegion(apiKey);
      config.region = detected;
      config.baseUrl = REGIONS[detected];
      config.needsRegionDetection = false;
      await saveDetectedRegion(detected);
    }
  }

  await command.execute(config, flags);
}

main().catch(handleError);
