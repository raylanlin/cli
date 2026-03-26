import { stringify as yamlStringify } from 'yaml';
import { formatText } from './text';
import { formatJson } from './json';

export type OutputFormat = 'text' | 'json' | 'yaml';

export function detectOutputFormat(flagValue?: string): OutputFormat {
  if (flagValue === 'json' || flagValue === 'yaml' || flagValue === 'text') {
    return flagValue;
  }
  if (!process.stdout.isTTY) {
    return 'json';
  }
  return 'text';
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJson(data);
    case 'yaml':
      return yamlStringify(data, { indent: 2 }).trimEnd();
    case 'text':
      return formatText(data);
  }
}
