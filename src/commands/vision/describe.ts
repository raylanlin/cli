import { defineCommand } from '../../command';
import { requestJson } from '../../client/http';
import { vlmEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

interface VlmResponse {
  content: string;
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function toDataUri(image: string): Promise<string> {
  if (image.startsWith('data:')) {
    return image;
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    const res = await fetch(image);
    if (!res.ok) {
      throw new CLIError(
        `Failed to download image: HTTP ${res.status}`,
        ExitCode.GENERAL,
      );
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mime = contentType.split(';')[0]!.trim();
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');
    return `data:${mime};base64,${b64}`;
  }

  // Local file
  if (!existsSync(image)) {
    throw new CLIError(
      `File not found: ${image}`,
      ExitCode.USAGE,
    );
  }

  const ext = extname(image).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) {
    throw new CLIError(
      `Unsupported image format "${ext}". Supported: jpg, jpeg, png, webp`,
      ExitCode.USAGE,
    );
  }

  const buf = readFileSync(image);
  const b64 = buf.toString('base64');
  return `data:${mime};base64,${b64}`;
}

export default defineCommand({
  name: 'vision describe',
  description: 'Describe an image using MiniMax VLM',
  usage: 'minimax vision describe --image <path-or-url> [--prompt <text>]',
  examples: [
    'minimax vision describe --image photo.jpg',
    'minimax vision describe --image https://example.com/photo.jpg --prompt "What breed is this dog?"',
    'minimax vision describe --image screenshot.png --prompt "Extract the text" --output json',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const image = flags.image as string | undefined;
    const prompt = (flags.prompt as string) || 'Describe the image.';

    if (!image) {
      throw new CLIError(
        '--image is required.',
        ExitCode.USAGE,
        'minimax vision describe --image <path-or-url>',
      );
    }

    const format = detectOutputFormat(config.output);

    if (config.dryRun) {
      console.log(formatOutput({ request: { prompt, image } }, format));
      return;
    }

    const imageUrl = await toDataUri(image);
    const url = vlmEndpoint(config.baseUrl);
    const response = await requestJson<VlmResponse>(config, {
      url,
      method: 'POST',
      body: { prompt, image_url: imageUrl },
    });

    if (format !== 'text') {
      console.log(formatOutput(response, format));
      return;
    }

    console.log(response.content);
  },
});
