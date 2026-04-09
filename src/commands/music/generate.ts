import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { request, requestJson } from '../../client/http';
import { musicEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import { saveAudioOutput } from '../../output/audio';
import { readTextFromPathOrStdin } from '../../utils/fs';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { MusicRequest, MusicResponse } from '../../types/api';

export default defineCommand({
  name: 'music generate',
  description: 'Generate a song (music-2.5 / music-2.5+)',
  usage: 'mmx music generate --prompt <text> (--lyrics <text> | --instrumental) [--out <path>] [flags]',
  options: [
    { flag: '--prompt <text>', description: 'Music style description (e.g. "cinematic orchestral, building tension"). Max 2000 chars when combined with structured flags.' },
    { flag: '--lyrics <text>', description: 'Song lyrics with structure tags (newline separated). Supported: [Intro], [Verse], [Pre Chorus], [Chorus], [Interlude], [Bridge], [Outro], [Post Chorus], [Transition], [Break], [Hook], [Build Up], [Inst], [Solo]. ⚠️ Tags must be clean — no descriptions inside brackets (they will be sung). Max 3500 chars. Use "\u65e0\u6b4c\u8bcd" for instrumental workaround. Cannot be used with --instrumental.' },
    { flag: '--lyrics-file <path>', description: 'Read lyrics from file (use - for stdin). Same tag rules as --lyrics.' },
    { flag: '--vocals <text>', description: 'Vocal style, e.g. "warm male baritone", "bright female soprano", "duet with harmonies"' },
    { flag: '--genre <text>', description: 'Music genre, e.g. folk, pop, jazz, electronic' },
    { flag: '--mood <text>', description: 'Mood or emotion, e.g. warm, melancholic, uplifting' },
    { flag: '--instruments <text>', description: 'Instruments to feature, e.g. "acoustic guitar, piano, strings"' },
    { flag: '--tempo <text>', description: 'Tempo description, e.g. fast, slow, moderate' },
    { flag: '--bpm <number>', description: 'Exact tempo in beats per minute', type: 'number' },
    { flag: '--key <text>', description: 'Musical key, e.g. C major, A minor, G sharp' },
    { flag: '--avoid <text>', description: 'Elements to avoid in the generated music' },
    { flag: '--use-case <text>', description: 'Use case context, e.g. "background music for video", "theme song"' },
    { flag: '--structure <text>', description: 'Song structure, e.g. "verse-chorus-verse-bridge-chorus"' },
    { flag: '--references <text>', description: 'Reference tracks or artists, e.g. "similar to Ed Sheeran"' },
    { flag: '--extra <text>', description: 'Additional fine-grained requirements not covered above' },
    { flag: '--model <model>', description: 'Model: music-2.5 or music-2.5+ (recommended). music-2.5+ supports native is_instrumental.' },
    { flag: '--instrumental', description: 'Generate instrumental music (no vocals). music-2.5+: native is_instrumental flag. music-2.5: [intro][outro] lyrics workaround.' },
    { flag: '--lyrics-optimizer', description: 'Auto-generate lyrics from prompt. Only works when lyrics is empty. Supports music-2.5 and music-2.5+.' },
    { flag: '--output-format <fmt>', description: 'Return format: hex (default, saved to file) or url (24h expiry, download promptly). When --stream, only hex.' },
    { flag: '--aigc-watermark', description: 'Embed AI-generated content watermark. Only effective when --stream is false.' },
    { flag: '--format <fmt>', description: 'Audio format (default: mp3)' },
    { flag: '--sample-rate <hz>', description: 'Sample rate (default: 44100)', type: 'number' },
    { flag: '--bitrate <bps>',    description: 'Bitrate (default: 256000)', type: 'number' },
    { flag: '--stream', description: 'Stream raw audio to stdout' },
    { flag: '--out <path>', description: 'Save audio to file (uses hex decoding)' },
  ],
  examples: [
    'mmx music generate --prompt "Upbeat pop" --lyrics "La la la..." --out summer.mp3',
    'mmx music generate --prompt "Indie folk, melancholic" --lyrics-file song.txt --out my_song.mp3',
    '# Detailed prompt with vocal characteristics — music-2.5+ responds well to rich descriptions:',
    'mmx music generate --model "music-2.5+" --prompt "Warm morning folk" --vocals "male and female duet, harmonies in chorus" --instruments "acoustic guitar, piano" --bpm 95 --lyrics-file song.txt --out duet.mp3',
    '# Instrumental — music-2.5+ (native is_instrumental):',
    'mmx music generate --model "music-2.5+" --prompt "Cinematic orchestral" --instrumental --out bgm.mp3',
    '# Instrumental — music-2.5 (lyrics workaround):',
    'mmx music generate --prompt "Cinematic orchestral" --lyrics "无歌词" --out bgm.mp3',
    '# Auto-generate lyrics from prompt:',
    'mmx music generate --prompt "indie folk, melancholic" --lyrics-optimizer --out auto.mp3',
    '# URL output (24h expiry — download promptly):',
    'mmx music generate --prompt "Upbeat pop" --lyrics "La la la..." --output-format url --quiet',
    '# Album song with full arrangement:',
    'mmx music generate --model "music-2.5+" --prompt "Atmospheric electronic, B minor, 85 BPM" --lyrics-file "song.txt" --vocals "Warm male baritone" --genre "atmospheric electronic" --instruments "piano, strings" --bpm 85 --key "B minor" --structure "Intro-Verse-Chorus-Bridge-Outro" --references "Bon Iver" --extra "Bridge drop-out." --out "demo.mp3"',
  ],
  async run(config: Config, flags: GlobalFlags) {
    let prompt = flags.prompt as string | undefined;
    let lyrics = flags.lyrics as string | undefined;

    if (flags.lyricsFile) {
      lyrics = readTextFromPathOrStdin(flags.lyricsFile as string);
    }

    const model = (flags.model as string) || 'music-2.5';
    const isInstrumental = flags.instrumental === true;
    const lyricsOptimizer = flags.lyricsOptimizer === true;
    let noLyricsInstrumental = false; // tracks "无歌词" on music-2.5+

    // Check for conflicting flags: --instrumental and --lyrics/--lyrics-file
    // "无歌词" and "no lyrics" are instrumental markers, not real lyrics
    const isInstrumentalMarker = lyrics === '无歌词' || lyrics === 'no lyrics';
    if (isInstrumental && (lyrics && !isInstrumentalMarker || flags.lyricsFile)) {
      throw new CLIError(
        'Cannot use --instrumental with --lyrics or --lyrics-file. For instrumental music, simply use --instrumental without --lyrics.',
        ExitCode.USAGE,
        'mmx music generate --prompt <style> --instrumental',
      );
    }

    // Build structured prompt from optional music characteristic flags.
    // music-2.5 / music-2.5+ interprets rich natural-language prompts — these flags make it
    // easy to describe vocal style, genre, mood, and instrumentation without
    // needing to hand-craft a long --prompt string.
    const structuredParts: string[] = [];
    if (flags.vocals)      structuredParts.push(`Vocals: ${flags.vocals as string}`);
    if (flags.genre)       structuredParts.push(`Genre: ${flags.genre as string}`);
    if (flags.mood)        structuredParts.push(`Mood: ${flags.mood as string}`);
    if (flags.instruments) structuredParts.push(`Instruments: ${flags.instruments as string}`);
    if (flags.tempo)       structuredParts.push(`Tempo: ${flags.tempo as string}`);
    if (flags.bpm)         structuredParts.push(`BPM: ${flags.bpm as number}`);
    if (flags.key)         structuredParts.push(`Key: ${flags.key as string}`);
    if (flags.avoid)       structuredParts.push(`Avoid: ${flags.avoid as string}`);
    if (flags.useCase)     structuredParts.push(`Use case: ${flags.useCase as string}`);
    if (flags.structure)   structuredParts.push(`Structure: ${flags.structure as string}`);
    if (flags.references)  structuredParts.push(`References: ${flags.references as string}`);
    if (flags.extra)       structuredParts.push(`Extra: ${flags.extra as string}`);

    // Handle --instrumental
    if (isInstrumental) {
      if (model === 'music-2.5+') {
        // music-2.5+: native is_instrumental flag — no prompt manipulation needed
        // (is_instrumental is set later in the body)
      } else {
        // music-2.5: lyrics workaround
        lyrics = '[intro] [outro]';
        structuredParts.push('Style: instrumental, no vocals, pure music');
      }
    }

    // Handle "无歌词" as instrumental request
    if (lyrics === '无歌词' || lyrics === 'no lyrics') {
      if (model === 'music-2.5+') {
        // music-2.5+: use native is_instrumental flag, clear lyrics
        noLyricsInstrumental = true;
        lyrics = undefined;
      } else {
        // music-2.5: lyrics workaround
        lyrics = '[intro] [outro]';
        structuredParts.push('Style: instrumental, no vocals, pure music');
      }
    }

    // Handle lyrics_optimizer: when true and lyrics is empty, API auto-generates lyrics
    if (lyricsOptimizer && !lyrics?.trim()) {
      lyrics = undefined;
    }

    if (!prompt && !lyrics) {
      throw new CLIError(
        'At least one of --prompt or --lyrics is required. Add --lyrics/--lyrics-file, use --instrumental, or enable --lyrics-optimizer to auto-generate lyrics from prompt.',
        ExitCode.USAGE,
        'mmx music generate --prompt <text> --lyrics <text>',
      );
    }

    // For music-2.5, lyrics is required (unless instrumental workaround)
    if (model === 'music-2.5' && !lyrics?.trim() && !isInstrumental && !lyricsOptimizer) {
      throw new CLIError(
        'The API requires lyrics for music-2.5. Add --lyrics or --lyrics-file, or use --instrumental (or --lyrics "无歌词") for instrumental output.',
        ExitCode.USAGE,
        'mmx music generate --prompt <text> --lyrics <text>',
      );
    }

    if (structuredParts.length > 0) {
      const structured = structuredParts.join('. ');
      prompt = prompt ? `${prompt}. ${structured}` : structured;
    }

    // No length truncation — let the API return proper errors if limits are exceeded.
    // Limits: prompt ≤ 2000 chars, lyrics ≤ 3500 chars

    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const ext = (flags.format as string) || 'mp3';
    const outPath = (flags.out as string | undefined) ?? `music_${ts}.${ext}`;

    // output_format: url (24h expiry) or hex (default)
    // When streaming, only hex is supported
    const isStreaming = flags.stream === true;
    const outputFormatFlag = flags.outputFormat as string | undefined;
    const outFormat: 'url' | 'hex' = isStreaming ? 'hex' : (outputFormatFlag === 'url' ? 'url' : 'hex');
    const format = detectOutputFormat(config.output);

    const body: MusicRequest = {
      model: model as 'music-2.5' | 'music-2.5+',
      prompt,
      lyrics,
      audio_setting: {
        format: (flags.format as string) || 'mp3',
        sample_rate: (flags.sampleRate as number) ?? 44100,
        bitrate: (flags.bitrate as number) ?? 256000,
      },
      output_format: outFormat,
      stream: isStreaming,
    };

    if (flags.aigcWatermark) {
      body.aigc_watermark = true;
    }

    if (lyricsOptimizer) {
      body.lyrics_optimizer = true;
    }

    if ((isInstrumental || noLyricsInstrumental) && model === 'music-2.5+') {
      body.is_instrumental = true;
    }

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = musicEndpoint(config.baseUrl);

    if (isStreaming) {
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

    if (!config.quiet) process.stderr.write(`[Model: ${model}]\n`);

    // URL output format: print URL to stdout (24h expiry — download promptly)
    if (outFormat === 'url' && response.data?.audio_url) {
      if (config.quiet) {
        console.log(response.data.audio_url);
      } else {
        console.log(formatOutput({
          url: response.data.audio_url,
          duration_ms: response.extra_info?.music_duration,
          size_bytes: response.extra_info?.music_size,
        }, format));
      }
      return;
    }

    saveAudioOutput(response, outPath, format, config.quiet);
  },
});
