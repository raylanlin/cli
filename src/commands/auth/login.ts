import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { saveCredentials } from '../../auth/credentials';
import { startBrowserFlow, startDeviceCodeFlow } from '../../auth/oauth';
import { requestJson } from '../../client/http';
import { quotaEndpoint } from '../../client/endpoints';
import { formatOutput } from '../../output/formatter';
import { ensureConfigDir, getConfigPath } from '../../config/paths';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { CredentialFile } from '../../auth/types';
import type { QuotaResponse } from '../../types/api';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';

export default defineCommand({
  name: 'auth login',
  description: 'Authenticate via OAuth or API key',
  usage: 'minimax auth login [--method oauth|api-key] [--api-key <key>] [--no-browser]',
  examples: [
    'minimax auth login',
    'minimax auth login --no-browser',
    'minimax auth login --api-key sk-xxxxx',
    'minimax auth login --method api-key --api-key sk-xxxxx',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const method = flags.apiKey ? 'api-key' : (flags.method as string) || 'oauth';

    if (method === 'api-key') {
      const key = (flags.apiKey as string) || config.apiKey;
      if (!key) {
        throw new CLIError(
          '--api-key is required when using --method api-key.',
          ExitCode.USAGE,
          'minimax auth login --api-key sk-xxxxx',
        );
      }

      // Validate the key by calling quota endpoint
      if (!config.dryRun) {
        process.stderr.write('Testing key... ');
        try {
          const testConfig = { ...config, apiKey: key };
          await requestJson<QuotaResponse>(testConfig, {
            url: quotaEndpoint(testConfig.baseUrl),
          });
          process.stderr.write('Valid\n');
        } catch {
          throw new CLIError(
            'API key validation failed.',
            ExitCode.AUTH,
            'Check that your key is valid and belongs to a Token Plan.',
          );
        }

        // Store key in config.yaml
        await ensureConfigDir();
        const configPath = getConfigPath();
        let existing: Record<string, unknown> = {};
        if (existsSync(configPath)) {
          try {
            existing = parseYaml(readFileSync(configPath, 'utf-8')) || {};
          } catch { /* ignore */ }
        }
        existing.api_key = key;
        writeFileSync(configPath, yamlStringify(existing), { mode: 0o600 });
        process.stderr.write(`API key saved to ${configPath}\n`);
      } else {
        console.log('Would validate and save API key.');
      }
      return;
    }

    // OAuth flow
    if (config.dryRun) {
      console.log('Would start OAuth login flow.');
      return;
    }

    let tokens;
    if (flags.noBrowser) {
      tokens = await startDeviceCodeFlow();
    } else {
      tokens = await startBrowserFlow();
    }

    const creds: CredentialFile = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      token_type: 'Bearer',
    };

    await saveCredentials(creds);
    process.stderr.write('Logged in successfully.\n');
    process.stderr.write('Credentials saved to ~/.minimax/credentials.json\n');
  },
});
