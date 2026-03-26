import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { requestJson } from '../../client/http';
import { videoGenerateEndpoint, videoTaskEndpoint } from '../../client/endpoints';
import { poll } from '../../polling/poll';
import { downloadFile, formatBytes } from '../../files/download';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { VideoRequest, VideoResponse, VideoTaskResponse, FileRetrieveResponse } from '../../types/api';
import { readFileSync } from 'fs';

export default defineCommand({
  name: 'video generate',
  description: 'Create a video generation task (Hailuo-2.3 / 2.3-Fast)',
  usage: 'minimax video generate --prompt <text> [flags]',
  examples: [
    'minimax video generate --prompt "A man reads a book. Static shot."',
    'minimax video generate --prompt "Mouse runs toward camera." --first-frame ./mouse.jpg --model MiniMax-Hailuo-2.3-Fast',
    'minimax video generate --prompt "Ocean waves at sunset." --wait --download sunset.mp4',
    'TASK_ID=$(minimax video generate --prompt "A robot painting." --quiet)',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const prompt = flags.prompt as string | undefined;
    if (!prompt) {
      throw new CLIError(
        '--prompt is required for video generation.',
        ExitCode.USAGE,
        'minimax video generate --prompt <text> [--model <model>]',
      );
    }

    const model = (flags.model as string) || 'MiniMax-Hailuo-2.3';
    const format = detectOutputFormat(config.output);

    const body: VideoRequest = {
      model,
      prompt,
    };

    if (flags.firstFrame) {
      const framePath = flags.firstFrame as string;
      if (framePath.startsWith('http')) {
        body.first_frame_image = framePath;
      } else {
        const imgData = readFileSync(framePath);
        body.first_frame_image = `data:image/jpeg;base64,${imgData.toString('base64')}`;
      }
    }

    if (flags.callbackUrl) {
      body.callback_url = flags.callbackUrl as string;
    }

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = videoGenerateEndpoint(config.baseUrl);
    const response = await requestJson<VideoResponse>(config, {
      url,
      method: 'POST',
      body,
    });

    const taskId = response.task_id;

    if (!flags.wait && !flags.download) {
      if (config.quiet) {
        console.log(taskId);
        return;
      }
      console.log(formatOutput({
        task_id: taskId,
        status: 'Submitted',
      }, format));
      return;
    }

    // Poll for completion
    const pollInterval = (flags.pollInterval as number) || 10;
    const taskUrl = videoTaskEndpoint(config.baseUrl, taskId);

    const result = await poll<VideoTaskResponse>(config, {
      url: taskUrl,
      intervalSec: pollInterval,
      timeoutSec: config.timeout,
      isComplete: (d) => (d as VideoTaskResponse).status === 'Success',
      isFailed: (d) => (d as VideoTaskResponse).status === 'Failed',
      getStatus: (d) => (d as VideoTaskResponse).status,
    });

    if (flags.download && result.file_id) {
      const destPath = flags.download as string;
      const fileInfoUrl = `${config.baseUrl}/v1/files/retrieve?file_id=${result.file_id}`;
      const fileInfo = await requestJson<FileRetrieveResponse>(config, { url: fileInfoUrl });
      const downloadUrl = fileInfo.file?.download_url;

      if (downloadUrl) {
        const { size } = await downloadFile(downloadUrl, destPath, { quiet: config.quiet });
        if (config.quiet) {
          console.log(destPath);
        } else {
          console.log(formatOutput({
            task_id: taskId,
            status: 'Success',
            file_id: result.file_id,
            saved: destPath,
            size: formatBytes(size),
          }, format));
        }
        return;
      }
    }

    if (config.quiet) {
      console.log(taskId);
    } else {
      console.log(formatOutput({
        task_id: taskId,
        status: result.status,
        file_id: result.file_id,
        video_width: result.video_width,
        video_height: result.video_height,
      }, format));
    }
  },
});
