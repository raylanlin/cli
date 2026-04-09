import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { requestJson } from '../../client/http';
import { fileUploadEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import { isInteractive } from '../../utils/env';
import { promptText, failIfMissing } from '../../utils/prompt';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { FileUploadResponse, VoiceCloneResponse } from '../../types/api';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, basename } from 'path';

export default defineCommand({
  name: 'speech clone',
  description: 'Clone a voice from an audio sample',
  usage: 'mmx speech clone --audio <path> --voice-id <name> [flags]',
  options: [
    { flag: '--audio <path>', description: 'Path to the reference audio file (mp3/wav)', required: true },
    { flag: '--voice-id <name>', description: 'Unique identifier for the cloned voice', required: true },
    { flag: '--description <text>', description: 'Description of the cloned voice' },
    { flag: '--clone-prompt <text>', description: 'Text prompt to guide the cloning process' },
    { flag: '--out <path>', description: 'Save clone result to JSON file' },
  ],
  examples: [
    'mmx speech clone --audio reference.wav --voice-id my_voice',
    'mmx speech clone --audio sample.mp3 --voice-id narrator --description "Deep male narrator"',
  ],
  async run(config: Config, flags: GlobalFlags) {
    let audioPath = flags.audio as string | undefined;

    if (!audioPath) {
      if (isInteractive({ nonInteractive: config.nonInteractive })) {
        audioPath = await promptText({ message: 'Enter audio file path:' });
        if (!audioPath) {
          process.stderr.write('Voice cloning cancelled.\n');
          process.exit(1);
        }
      } else {
        failIfMissing('audio', 'mmx speech clone --audio <path>');
      }
    }

    const voiceId = flags.voiceId as string | undefined;
    if (!voiceId) {
      failIfMissing('voice-id', 'mmx speech clone --audio <path> --voice-id <name>');
    }

    const fullPath = resolve(audioPath);
    if (!config.dryRun && !existsSync(fullPath)) {
      throw new CLIError(`Audio file not found: ${fullPath}`, ExitCode.USAGE);
    }

    const description = flags.description as string | undefined;
    const clonePrompt = flags.clonePrompt as string | undefined;
    const format = detectOutputFormat(config.output);

    if (config.dryRun) {
      console.log(formatOutput({ request: { audio: fullPath, voice_id: voiceId, description, clone_prompt: clonePrompt } }, format));
      return;
    }

    // Step 1: Upload audio file with purpose=voice_clone
    const formData = new FormData();
    const fileData = await readFile(fullPath);
    const fileName = basename(fullPath);
    formData.append('file', new Blob([fileData]), fileName);
    formData.append('purpose', 'voice_clone');

    const uploadUrl = fileUploadEndpoint(config.baseUrl);
    const uploadResponse = await requestJson<FileUploadResponse>(config, {
      url: uploadUrl,
      method: 'POST',
      body: formData,
    });

    const fileId = uploadResponse.file?.file_id;
    if (!fileId) {
      throw new CLIError('File upload succeeded but no file_id returned.', ExitCode.GENERAL);
    }

    if (!config.quiet) {
      process.stderr.write(`[Uploaded: ${fileId}]\n`);
    }

    // Step 2: Call voice clone API
    const voiceCloneUrl = `${config.baseUrl}/v1/voice_clone`;
    const cloneBody: Record<string, unknown> = {
      file_id: fileId,
      voice_id: voiceId,
    };
    if (description) cloneBody.description = description;
    if (clonePrompt) cloneBody.clone_prompt = clonePrompt;

    const cloneResponse = await requestJson<VoiceCloneResponse>(config, {
      url: voiceCloneUrl,
      method: 'POST',
      body: cloneBody,
    });

    if (config.quiet) {
      console.log(JSON.stringify(cloneResponse));
      return;
    }

    process.stdout.write(formatOutput(cloneResponse, format) + '\n');
  },
});
