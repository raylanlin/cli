import { CLIError } from './base';
import { ExitCode } from './codes';

export interface ApiErrorBody {
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
}

export function mapApiError(status: number, body: ApiErrorBody, url?: string): CLIError {
  const apiMsg =
    body.base_resp?.status_msg ||
    body.error?.message ||
    `HTTP ${status}`;

  const apiCode = body.base_resp?.status_code || body.error?.code;

  if (status === 401 || status === 403) {
    return new CLIError(
      `API key rejected (HTTP ${status}).`,
      ExitCode.AUTH,
      'Check status: minimax auth status\nRe-authenticate: minimax auth login',
    );
  }

  if (status === 429) {
    return new CLIError(
      `Rate limit or quota exceeded. ${apiMsg}`,
      ExitCode.QUOTA,
      'Check usage: minimax quota show',
    );
  }

  if (status === 408 || status === 504) {
    return new CLIError(
      `Request timed out (HTTP ${status}).`,
      ExitCode.TIMEOUT,
      'Try increasing --timeout or retry later.',
    );
  }

  // MiniMax content sensitivity filter
  if (apiCode === 1002 || apiCode === 1039) {
    const filterType = body.base_resp?.status_msg || 'content sensitivity';
    return new CLIError(
      `Input content flagged by sensitivity filter (${filterType}).`,
      ExitCode.CONTENT_FILTER,
    );
  }

  // MiniMax insufficient quota
  if (apiCode === 1028 || apiCode === 1030) {
    return new CLIError(
      `Quota exhausted. ${apiMsg}`,
      ExitCode.QUOTA,
      'Check usage: minimax quota show\nUpgrade plan: https://platform.minimax.io/subscribe/token-plan',
    );
  }

  // MiniMax model not supported by plan
  if (apiCode === 2061) {
    return new CLIError(
      `${apiMsg}`,
      ExitCode.QUOTA,
      'This model is not available on your current Token Plan.\nCheck usage: minimax quota show',
    );
  }

  return new CLIError(
    `API error: ${apiMsg} (HTTP ${status})`,
    ExitCode.GENERAL,
  );
}
