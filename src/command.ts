import type { Config } from './config/schema';
import type { GlobalFlags } from './types/flags';

export interface Command {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  execute(config: Config, flags: GlobalFlags): Promise<void>;
}

export interface CommandSpec {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  run(config: Config, flags: GlobalFlags): Promise<void>;
}

export function defineCommand(spec: CommandSpec): Command {
  return {
    name: spec.name,
    description: spec.description,
    usage: spec.usage,
    examples: spec.examples,
    execute: spec.run,
  };
}
