import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { request, requestJson } from '../../client/http';
import { musicEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { MusicRequest, MusicResponse } from '../../types/api';
import { readFileSync, writeFileSync } from 'fs';

export default defineCommand({
  name: 'music generate',
  description: 'Generate a song (music-2.5)',
  usage: 'minimax music generate --prompt <text> [--lyrics <text>] [--out <path>] [flags]',
  examples: [
    'minimax music generate --prompt "Indie folk, melancholic" --lyrics-file song.txt --out my_song.mp3',
    'minimax music generate --prompt "Upbeat pop" --auto-lyrics --out summer.mp3',
    'minimax music generate --prompt "Jazz lounge" --out-format url --output json',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const prompt = flags.prompt as string | undefined;
    let lyrics = flags.lyrics as string | undefined;

    if (flags.lyricsFile) {
      const path = flags.lyricsFile as string;
      lyrics = path === '-'
        ? readFileSync('/dev/stdin', 'utf-8')
        : readFileSync(path, 'utf-8');
    }

    if (!prompt && !lyrics) {
      throw new CLIError(
        'At least one of --prompt or --lyrics is required.',
        ExitCode.USAGE,
        'minimax music generate --prompt <text> [--lyrics <text>]',
      );
    }

    const outFormat = (flags.outFormat as string) || 'hex';
    const format = detectOutputFormat(config.output);

    const body: MusicRequest = {
      model: 'music-2.5',
      prompt,
      lyrics,
      auto_lyrics: flags.autoLyrics === true || undefined,
      audio_setting: {
        format: (flags.format as string) || 'mp3',
        sample_rate: (flags.sampleRate as number) || 44100,
        bitrate: (flags.bitrate as number) || 256000,
      },
      output_format: outFormat as 'url' | 'hex',
      stream: flags.stream === true,
    };

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = musicEndpoint(config.baseUrl);

    if (flags.stream) {
      const res = await request(config, { url, method: 'POST', body, stream: true });
      const reader = res.body?.getReader();
      if (!reader) throw new CLIError('No response body', ExitCode.GENERAL);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        process.stdout.write(value);
      }
      reader.releaseLock();
      return;
    }

    const response = await requestJson<MusicResponse>(config, {
      url,
      method: 'POST',
      body,
    });

    if (outFormat === 'url' && response.data.audio_url) {
      if (config.quiet) {
        console.log(response.data.audio_url);
      } else {
        console.log(formatOutput({
          url: response.data.audio_url,
          duration_ms: response.extra_info?.audio_length,
          size_bytes: response.extra_info?.audio_size,
        }, format));
      }
      return;
    }

    // Hex format — decode and write to file
    const outPath = flags.out as string;
    if (!outPath) {
      throw new CLIError(
        '--out is required when using hex output format.',
        ExitCode.USAGE,
        'minimax music generate --prompt <text> --out song.mp3',
      );
    }

    if (response.data.audio) {
      const audioBuffer = Buffer.from(response.data.audio, 'hex');
      writeFileSync(outPath, audioBuffer);

      if (config.quiet) {
        console.log(outPath);
      } else {
        console.log(formatOutput({
          saved: outPath,
          duration_ms: response.extra_info?.audio_length,
          size_bytes: response.extra_info?.audio_size,
          sample_rate: response.extra_info?.audio_sample_rate,
        }, format));
      }
    }
  },
});
