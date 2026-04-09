import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { requestJson } from '../../client/http';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import { isInteractive } from '../../utils/env';
import { promptText, failIfMissing } from '../../utils/prompt';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { VoiceDesignResponse } from '../../types/api';

export default defineCommand({
  name: 'speech design',
  description: 'Design a custom voice from a text description',
  usage: 'mmx speech design --prompt <text> [flags]',
  options: [
    { flag: '--prompt <text>', description: 'Voice description (e.g. "warm female alto, calm tone")', required: true },
    { flag: '--preview-text <text>', description: 'Text to generate a preview with the designed voice' },
    { flag: '--voice-id <id>', description: 'Custom voice ID to assign to the designed voice' },
    { flag: '--out <path>', description: 'Save design result to JSON file' },
  ],
  examples: [
    'mmx speech design --prompt "warm female alto, calm and soothing tone"',
    'mmx speech design --prompt "energetic young male voice" --preview-text "Hello, this is a test."',
  ],
  async run(config: Config, flags: GlobalFlags) {
    let prompt = flags.prompt as string | undefined;

    if (!prompt) {
      if (isInteractive({ nonInteractive: config.nonInteractive })) {
        prompt = await promptText({ message: 'Describe the voice you want:' });
        if (!prompt) {
          process.stderr.write('Voice design cancelled.\n');
          process.exit(1);
        }
      } else {
        failIfMissing('prompt', 'mmx speech design --prompt <text>');
      }
    }

    const previewText = flags.previewText as string | undefined;
    const voiceId = flags.voiceId as string | undefined;
    const format = detectOutputFormat(config.output);

    const body: Record<string, unknown> = {
      prompt,
    };
    if (previewText) body.preview_text = previewText;
    if (voiceId) body.voice_id = voiceId;

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = `${config.baseUrl}/v1/voice_design`;
    const response = await requestJson<VoiceDesignResponse>(config, {
      url,
      method: 'POST',
      body,
    });

    if (config.quiet) {
      console.log(JSON.stringify(response));
      return;
    }

    process.stdout.write(formatOutput(response, format) + '\n');
  },
});
