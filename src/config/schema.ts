import { z } from 'zod';

export const REGIONS = {
  global: 'https://api.minimax.io',
  cn: 'https://api.minimaxi.com',
} as const;

export type Region = keyof typeof REGIONS;

export const ConfigSchema = z.object({
  api_key: z.string().optional(),
  region: z.enum(['global', 'cn']).default('global'),
  base_url: z.string().url().optional(),
  output: z.enum(['text', 'json', 'yaml']).default('text'),
  timeout: z.number().positive().default(300),
});

export type ConfigFile = z.infer<typeof ConfigSchema>;

export interface Config {
  apiKey?: string;
  fileApiKey?: string;
  region: Region;
  baseUrl: string;
  output: 'text' | 'json' | 'yaml';
  timeout: number;
  verbose: boolean;
  quiet: boolean;
  noColor: boolean;
  yes: boolean;
  dryRun: boolean;
  needsRegionDetection?: boolean;
}
