import { defineCommand } from '../../command';
import { resolveCredential } from '../../auth/resolver';
import { loadCredentials } from '../../auth/credentials';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';

export default defineCommand({
  name: 'auth status',
  description: 'Show current authentication state',
  usage: 'minimax auth status',
  examples: [
    'minimax auth status',
    'minimax auth status --output json',
  ],
  async run(config: Config, flags: GlobalFlags) {
    try {
      const credential = await resolveCredential(config);
      const format = detectOutputFormat(config.output);

      const result: Record<string, unknown> = {
        method: credential.method,
        source: credential.source,
      };

      if (credential.method === 'oauth') {
        const creds = await loadCredentials();
        if (creds) {
          result.token_expires = creds.expires_at;
          if (creds.account) result.account = creds.account;
          const expiresAt = new Date(creds.expires_at);
          const minutesLeft = Math.round((expiresAt.getTime() - Date.now()) / 60000);
          result.expires_in = `${minutesLeft} minutes`;
        }
        result.credentials_path = '~/.minimax/credentials.json';
      } else {
        result.key = credential.token.slice(0, 6) + '...' + credential.token.slice(-4);
      }

      console.log(formatOutput(result, format));
    } catch {
      const format = detectOutputFormat(config.output);
      const result = {
        authenticated: false,
        message: 'Not authenticated.',
        hint: 'Run: minimax auth login\nOr set $MINIMAX_API_KEY',
      };
      console.log(formatOutput(result, format));
    }
  },
});
