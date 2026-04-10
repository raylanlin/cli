---
name: mmx-cli
description: Use mmx to generate text, images, video, speech, and music via the MiniMax AI platform. Use when the user wants to create media content, chat with MiniMax models, perform web search, or manage MiniMax API resources from the terminal.
---

# MiniMax CLI — Agent Skill Guide

Use `mmx` to generate text, images, video, speech, music, and perform web search via the MiniMax AI platform.

## Prerequisites

```bash
# Install
npm install -g mmx-cli

# Auth (persisted to ~/.mmx/credentials.json)
mmx auth login --api-key sk-xxxxx

# Or pass per-call
mmx text chat --api-key sk-xxxxx --message "Hello"
```

Region is auto-detected. Override with `--region global` or `--region cn`.

---

## Agent Flags

Always use these flags in non-interactive (agent/CI) contexts:

| Flag | Purpose |
|---|---|
| `--non-interactive` | Fail fast on missing args instead of prompting |
| `--quiet` | Suppress spinners/progress; stdout is pure data |
| `--output json` | Machine-readable JSON output |
| `--async` | Return task ID immediately (video generation) |
| `--dry-run` | Preview the API request without executing |
| `--yes` | Skip confirmation prompts |

---

## Commands

### text chat

Chat completion. Default model: `MiniMax-M2.7`.

```bash
mmx text chat --message <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--message <text>` | string, **required**, repeatable | Message text. Prefix with `role:` to set role (e.g. `"system:You are helpful"`, `"user:Hello"`) |
| `--messages-file <path>` | string | JSON file with messages array. Use `-` for stdin |
| `--system <text>` | string | System prompt |
| `--model <model>` | string | Model ID (default: `MiniMax-M2.7`) |
| `--max-tokens <n>` | number | Max tokens (default: 4096) |
| `--temperature <n>` | number | Sampling temperature (0.0, 1.0] |
| `--top-p <n>` | number | Nucleus sampling threshold |
| `--stream` | boolean | Stream tokens (default: on in TTY) |
| `--tool <json-or-path>` | string, repeatable | Tool definition JSON or file path |

```bash
# Single message
mmx text chat --message "user:What is MiniMax?" --output json --quiet

# Multi-turn
mmx text chat \
  --system "You are a coding assistant." \
  --message "user:Write fizzbuzz in Python" \
  --output json

# From file
cat conversation.json | mmx text chat --messages-file - --output json
```

**stdout**: response text (text mode) or full response object (json mode).

---

### image generate

Generate images. Model: `image-01`.

```bash
mmx image generate --prompt <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string, **required** | Image description |
| `--aspect-ratio <ratio>` | string | e.g. `16:9`, `1:1` |
| `--n <count>` | number | Number of images (default: 1) |
| `--seed <n>` | number | Random seed for reproducible generation |
| `--width <px>` | number | Custom width [512–2048, must be multiple of 8] |
| `--height <px>` | number | Custom height [512–2048, must be multiple of 8] |
| `--prompt-optimizer` | boolean | Automatically optimize the prompt before generation |
| `--aigc-watermark` | boolean | Embed AI-generated content watermark |
| `--subject-ref <params>` | string | Subject reference: `type=character,image=path-or-url` |
| `--out-dir <dir>` | string | Download images to directory |
| `--out-prefix <prefix>` | string | Filename prefix (default: `image`) |

```bash
mmx image generate --prompt "A cat in a spacesuit" --output json --quiet
# stdout: image URLs (one per line in quiet mode)

mmx image generate --prompt "Logo" --n 3 --out-dir ./gen/ --quiet
# stdout: saved file paths (one per line)

# Reproducible generation
mmx image generate --prompt "A castle" --seed 42 --out-dir ./castle/ --quiet

# Custom dimensions (must be 512–2048, multiple of 8)
mmx image generate --prompt "Wide landscape" --width 1920 --height 1080 --out-dir ./land/ --quiet

