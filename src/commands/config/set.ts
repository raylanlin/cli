import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { ensureConfigDir, getConfigPath } from '../../config/paths';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';

const VALID_KEYS = ['region', 'base_url', 'output', 'timeout', 'api_key'];

export default defineCommand({
  name: 'config set',
  description: 'Set a config value',
  usage: 'minimax config set --key <key> --value <value>',
  examples: [
    'minimax config set --key output --value json',
    'minimax config set --key timeout --value 600',
    'minimax config set --key base_url --value https://api-uw.minimax.io',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const key = flags.key as string | undefined;
    const value = flags.value as string | undefined;

    if (!key || value === undefined) {
      throw new CLIError(
        '--key and --value are required.',
        ExitCode.USAGE,
        'minimax config set --key <key> --value <value>',
      );
    }

    if (!VALID_KEYS.includes(key)) {
      throw new CLIError(
        `Invalid config key "${key}". Valid keys: ${VALID_KEYS.join(', ')}`,
        ExitCode.USAGE,
      );
    }

    // Validate specific values
    if (key === 'region' && !['global', 'cn'].includes(value)) {
      throw new CLIError(
        `Invalid region "${value}". Valid values: global, cn`,
        ExitCode.USAGE,
      );
    }

    if (key === 'output' && !['text', 'json', 'yaml'].includes(value)) {
      throw new CLIError(
        `Invalid output format "${value}". Valid values: text, json, yaml`,
        ExitCode.USAGE,
      );
    }

    if (key === 'timeout') {
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        throw new CLIError(
          `Invalid timeout "${value}". Must be a positive number.`,
          ExitCode.USAGE,
        );
      }
    }

    const format = detectOutputFormat(config.output);

    if (config.dryRun) {
      console.log(formatOutput({ would_set: { [key]: value } }, format));
      return;
    }

    await ensureConfigDir();
    const configPath = getConfigPath();

    let existing: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      try {
        existing = parseYaml(readFileSync(configPath, 'utf-8')) || {};
      } catch { /* ignore */ }
    }

    // Convert numeric values
    if (key === 'timeout') {
      existing[key] = Number(value);
    } else {
      existing[key] = value;
    }

    writeFileSync(configPath, yamlStringify(existing), { mode: 0o600 });

    if (!config.quiet) {
      console.log(formatOutput({ [key]: existing[key] }, format));
    }
  },
});
