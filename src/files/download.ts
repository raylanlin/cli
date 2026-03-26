import { createWriteStream } from 'fs';
import { createProgressBar } from '../output/progress';

export async function downloadFile(
  url: string,
  destPath: string,
  opts?: { quiet?: boolean },
): Promise<{ size: number }> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const writer = createWriteStream(destPath);
  const progress = contentLength > 0 && !opts?.quiet
    ? createProgressBar(contentLength, 'Downloading')
    : null;

  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writer.write(value);
      received += value.byteLength;
      progress?.update(received);
    }
  } finally {
    reader.releaseLock();
    writer.end();
    progress?.finish();
  }

  return { size: received };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
