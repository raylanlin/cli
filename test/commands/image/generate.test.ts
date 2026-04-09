import { describe, it, expect } from 'bun:test';
import { default as generateCommand } from '../../../src/commands/image/generate';

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

describe('image generate command', () => {
  it('has correct name', () => {
    expect(generateCommand.name).toBe('image generate');
  });

  it('requires prompt', async () => {
    await expect(
      generateCommand.execute(baseConfig, baseFlags),
    ).rejects.toThrow('Missing required argument: --prompt');
  });

  it('has all expected options defined', () => {
    const optionFlags = generateCommand.options?.map((o) => o.flag) ?? [];
    // Core options
    expect(optionFlags.some((f) => f.startsWith('--prompt'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--aspect-ratio'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--n'))).toBe(true);
    // New options
    expect(optionFlags.some((f) => f.startsWith('--seed'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--width'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--height'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--prompt-optimizer'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--aigc-watermark'))).toBe(true);
    expect(optionFlags.some((f) => f.startsWith('--subject-ref'))).toBe(true);
  });

  it('dry-run includes --seed', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'a cat', seed: 42,
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.seed).toBe(42);
  });

  it('dry-run includes --width and --height', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'landscape', width: 1920, height: 1080,
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.width).toBe(1920);
    expect(parsed.request.height).toBe(1080);
  });

  it('dry-run includes --prompt-optimizer', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'sunset', promptOptimizer: true,
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.prompt_optimizer).toBe(true);
  });

  it('dry-run includes --aigc-watermark', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'sunset', aigcWatermark: true,
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.aigc_watermark).toBe(true);
  });

  it('dry-run includes --subject-ref', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'test',
        subjectRef: 'type=character,image=http://example.com/face.jpg',
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.subject_reference).toBeDefined();
    expect(parsed.request.subject_reference[0].type).toBe('character');
  });

  it('rejects --width < 512', async () => {
    await expect(
      generateCommand.execute(
        { ...baseConfig, dryRun: true },
        { ...baseFlags, dryRun: true, prompt: 'test', width: 256 },
      ),
    ).rejects.toThrow('--width must be between 512 and 2048 and a multiple of 8');
  });

  it('rejects --width > 2048', async () => {
    await expect(
      generateCommand.execute(
        { ...baseConfig, dryRun: true },
        { ...baseFlags, dryRun: true, prompt: 'test', width: 4096 },
      ),
    ).rejects.toThrow('--width must be between 512 and 2048 and a multiple of 8');
  });

  it('rejects --width not multiple of 8', async () => {
    await expect(
      generateCommand.execute(
        { ...baseConfig, dryRun: true },
        { ...baseFlags, dryRun: true, prompt: 'test', width: 513 },
      ),
    ).rejects.toThrow('--width must be between 512 and 2048 and a multiple of 8');
  });

  it('rejects --height < 512', async () => {
    await expect(
      generateCommand.execute(
        { ...baseConfig, dryRun: true },
        { ...baseFlags, dryRun: true, prompt: 'test', height: 256 },
      ),
    ).rejects.toThrow('--height must be between 512 and 2048 and a multiple of 8');
  });

  it('rejects --height not multiple of 8', async () => {
    await expect(
      generateCommand.execute(
        { ...baseConfig, dryRun: true },
        { ...baseFlags, dryRun: true, prompt: 'test', height: 770 },
      ),
    ).rejects.toThrow('--height must be between 512 and 2048 and a multiple of 8');
  });

  it('accepts valid --width 512 (minimum, multiple of 8)', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'test', width: 512,
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.width).toBe(512);
  });

  it('accepts valid --width 2048 (maximum, multiple of 8)', async () => {
    const config = { ...baseConfig, dryRun: true, output: 'json' as const };
    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => { output += msg; };

    try {
      await generateCommand.execute(config, {
        ...baseFlags, dryRun: true, prompt: 'test', width: 2048,
      });
    } catch { /* dry-run may exit(0) */ } finally {
      console.log = originalLog;
    }

    const parsed = JSON.parse(output);
    expect(parsed.request.width).toBe(2048);
  });

  it('examples include new parameter usage', () => {
    const examples = generateCommand.examples ?? [];
    const joined = examples.join(' ');
    expect(joined).toContain('--seed');
    expect(joined).toContain('--width');
    expect(joined).toContain('--prompt-optimizer');
    expect(joined).toContain('--aigc-watermark');
  });
});