# Optimized prompt with watermark
mmx image generate --prompt "sunset" --prompt-optimizer --aigc-watermark --out-dir ./opt/ --quiet
```

---

### video generate

Generate video. Default model: `MiniMax-Hailuo-2.3`. This is an async task — by default it polls until completion.

Auto-switches model based on flags: `--last-frame` → `MiniMax-Hailuo-02` (SEF), `--subject-image` → `S2V-01` (subject reference).

```bash
mmx video generate --prompt <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string, **required** | Video description |
| `--model <model>` | string | `MiniMax-Hailuo-2.3` (default), `MiniMax-Hailuo-2.3-Fast`. Auto-overridden by `--last-frame` (Hailuo-02) or `--subject-image` (S2V-01). |
| `--first-frame <path-or-url>` | string | First frame image |
| `--last-frame <path-or-url>` | string | Last frame image (SEF mode, auto-switches to Hailuo-02) |
| `--subject-image <path-or-url>` | string | Subject reference image for character consistency (auto-switches to S2V-01) |
| `--callback-url <url>` | string | Webhook URL for completion |
| `--download <path>` | string | Save video to specific file |
| `--async` | boolean | Return task ID immediately |
| `--no-wait` | boolean | Same as `--async` |
| `--poll-interval <seconds>` | number | Polling interval (default: 5) |

```bash
# Non-blocking: get task ID
mmx video generate --prompt "A robot." --async --quiet
# stdout: {"taskId":"..."}

# Blocking: wait and get file path
mmx video generate --prompt "Ocean waves." --download ocean.mp4 --quiet
# stdout: ocean.mp4

# SEF: first + last frame interpolation (uses Hailuo-02)
mmx video generate --prompt "Walk forward" --first-frame start.jpg --last-frame end.jpg --download walk.mp4

# Subject reference: character consistency (uses S2V-01)
mmx video generate --prompt "A detective walking" --subject-image character.jpg --download detective.mp4
```

### video task get

Query status of a video generation task.

```bash
mmx video task get --task-id <id> [--output json]
```

### video download

Download a completed video by task ID.

```bash
mmx video download --file-id <id> [--out <path>]
```

---

### speech synthesize

Text-to-speech. Default model: `speech-2.8-hd`. Max 10k chars.

```bash
mmx speech synthesize --text <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--text <text>` | string | Text to synthesize |
| `--text-file <path>` | string | Read text from file. Use `-` for stdin |
| `--model <model>` | string | `speech-2.8-hd` (default), `speech-2.6`, `speech-02` |
| `--voice <id>` | string | Voice ID (default: `English_expressive_narrator`) |
| `--speed <n>` | number | Speed multiplier |
| `--volume <n>` | number | Volume level |
| `--pitch <n>` | number | Pitch adjustment |
| `--format <fmt>` | string | Audio format (default: `mp3`) |
| `--sample-rate <hz>` | number | Sample rate (default: 32000) |
| `--bitrate <bps>` | number | Bitrate (default: 128000) |
| `--channels <n>` | number | Audio channels (default: 1) |
| `--language <code>` | string | Language boost |
| `--subtitles` | boolean | Include subtitle timing data |
| `--pronunciation <from/to>` | string, repeatable | Custom pronunciation |
| `--sound-effect <effect>` | string | Add sound effect |
| `--out <path>` | string | Save audio to file |
| `--stream` | boolean | Stream raw audio to stdout |

```bash
mmx speech synthesize --text "Hello world" --out hello.mp3 --quiet
# stdout: hello.mp3

echo "Breaking news." | mmx speech synthesize --text-file - --out news.mp3
```

### speech clone

Clone a voice from an audio sample. Two-step process: upload audio → clone.

```bash
mmx speech clone --audio <path> --voice-id <name> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--audio <path>` | string, **required** | Path to the reference audio file (mp3/wav) |
| `--voice-id <name>` | string, **required** | Unique identifier for the cloned voice |
| `--description <text>` | string | Description of the cloned voice |
| `--clone-prompt <text>` | string | Text prompt to guide the cloning process |
| `--out <path>` | string | Save clone result to JSON file |

```bash
mmx speech clone --audio reference.wav --voice-id my_voice --out clone_result.json --quiet
# stdout: clone result JSON
```

### speech design

Design a custom voice from a text description.

