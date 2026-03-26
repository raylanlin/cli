// ---- Text / Chat ----

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ChatTool[];
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatStreamDelta {
  id: string;
  choices: Array<{
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
    index: number;
  }>;
}

// ---- Speech / TTS ----

export interface SpeechRequest {
  model: string;
  text: string;
  voice_setting: {
    voice_id: string;
    speed?: number;
    vol?: number;
    pitch?: number;
  };
  audio_setting: {
    format?: string;
    sample_rate?: number;
    bitrate?: number;
    channel?: number;
  };
  language_boost?: string;
  pronunciation_dict?: Array<{ tone: string; text: string }>;
  output_format?: 'url' | 'hex';
  stream?: boolean;
  subtitle?: boolean;
}

export interface SpeechResponse {
  base_resp: BaseResp;
  data: {
    audio?: string; // hex-encoded audio data
    audio_url?: string;
    subtitle_info?: SubtitleInfo;
    status: number;
  };
  extra_info?: {
    audio_length?: number;
    audio_sample_rate?: number;
    audio_size?: number;
    bitrate?: number;
    word_count?: number;
    invisible_character_ratio?: number;
  };
}

export interface SubtitleInfo {
  subtitles: Array<{
    text: string;
    start_time: number;
    end_time: number;
  }>;
}

// ---- Image ----

export interface ImageRequest {
  model: string;
  prompt: string;
  aspect_ratio?: string;
  n?: number;
  subject_reference?: Array<{
    type: string;
    image_url?: string;
    image_file?: string;
  }>;
}

export interface ImageResponse {
  base_resp: BaseResp;
  data: {
    image_urls: string[];
    task_id: string;
    success_count: number;
    failed_count: number;
  };
}

// ---- Video ----

export interface VideoRequest {
  model: string;
  prompt: string;
  first_frame_image?: string;
  callback_url?: string;
}

export interface VideoResponse {
  base_resp: BaseResp;
  task_id: string;
  status: string;
}

export interface VideoTaskResponse {
  base_resp: BaseResp;
  task_id: string;
  status: 'Queueing' | 'Processing' | 'Success' | 'Failed' | 'Unknown';
  file_id?: string;
  video_width?: number;
  video_height?: number;
}

// ---- Music ----

export interface MusicRequest {
  model: string;
  prompt?: string;
  lyrics?: string;
  auto_lyrics?: boolean;
  audio_setting?: {
    format?: string;
    sample_rate?: number;
    bitrate?: number;
  };
  output_format?: 'url' | 'hex';
  stream?: boolean;
}

export interface MusicResponse {
  base_resp: BaseResp;
  data: {
    audio?: string;
    audio_url?: string;
    status: number;
  };
  extra_info?: {
    audio_length?: number;
    audio_sample_rate?: number;
    audio_size?: number;
    bitrate?: number;
  };
}

// ---- Quota ----

export interface QuotaResponse {
  model_remains: QuotaModelRemain[];
}

export interface QuotaModelRemain {
  model_name: string;
  start_time: number;
  end_time: number;
  remains_time: number;
  current_interval_total_count: number;
  current_interval_usage_count: number;
  current_weekly_total_count: number;
  current_weekly_usage_count: number;
  weekly_start_time: number;
  weekly_end_time: number;
  weekly_remains_time: number;
}

// ---- File ----

export interface FileRetrieveResponse {
  base_resp: BaseResp;
  file: {
    file_id: string;
    bytes: number;
    created_at: number;
    filename: string;
    purpose: string;
    download_url?: string;
  };
}

// ---- Common ----

export interface BaseResp {
  status_code: number;
  status_msg: string;
}
