import { describe, it, expect } from 'bun:test';
import { default as cloneCommand } from '../../../src/commands/speech/clone';

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

describe('speech clone command', () => {
  it('has correct name', () => {
    expect(cloneCommand.name).toBe('speech clone');
  });

  it('requires --audio', async () => {
    await expect(
      cloneCommand.execute(baseConfig, { ...baseFlags, voiceId: 'test_voice' }),
    ).rejects.toThrow('Missing required argument: --audio');
  });

  it('requires --voice-id', async () => {
    await expect(
      cloneCommand.execute(baseConfig, { ...baseFlags, audio: '/tmp/test.wav' }),
    ).rejects.toThrow('Missing required argument: --voice-id');
  });

  it('dry-run outputs request with all fields', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await cloneCommand.execute(config, {
        ...baseFlags, dryRun: true,
        audio: '/tmp/test.wav', voiceId: 'my_voice', description: 'Test voice',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.voice_id).toBe('my_voice');
    expect(parsed.request.description).toBe('Test voice');
    expect(parsed.request.audio).toBe('/tmp/test.wav');
  });

  it('rejects nonexistent audio file in non-dry-run mode', async () => {
    await expect(
      cloneCommand.execute(
        baseConfig,
        { ...baseFlags, audio: '/nonexistent/file.wav', voiceId: 'test' },
      ),
    ).rejects.toThrow('Audio file not found');
  });

  it('has all expected options defined', () => {
    const optionFlags = cloneCommand.options?.map((o) => o.flag) ?? [];
    expect(optionFlags.some((f) => f.startsWith('--audio'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--voice-id'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--description'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--clone-prompt'))).toBe(true);
  });

  it('examples include clone usage', () => {
    const examples = cloneCommand.examples ?? [];
    const joined = examples.join(' ');
    expect(joined).toContain('--audio');
    expect(joined).toContain('--voice-id');
  });
});
