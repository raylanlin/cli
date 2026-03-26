import { defineCommand } from '../../command';
import { requestJson } from '../../client/http';
import { quotaEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import { formatTable } from '../../output/text';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';

interface ModelRemain {
  model_name: string;
  start_time: number;
  end_time: number;
  remains_time: number;
  current_interval_total_count: number;
  current_interval_usage_count: number;
  current_weekly_total_count: number;
  current_weekly_usage_count: number;
  weekly_start_time: number;
  weekly_end_time: number;
  weekly_remains_time: number;
}

interface QuotaApiResponse {
  model_remains: ModelRemain[];
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export default defineCommand({
  name: 'quota show',
  description: 'Display Token Plan usage and remaining quotas',
  usage: 'minimax quota show',
  examples: [
    'minimax quota show',
    'minimax quota show --output json',
  ],
  async run(config: Config, flags: GlobalFlags) {
    if (config.dryRun) {
      console.log('Would fetch quota information.');
      return;
    }

    const url = quotaEndpoint(config.baseUrl);
    const response = await requestJson<QuotaApiResponse>(config, { url });
    const models = response.model_remains || [];
    const format = detectOutputFormat(config.output);

    if (format !== 'text') {
      console.log(formatOutput(response, format));
      return;
    }

    if (config.quiet) {
      for (const m of models) {
        const remaining = m.current_interval_total_count - m.current_interval_usage_count;
        console.log(`${m.model_name}\t${m.current_interval_usage_count}\t${m.current_interval_total_count}\t${remaining}`);
      }
      return;
    }

    if (models.length > 0) {
      const first = models[0]!;
      console.log(`week: ${formatDate(first.weekly_start_time)} — ${formatDate(first.weekly_end_time)}`);
      console.log('');
    }

    const tableData = models.map(m => {
      const used = m.current_interval_usage_count;
      const limit = m.current_interval_total_count;
      const weekUsed = m.current_weekly_usage_count;
      const weekLimit = m.current_weekly_total_count;
      const resets = formatDuration(m.remains_time);

      return {
        MODEL: m.model_name,
        USED: `${used.toLocaleString()} / ${limit.toLocaleString()}`,
        WEEKLY: `${weekUsed.toLocaleString()} / ${weekLimit.toLocaleString()}`,
        RESETS_IN: resets,
      };
    });

    console.log(formatTable(tableData));
  },
});
