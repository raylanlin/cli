import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { request, requestJson } from '../../client/http';
import { chatEndpoint } from '../../client/endpoints';
import { parseSSE } from '../../client/stream';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { ChatMessage, ChatRequest, ChatResponse, ChatStreamDelta } from '../../types/api';
import { readFileSync } from 'fs';

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
}

function parseMessages(flags: GlobalFlags): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (flags.system) {
    messages.push({ role: 'system', content: flags.system as string });
  }

  if (flags.messagesFile) {
    const filePath = flags.messagesFile as string;
    const raw = filePath === '-'
      ? readFileSync('/dev/stdin', 'utf-8')
      : readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as ChatMessage[];
    messages.push(...parsed);
  }

  if (flags.message) {
    const msgs = flags.message as string[];
    for (const m of msgs) {
      const colonIdx = m.indexOf(':');
      if (colonIdx === -1) {
        messages.push({ role: 'user', content: m });
      } else {
        const role = m.slice(0, colonIdx) as ChatMessage['role'];
        const content = m.slice(colonIdx + 1);
        if (!['system', 'user', 'assistant'].includes(role)) {
          throw new CLIError(
            `Invalid message role "${role}". Valid: system, user, assistant`,
            ExitCode.USAGE,
          );
        }
        messages.push({ role, content });
      }
    }
  }

  return messages;
}

export default defineCommand({
  name: 'text chat',
  description: 'Send a chat completion (M2.7 / M2.7-highspeed)',
  usage: 'minimax text chat --message <role:content> [flags]',
  examples: [
    'minimax text chat --message "user:What is MiniMax?"',
    'minimax text chat --model MiniMax-M2.7-highspeed --system "You are a coding assistant." --message "user:Write fizzbuzz in Python"',
    'cat conversation.json | minimax text chat --messages-file - --stream',
    'minimax text chat --message "user:Hello" --output json',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const messages = parseMessages(flags);

    if (messages.length === 0) {
      throw new CLIError(
        '--message or --messages-file is required.',
        ExitCode.USAGE,
        'minimax text chat --message "user:Hello"',
      );
    }

    const model = (flags.model as string) || 'MiniMax-M2.7';
    const shouldStream = flags.stream === true || (flags.stream === undefined && process.stdout.isTTY);
    const format = detectOutputFormat(config.output);

    const body: ChatRequest = {
      model,
      messages,
      stream: shouldStream,
    };

    if (flags.maxTokens) body.max_tokens = flags.maxTokens as number;
    if (flags.temperature !== undefined) body.temperature = flags.temperature as number;
    if (flags.topP !== undefined) body.top_p = flags.topP as number;

    if (flags.tool) {
      const tools = (flags.tool as string[]).map(t => {
        try {
          return JSON.parse(t);
        } catch {
          const raw = readFileSync(t, 'utf-8');
          return JSON.parse(raw);
        }
      });
      body.tools = tools;
    }

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = chatEndpoint(config.baseUrl);

    if (shouldStream) {
      const res = await request(config, {
        url,
        method: 'POST',
        body,
        stream: true,
      });

      let fullContent = '';
      let inThinking = false;
      for await (const event of parseSSE(res)) {
        if (event.data === '[DONE]') break;
        try {
          const delta = JSON.parse(event.data) as ChatStreamDelta;
          const content = delta.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            // Buffer and strip <think>...</think> blocks from streaming output
            if (content.includes('<think>')) inThinking = true;
            if (!inThinking) {
              process.stdout.write(content);
            }
            if (content.includes('</think>')) {
              inThinking = false;
              // Emit anything after </think>
              const afterThink = content.split('</think>').pop()?.trim();
              if (afterThink) process.stdout.write(afterThink);
            }
          }
        } catch {
          // Skip unparseable chunks
        }
      }
      process.stdout.write('\n');

      if (format === 'json') {
        console.log(formatOutput({ content: stripThinking(fullContent) }, format));
      }
    } else {
      const response = await requestJson<ChatResponse>(config, {
        url,
        method: 'POST',
        body,
      });

      if (config.quiet) {
        console.log(stripThinking(response.choices[0]?.message?.content || ''));
        return;
      }

      if (format === 'text') {
        console.log(stripThinking(response.choices[0]?.message?.content || ''));
      } else {
        console.log(formatOutput(response, format));
      }
    }
  },
});
