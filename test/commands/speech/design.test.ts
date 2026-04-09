import { describe, it, expect } from 'bun:test';
import { default as designCommand } from '../../../src/commands/speech/design';

const baseConfig = {
  apiKey: 'test-key',
  region: 'global' as const,
  baseUrl: 'https://api.minimax.io',
  output: 'text' as const,
  timeout: 10,
  verbose: false,
  quiet: false,
  noColor: true,
  yes: false,
  dryRun: false,
  nonInteractive: true,
  async: false,
};

const baseFlags = {
  quiet: false,
  verbose: false,
  noColor: true,
  yes: false,
  dryRun: false,
  help: false,
  nonInteractive: true,
  async: false,
};

describe('speech design command', () => {
  it('has correct name', () => {
    expect(designCommand.name).toBe('speech design');
  });

  it('requires --prompt', async () => {
    await expect(
      designCommand.execute(baseConfig, baseFlags),
    ).rejects.toThrow('Missing required argument: --prompt');
  });

  it('dry-run outputs request with prompt', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await designCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'warm female alto, calm tone',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.prompt).toBe('warm female alto, calm tone');
  });

  it('dry-run outputs request with preview-text', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await designCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'test voice', previewText: 'Hello world',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.preview_text).toBe('Hello world');
  });

  it('dry-run outputs request with voice-id', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await designCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'test', voiceId: 'custom_voice_01',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.voice_id).toBe('custom_voice_01');
  });

  it('has all expected options defined', () => {
    const optionFlags = designCommand.options?.map((o) => o.flag) ?? [];
    expect(optionFlags.some((f) => f.startsWith('--prompt'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--preview-text'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--voice-id'))).toBe(true);
  });

  it('examples include design usage', () => {
    const examples = designCommand.examples ?? [];
    const joined = examples.join(' ');
    expect(joined).toContain('--prompt');
    expect(joined).toContain('--preview-text');
  });
});
