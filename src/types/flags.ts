export interface GlobalFlags {
  apiKey?: string;
  baseUrl?: string;
  output?: string;
  quiet: boolean;
  verbose: boolean;
  timeout?: number;
  noColor: boolean;
  yes: boolean;
  dryRun: boolean;
  help: boolean;
  [key: string]: unknown;
}
