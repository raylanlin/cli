import { defineCommand } from '../../command';
import { clearCredentials, loadCredentials } from '../../auth/credentials';
import { getConfigPath } from '../../config/paths';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';

export default defineCommand({
  name: 'auth logout',
  description: 'Revoke tokens and clear stored credentials',
  usage: 'minimax auth logout [--yes] [--dry-run]',
  examples: [
    'minimax auth logout',
    'minimax auth logout --dry-run',
    'minimax auth logout --yes',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const creds = await loadCredentials();
    const configPath = getConfigPath();
    const hasConfigKey = existsSync(configPath) && (() => {
      try {
        const parsed = parseYaml(readFileSync(configPath, 'utf-8'));
        return parsed?.api_key;
      } catch { return false; }
    })();

    if (config.dryRun) {
      if (creds) console.log('Would remove ~/.minimax/credentials.json');
      if (hasConfigKey) console.log('Would clear api_key from ~/.minimax/config.yaml');
      if (!creds && !hasConfigKey) console.log('No credentials to clear.');
      console.log('No changes made.');
      return;
    }

    if (creds) {
      await clearCredentials();
      process.stderr.write('Removed ~/.minimax/credentials.json\n');
    }

    if (hasConfigKey) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = parseYaml(raw) || {};
        delete parsed.api_key;
        writeFileSync(configPath, yamlStringify(parsed), { mode: 0o600 });
        process.stderr.write('Cleared api_key from ~/.minimax/config.yaml\n');
      } catch { /* ignore */ }
    }

    if (!creds && !hasConfigKey) {
      process.stderr.write('No credentials to clear.\n');
    }
  },
});
