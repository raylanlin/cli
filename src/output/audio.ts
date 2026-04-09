import { writeFileSync } from 'fs';
import type { OutputFormat } from './formatter';
import { formatOutput } from './formatter';

interface AudioExtraInfo {
  music_duration?: number;
  music_size?: number;
  music_sample_rate?: number;
  music_channel?: number;
  bitrate?: number;
}

interface AudioResponse {
  data: { audio?: string; audio_url?: string };
  extra_info?: AudioExtraInfo;
}

export function saveAudioOutput(
  response: AudioResponse,
  outPath: string | undefined,
  format: OutputFormat,
  quiet: boolean,
): void {
  if (outPath) {
    writeFileSync(outPath, Buffer.from(response.data.audio!, 'hex'));
    if (quiet) {
      console.log(outPath);
    } else {
      console.log(formatOutput({
        saved: outPath,
        duration_ms: response.extra_info?.music_duration,
        size_bytes: response.extra_info?.music_size,
        sample_rate: response.extra_info?.music_sample_rate,
      }, format));
    }
  } else {
    const audioUrl = response.data.audio_url ?? response.data.audio;
    if (quiet) {
      console.log(audioUrl);
    } else {
      console.log(formatOutput({
        url: audioUrl,
        duration_ms: response.extra_info?.music_duration,
        size_bytes: response.extra_info?.music_size,
      }, format));
    }
  }
}
