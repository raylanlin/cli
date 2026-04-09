import { describe, it, expect } from 'bun:test';
import { default as generateCommand } from '../../../src/commands/video/generate';

const baseConfig = {
  apiKey: 'test-key',
  region: 'global' as const,
  baseUrl: 'https://api.mmx.io',
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

describe('video generate command', () => {
  it('has correct name', () => {
    expect(generateCommand.name).toBe('video generate');
  });

  it('requires prompt', async () => {
    await expect(
      generateCommand.execute(baseConfig, baseFlags),
    ).rejects.toThrow('Missing required argument: --prompt');
  });

  it('has all expected options defined', () => {
    const optionFlags = generateCommand.options?.map((o) => o.flag) ?? [];
    // Core options
    expect(optionFlags.some((f) => f.startsWith('--model'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--prompt'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--first-frame'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--callback-url'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--download'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--no-wait'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--async'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--poll-interval'))).toBe(true);
    // New options
    expect(optionFlags.some((f) => f.startsWith('--last-frame'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--subject-image'))).toBe(true);
  });

  it('dry-run includes --first-frame with URL', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'a cat',
        firstFrame: 'http://example.com/frame.jpg',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.first_frame_image).toBe('http://example.com/frame.jpg');
  });

  it('dry-run includes --last-frame (SEF mode)', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'walking forward',
        firstFrame: 'http://example.com/start.jpg',
        lastFrame: 'http://example.com/end.jpg',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.last_frame_image).toBe('http://example.com/end.jpg');
  });

  it('dry-run includes --subject-image (S2V-01 mode)', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'detective walking',
        subjectImage: 'http://example.com/character.jpg',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.subject_reference).toBeDefined();
    expect(parsed.request.subject_reference[0].type).toBe('character');
  });

  it('dry-run with --first-frame + --last-frame switches model to Hailuo-02', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'walking',
        firstFrame: 'http://example.com/a.jpg',
        lastFrame: 'http://example.com/b.jpg',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.model).toBe('MiniMax-Hailuo-02');
  });

  it('dry-run with --subject-image switches model to S2V-01', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'detective',
        subjectImage: 'http://example.com/face.jpg',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.model).toBe('S2V-01');
  });

  it('dry-run with explicit --model overrides auto-switch', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'test',
        subjectImage: 'http://example.com/face.jpg',
        model: 'MiniMax-Hailuo-2.3',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.model).toBe('MiniMax-Hailuo-2.3');
  });

  it('examples include SEF and subject-reference usage', () => {
    const examples = generateCommand.examples ?? [];
    const joined = examples.join(' ');
    expect(joined).toContain('--last-frame');
    expect(joined).toContain('--subject-image');
    expect(joined).toContain('Hailuo-02');
    expect(joined).toContain('S2V-01');
  });
});
