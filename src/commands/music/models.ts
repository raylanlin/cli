import type { Config } from '../../config/schema';

/**
 * sk-cp-xxx = Token Plan (coding plan) → standard models (music-2.6, music-cover)
 * sk-api-xxx / other = Pay as you go → free-tier models (music-2.6-free, music-cover-free)
 */
export function isCodingPlan(config: Config): boolean {
  const key = config.apiKey ?? config.fileApiKey ?? '';
  return key.startsWith('sk-cp-');
}

export function musicGenerateModel(config: Config): string {
  return isCodingPlan(config) ? 'music-2.6' : 'music-2.6-free';
}

export function musicCoverModel(config: Config): string {
  return isCodingPlan(config) ? 'music-cover' : 'music-cover-free';
}
