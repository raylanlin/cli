import { REGIONS, type Region } from './schema';
import { ensureConfigDir, getConfigPath } from './paths';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';

const QUOTA_PATH = '/v1/api/openplatform/coding_plan/remains';

function quotaUrl(region: Region): string {
  const apiHost = REGIONS[region];
  // Quota endpoint uses www subdomain
  const wwwHost = apiHost.replace('://api.', '://www.');
  return `${wwwHost}${QUOTA_PATH}`;
}

async function probeRegion(region: Region, apiKey: string, timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(quotaUrl(region), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return false;
    const data = await res.json() as { base_resp?: { status_code?: number } };
    return data.base_resp?.status_code === 0;
  } catch {
    return false;
  }
}

/**
 * Probes both region endpoints in parallel to detect which region an API key belongs to.
 * Returns the detected region, or 'global' as fallback.
 */
export async function detectRegion(apiKey: string): Promise<Region> {
  process.stderr.write('Detecting region...');

  const timeout = 5000;
  const regions = Object.keys(REGIONS) as Region[];

  const results = await Promise.all(
    regions.map(async (r) => ({ region: r, ok: await probeRegion(r, apiKey, timeout) })),
  );

  const match = results.find((r) => r.ok);
  const detected: Region = match?.region ?? 'global';

  process.stderr.write(` ${detected}\n`);
  return detected;
}

/**
 * Saves the detected region to ~/.minimax/config.yaml.
 */
export async function saveDetectedRegion(region: Region): Promise<void> {
  await ensureConfigDir();
  const configPath = getConfigPath();

  let existing: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      existing = parseYaml(readFileSync(configPath, 'utf-8')) || {};
    } catch { /* ignore */ }
  }

  existing.region = region;
  writeFileSync(configPath, yamlStringify(existing), { mode: 0o600 });
}