```bash
mmx speech design --prompt <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string, **required** | Voice description (e.g. "warm female alto, calm tone") |
| `--preview-text <text>` | string | Text to generate a preview with the designed voice |
| `--voice-id <id>` | string | Custom voice ID to assign to the designed voice |
| `--out <path>` | string | Save design result to JSON file |

```bash
mmx speech design --prompt "warm female alto, calm and soothing tone" --out design_result.json --quiet
# stdout: design result JSON

mmx speech design --prompt "energetic young male voice" --preview-text "Hello, this is a test." --quiet
```

---

### music generate

Generate music. Responds well to rich, structured descriptions.

**Models:** `music-2.6-free` (unlimited, RPM=3) · `music-2.5+` (recommended, native instrumental) · `music-2.5`

```bash
mmx music generate --prompt <text> [--lyrics <text>] [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--model <model>` | string | Model: `music-2.6-free` (unlimited), `music-2.5+` (recommended, native instrumental), `music-2.5` |
| `--prompt <text>` | string | Music style description. **Length limits**: instrumental ≤ 2000; others ≤ 2000 |
| `--lyrics <text>` | string | Song lyrics with structure tags, `\n` separated. **Length limits**: [1, 3500] for vocal. Use `"\u65e0\u6b4c\u8bcd"` for instrumental workaround. Cannot be used with `--instrumental` |
| `--lyrics-file <path>` | string | Read lyrics from file. Use `-` for stdin |
| `--lyrics-optimizer` | boolean | Auto-generate lyrics from prompt. Cannot be used with `--lyrics` or `--instrumental`. |
| `--instrumental` | boolean | Generate instrumental music (no vocals). Cannot be used with `--lyrics`. |
| `--vocals <text>` | string | Vocal style, e.g. `"warm male baritone"`, `"bright female soprano"`, `"duet with harmonies"` |
| `--genre <text>` | string | Music genre, e.g. folk, pop, jazz |
| `--mood <text>` | string | Mood or emotion, e.g. warm, melancholic, uplifting |
| `--instruments <text>` | string | Instruments to feature, e.g. `"acoustic guitar, piano"` |
| `--tempo <text>` | string | Tempo description, e.g. fast, slow, moderate |
| `--bpm <number>` | number | Exact tempo in beats per minute |
| `--key <text>` | string | Musical key, e.g. C major, A minor, G sharp |
| `--avoid <text>` | string | Elements to avoid in the generated music |
| `--use-case <text>` | string | Use case context, e.g. `"background music for video"`, `"theme song"` |
| `--structure <text>` | string | Song structure, e.g. `"verse-chorus-verse-bridge-chorus"` |
| `--references <text>` | string | Reference tracks or artists, e.g. `"similar to Ed Sheeran"` |
| `--extra <text>` | string | Additional fine-grained requirements |
| `--model <model>` | string | See model list above. Default: `music-2.6-free` |
| `--instrumental` | boolean | Generate instrumental music (no vocals). `music-2.5+`: native `is_instrumental` flag; `music-2.5`: lyrics workaround. Cannot be used with `--lyrics` |
| `--lyrics-optimizer` | boolean | Auto-generate lyrics from prompt when lyrics is empty. Supports all models. Default `false` |
| `--output-format <fmt>` | string | Return format: `hex` (default, save to file) or `url` (24h expiry, download promptly). When `--stream`, only `hex` |
| `--aigc-watermark` | boolean | Embed AI-generated content watermark. Only effective when `--stream` is `false` |
| `--format <fmt>` | string | Audio format (default: `mp3`) |
| `--sample-rate <hz>` | number | Sample rate (default: 44100) |
| `--bitrate <bps>` | number | Bitrate (default: 256000) |
| `--out <path>` | string | Save audio to file |
| `--stream` | boolean | Stream raw audio to stdout |

At least one of `--prompt` or `--lyrics` is required. For `music-2.5+` with `--instrumental`, only `--prompt` is needed. With `--lyrics-optimizer`, `--prompt` alone will auto-generate lyrics.

**⚠️ Prompt length limit: 2000 chars.** All structured flags (`--vocals`, `--genre`, `--mood`, `--instruments`, `--tempo`, `--bpm`, `--key`, `--avoid`, `--use-case`, `--structure`, `--references`, `--extra`) are concatenated into the final prompt sent to the API. Keep the combined length under 2000 chars — the API will return an error if exceeded, and the CLI does **not** auto-truncate.

#### Lyrics Structure Tags

**Correct format:**
```
[Intro]

[Verse]
我把笼子 走成天空
...

[Chorus]
走成天空 走成天空
...

[Outro]
```

**Incorrect format (will be sung):**
```
❌ [Verse: Clear vocals + piano]     ← Description inside tag
❌ [Chorus: Full drums + synth]      ← Description inside tag
```

**Key rule:** All arrangement instructions (piano, reverb, drums, etc.) go in `--prompt`, `--extra`, `--instruments` — **never in lyrics**.

#### Examples

```bash
# With lyrics
mmx music generate --prompt "Upbeat pop" --lyrics "La la la..." --out song.mp3 --quiet

# Auto-generate lyrics from prompt
mmx music generate --prompt "Upbeat pop about summer" --lyrics-optimizer --out summer.mp3 --quiet

# Instrumental
mmx music generate --prompt "Cinematic orchestral, building tension" --instrumental --out bgm.mp3 --quiet

# Detailed prompt with vocal characteristics
mmx music generate --prompt "Warm morning folk" \
  --vocals "male and female duet, harmonies in chorus" \
  --instruments "acoustic guitar, piano" \
  --bpm 95 \
  --lyrics-file song.txt \
  --out duet.mp3
```

# Instrumental — music-2.5+ (recommended, native is_instrumental)
mmx music generate --model "music-2.5+" --prompt "Cinematic orchestral, building tension" --instrumental --out bgm.mp3

# Instrumental — music-2.5 (lyrics workaround)
mmx music generate --prompt "Cinematic orchestral" --lyrics "无歌词" --out bgm.mp3

# Auto-generate lyrics from prompt (lyrics-optimizer)
mmx music generate --prompt "indie folk, melancholic, introspective" --lyrics-optimizer --out auto.mp3

# URL output (24h expiry — download promptly)
mmx music generate --prompt "Upbeat pop" --lyrics "La la la..." --output-format url --quiet
# stdout: URL valid for 24 hours

# Album song with full arrangement specification
mmx music generate \
  --model "music-2.5+" \
  --prompt "Atmospheric electronic, B minor, 85 BPM. Piano-led intro building to full electronic arrangement." \
  --lyrics-file "song.txt" \
  --vocals "Warm male baritone, dynamic range" \
  --genre "atmospheric electronic" \
  --mood "yearning, breakthrough" \
  --instruments "piano, strings, synth pads, electronic drums" \
  --bpm 85 \
  --key "B minor" \
  --structure "Intro-Verse-Chorus-Bridge-Outro" \
  --references "Bon Iver, James Blake" \
  --extra "Hook has three variations. Bridge requires instrumental drop-out." \
  --out "demo.mp3"
```

---

### music cover

Generate a cover version of a song based on reference audio.

**Model:** `music-cover-free` — unlimited for API key users, RPM = 3.

```bash
mmx music cover --prompt <text> (--audio <url> | --audio-file <path>) [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string, **required** | Target cover style, e.g. `"Indie folk, acoustic guitar, warm male vocal"` |
| `--audio <url>` | string | URL of reference audio (mp3, wav, flac, etc. — 6s to 6min, max 50MB) |
| `--audio-file <path>` | string | Local reference audio file (auto base64-encoded) |
| `--lyrics <text>` | string | Cover lyrics. If omitted, extracted from reference audio via ASR. |
| `--lyrics-file <path>` | string | Read lyrics from file. Use `-` for stdin |
| `--seed <number>` | number | Random seed 0–1000000 for reproducible results |
| `--format <fmt>` | string | Audio format: `mp3`, `wav`, `pcm` (default: `mp3`) |
| `--sample-rate <hz>` | number | Sample rate (default: 44100) |
| `--bitrate <bps>` | number | Bitrate (default: 256000) |
| `--channel <n>` | number | Channels: `1` (mono) or `2` (stereo, default) |
| `--out <path>` | string | Save audio to file |
| `--stream` | boolean | Stream raw audio to stdout |

```bash
# Cover from URL
mmx music cover --prompt "Indie folk, acoustic guitar, warm male vocal" \
  --audio https://filecdn.minimax.chat/public/d20eda57-2e36-45bf-9e12-82d9f2e69a86.mp3 --out cover.mp3 --quiet

# Cover from local file with custom lyrics
mmx music cover --prompt "Jazz, piano, slow" \
  --audio-file original.mp3 --lyrics-file lyrics.txt --out jazz_cover.mp3 --quiet

# Reproducible result with seed
mmx music cover --prompt "Pop, upbeat" --audio https://filecdn.minimax.chat/public/d20eda57-2e36-45bf-9e12-82d9f2e69a86.mp3 --seed 42 --out cover.mp3
```

---

### vision describe

Image understanding via VLM. Provide either `--image` or `--file-id`, not both.

```bash
mmx vision describe (--image <path-or-url> | --file-id <id>) [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--image <path-or-url>` | string | Local path or URL (auto base64-encoded) |
| `--file-id <id>` | string | Pre-uploaded file ID (skips base64) |
| `--prompt <text>` | string | Question about the image (default: `"Describe the image."`) |

```bash
mmx vision describe --image photo.jpg --prompt "What breed?" --output json
```

**stdout**: description text (text mode) or full response (json mode).

---

### search query

Web search via MiniMax.

```bash
mmx search query --q <query>
```

| Flag | Type | Description |
|---|---|---|
| `--q <query>` | string, **required** | Search query |

```bash
mmx search query --q "MiniMax AI" --output json --quiet
```

---

### quota show

Display Token Plan usage and remaining quotas.

```bash
mmx quota show [--output json]
```

---

## Tool Schema Export

Export all commands as Anthropic/OpenAI-compatible JSON tool schemas:

```bash
# All tool-worthy commands (excludes auth/config/update)
mmx config export-schema

# Single command
mmx config export-schema --command "video generate"
```

Use this to dynamically register mmx commands as tools in your agent framework.

---

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Usage error (bad flags, missing args) |
| 3 | Authentication error |
| 4 | Quota exceeded |
| 5 | Timeout |
| 10 | Content filter triggered |

---

## Piping Patterns

```bash
# stdout is always clean data — safe to pipe
mmx text chat --message "Hi" --output json | jq '.content'

# stderr has progress/spinners — discard if needed
mmx video generate --prompt "Waves" 2>/dev/null

# Chain: generate image → describe it
URL=$(mmx image generate --prompt "A sunset" --quiet)
mmx vision describe --image "$URL" --quiet

# Async video workflow
TASK=$(mmx video generate --prompt "A robot" --async --quiet | jq -r '.taskId')
mmx video task get --task-id "$TASK" --output json
mmx video download --task-id "$TASK" --out robot.mp4

# Voice cloning workflow
mmx speech clone --audio sample.wav --voice-id my_voice --out clone.json --quiet
VOICE_ID=$(jq -r '.voice_id' clone.json)
mmx speech synthesize --text "Hello from my voice" --voice "$VOICE_ID" --out hello.mp3

# SEF video: generate frames → interpolate video
mmx image generate --prompt "start of journey" --out-dir /tmp/sef-start --quiet
mmx image generate --prompt "end of journey" --out-dir /tmp/sef-end --quiet
START=$(ls /tmp/sef-start/image_001.jpg)
END=$(ls /tmp/sef-end/image_001.jpg)
mmx video generate --prompt "Walk forward" --first-frame "$START" --last-frame "$END" --download walk.mp4

# Reproducible image generation
mmx image generate --prompt "A landscape" --seed 42 --out-dir ./v1/ --quiet
mmx image generate --prompt "A landscape" --seed 42 --out-dir ./v2/ --quiet
# Both produce identical images
```

---

## Configuration Precedence

CLI flags → environment variables → `~/.mmx/config.json` → defaults.

```bash
# Persistent config
mmx config set --key region --value cn
mmx config show

# Environment
export MINIMAX_API_KEY=sk-xxxxx
export MINIMAX_REGION=cn
```
