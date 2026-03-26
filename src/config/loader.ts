import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { ConfigSchema, REGIONS, type Config, type ConfigFile, type Region } from './schema';
import { getConfigPath } from './paths';
import { detectOutputFormat, type OutputFormat } from '../output/formatter';
import type { GlobalFlags } from '../types/flags';

export function loadConfigFile(): Partial<ConfigFile> {
  const path = getConfigPath();
  if (!existsSync(path)) return {};

  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = parseYaml(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return ConfigSchema.partial().parse(parsed);
  } catch {
    return {};
  }
}

export function loadConfig(flags: GlobalFlags): Config {
  const file = loadConfigFile();

  const apiKey = flags.apiKey || process.env.MINIMAX_API_KEY || undefined;
  const fileApiKey = file.api_key;

  const explicitRegion = (flags.region as string)
    || process.env.MINIMAX_REGION
    || file.region
    || undefined;

  const region = (explicitRegion || 'global') as Region;
  const needsRegionDetection = !explicitRegion;

  // Explicit --base-url overrides region-derived URL
  const baseUrl = flags.baseUrl
    || process.env.MINIMAX_BASE_URL
    || file.base_url
    || REGIONS[region]
    || REGIONS.global;

  const output: OutputFormat = detectOutputFormat(
    flags.output || process.env.MINIMAX_OUTPUT || file.output,
  );

  const timeout = flags.timeout
    ?? (process.env.MINIMAX_TIMEOUT ? Number(process.env.MINIMAX_TIMEOUT) : undefined)
    ?? file.timeout
    ?? 300;

  const verbose = flags.verbose || process.env.MINIMAX_VERBOSE === '1';
  const quiet = flags.quiet || false;
  const noColor = flags.noColor || process.env.NO_COLOR !== undefined || !process.stdout.isTTY;
  const yes = flags.yes || false;
  const dryRun = flags.dryRun || false;

  return {
    apiKey,
    fileApiKey,
    region,
    baseUrl,
    output,
    timeout,
    verbose,
    quiet,
    noColor,
    yes,
    dryRun,
    needsRegionDetection,
  };
}
