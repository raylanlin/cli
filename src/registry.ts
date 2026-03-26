import type { Command } from './command';
import { CLIError } from './errors/base';
import { ExitCode } from './errors/codes';

import authLogin from './commands/auth/login';
import authStatus from './commands/auth/status';
import authRefresh from './commands/auth/refresh';
import authLogout from './commands/auth/logout';
import textChat from './commands/text/chat';
import speechSynthesize from './commands/speech/synthesize';
import imageGenerate from './commands/image/generate';
import videoGenerate from './commands/video/generate';
import videoTaskGet from './commands/video/task-get';
import videoDownload from './commands/video/download';
import musicGenerate from './commands/music/generate';
import searchQuery from './commands/search/query';
import visionDescribe from './commands/vision/describe';
import quotaShow from './commands/quota/show';
import configShow from './commands/config/show';
import configSet from './commands/config/set';

interface CommandNode {
  command?: Command;
  children: Map<string, CommandNode>;
}

class CommandRegistry {
  private root: CommandNode = { children: new Map() };

  constructor(commands: Record<string, Command>) {
    for (const [path, cmd] of Object.entries(commands)) {
      this.register(path, cmd);
    }
  }

  private register(path: string, command: Command): void {
    const parts = path.split(' ');
    let node = this.root;
    for (const part of parts) {
      if (!node.children.has(part)) {
        node.children.set(part, { children: new Map() });
      }
      node = node.children.get(part)!;
    }
    node.command = command;
  }

  resolve(commandPath: string[]): Command {
    let node = this.root;
    const matched: string[] = [];

    for (const part of commandPath) {
      const child = node.children.get(part);
      if (!child) break;
      node = child;
      matched.push(part);
    }

    if (node.command) {
      return node.command;
    }

    // If we matched some path but no command, show help for that group
    if (matched.length > 0 && node.children.size > 0) {
      const subcommands = Array.from(node.children.entries())
        .map(([name, n]) => {
          if (n.command) return `  ${matched.join(' ')} ${name}    ${n.command.description}`;
          // Group with sub-children
          const subs = Array.from(n.children.keys()).join(', ');
          return `  ${matched.join(' ')} ${name} [${subs}]`;
        })
        .join('\n');
      throw new CLIError(
        `Unknown command: minimax ${commandPath.join(' ')}\n\nAvailable commands:\n${subcommands}`,
        ExitCode.USAGE,
        `minimax ${matched.join(' ')} --help`,
      );
    }

    throw new CLIError(
      `Unknown command: minimax ${commandPath.join(' ')}`,
      ExitCode.USAGE,
      'minimax --help',
    );
  }

  printHelp(commandPath: string[]): void {
    if (commandPath.length === 0) {
      this.printRootHelp();
      return;
    }

    let node = this.root;
    for (const part of commandPath) {
      const child = node.children.get(part);
      if (!child) {
        this.printRootHelp();
        return;
      }
      node = child;
    }

    if (node.command) {
      this.printCommandHelp(node.command);
      return;
    }

    // Group help
    console.log(`\nUsage: minimax ${commandPath.join(' ')} <command> [flags]\n`);
    console.log('Commands:');
    this.printChildren(node, commandPath.join(' '));
    console.log('');
  }

  private printRootHelp(): void {
    console.log(`
  __  __ ___ _   _ ___ __  __    _   __  __
 |  \\/  |_ _| \\ | |_ _|  \\/  |  / \\ \\ \\/ /
 | |\\/| || ||  \\| || || |\\/| | / _ \\ \\  /
 | |  | || || |\\  || || |  | |/ ___ \\/  \\
 |_|  |_|___|_| \\_|___|_|  |_/_/   \\_\\/_/\\

Usage: minimax <resource> <command> [flags]

Resources:
  auth       Authentication (login, status, refresh, logout)
  text       Text generation (chat)
  speech     Speech synthesis (synthesize)
  image      Image generation (generate)
  video      Video generation (generate, task get, download)
  music      Music generation (generate)
  search     Web search (query)
  vision     Image understanding (describe)
  quota      Usage quotas (show)
  config     CLI configuration (show, set)

Global Flags:
  --api-key <key>        API key (overrides all other auth)
  --region <region>      API region: global (default), cn
  --base-url <url>       API base URL (overrides region)
  --output <format>      Output format: text, json, yaml
  --quiet                Suppress non-essential output
  --verbose              Print HTTP request/response details
  --timeout <seconds>    Request timeout (default: 300)
  --no-color             Disable ANSI colors and spinners
  --yes                  Skip confirmation prompts
  --dry-run              Show what would happen without executing
  --version              Print version and exit
  --help                 Show help

Run 'minimax <resource> <command> --help' for command-specific help.
`);
  }

  private printCommandHelp(cmd: Command): void {
    console.log(`\n${cmd.description}\n`);
    if (cmd.usage) {
      console.log(`Usage: ${cmd.usage}\n`);
    }
    if (cmd.examples && cmd.examples.length > 0) {
      console.log('Examples:');
      for (const ex of cmd.examples) {
        console.log(`  ${ex}`);
      }
      console.log('');
    }
  }

  private printChildren(node: CommandNode, prefix: string): void {
    for (const [name, child] of node.children) {
      if (child.command) {
        console.log(`  ${prefix} ${name.padEnd(12)} ${child.command.description}`);
      }
      if (child.children.size > 0) {
        this.printChildren(child, `${prefix} ${name}`);
      }
    }
  }
}

export const registry = new CommandRegistry({
  'auth login':        authLogin,
  'auth status':       authStatus,
  'auth refresh':      authRefresh,
  'auth logout':       authLogout,
  'text chat':         textChat,
  'speech synthesize': speechSynthesize,
  'image generate':    imageGenerate,
  'video generate':    videoGenerate,
  'video task get':    videoTaskGet,
  'video download':    videoDownload,
  'music generate':    musicGenerate,
  'search query':      searchQuery,
  'vision describe':   visionDescribe,
  'quota show':        quotaShow,
  'config show':       configShow,
  'config set':        configSet,
});
