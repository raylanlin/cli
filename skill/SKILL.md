# MiniMax CLI — Agent Skill Guide

Use `minimax` to generate text, images, video, speech, music, and perform web search via the MiniMax AI platform.

## Prerequisites

```bash
# Auth (persisted to ~/.minimax/credentials.json)
minimax auth login --api-key sk-xxxxx

# Or pass per-call
minimax text chat --api-key sk-xxxxx --message "Hello"
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
minimax text chat --message <text> [flags]
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
minimax text chat --message "user:What is MiniMax?" --output json --quiet

# Multi-turn
minimax text chat \
  --system "You are a coding assistant." \
  --message "user:Write fizzbuzz in Python" \
  --output json

# From file
cat conversation.json | minimax text chat --messages-file - --output json
```

**stdout**: response text (text mode) or full response object (json mode).

---

### image generate

Generate images. Model: `image-01`.

```bash
minimax image generate --prompt <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string, **required** | Image description |
| `--aspect-ratio <ratio>` | string | e.g. `16:9`, `1:1` |
| `--n <count>` | number | Number of images (default: 1) |
| `--subject-ref <params>` | string | Subject reference: `type=character,image=path-or-url` |
| `--out-dir <dir>` | string | Download images to directory |
| `--out-prefix <prefix>` | string | Filename prefix (default: `image`) |

```bash
minimax image generate --prompt "A cat in a spacesuit" --output json --quiet
# stdout: image URLs (one per line in quiet mode)

minimax image generate --prompt "Logo" --n 3 --out-dir ./gen/ --quiet
# stdout: saved file paths (one per line)
```

---

### video generate

Generate video. Default model: `MiniMax-Hailuo-2.3`. This is an async task — by default it polls until completion.

```bash
minimax video generate --prompt <text> [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string, **required** | Video description |
| `--model <model>` | string | `MiniMax-Hailuo-2.3` (default) or `MiniMax-Hailuo-2.3-Fast` |
| `--first-frame <path-or-url>` | string | First frame image |
| `--callback-url <url>` | string | Webhook URL for completion |
| `--download <path>` | string | Save video to specific file |
| `--async` | boolean | Return task ID immediately |
| `--no-wait` | boolean | Same as `--async` |
| `--poll-interval <seconds>` | number | Polling interval (default: 5) |

```bash
# Non-blocking: get task ID
minimax video generate --prompt "A robot." --async --quiet
# stdout: {"taskId":"..."}

# Blocking: wait and get file path
minimax video generate --prompt "Ocean waves." --download ocean.mp4 --quiet
# stdout: ocean.mp4
```

### video task get

Query status of a video generation task.

```bash
minimax video task get --task-id <id> [--output json]
```

### video download

Download a completed video by task ID.

```bash
minimax video download --file-id <id> [--out <path>]
```

---

### speech synthesize

Text-to-speech. Default model: `speech-2.8-hd`. Max 10k chars.

```bash
minimax speech synthesize --text <text> [flags]
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
minimax speech synthesize --text "Hello world" --out hello.mp3 --quiet
# stdout: hello.mp3

echo "Breaking news." | minimax speech synthesize --text-file - --out news.mp3
```

---

### music generate

Generate music. Model: `music-2.5`. Responds well to rich, structured descriptions.

```bash
minimax music generate --prompt <text> [--lyrics <text>] [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--prompt <text>` | string | Music style description (can be detailed) |
| `--lyrics <text>` | string | Song lyrics with structure tags. Use `"\u65e0\u6b4c\u8bcd"` for instrumental. Cannot be used with `--instrumental` |
| `--lyrics-file <path>` | string | Read lyrics from file. Use `-` for stdin |
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
| `--instrumental` | boolean | Generate instrumental music (no vocals). Cannot be used with `--lyrics` or `--lyrics-file` |
| `--aigc-watermark` | boolean | Embed AI-generated content watermark |
| `--format <fmt>` | string | Audio format (default: `mp3`) |
| `--sample-rate <hz>` | number | Sample rate (default: 44100) |
| `--bitrate <bps>` | number | Bitrate (default: 256000) |
| `--out <path>` | string | Save audio to file |
| `--stream` | boolean | Stream raw audio to stdout |

At least one of `--prompt` or `--lyrics` is required.

```bash
# Simple usage
minimax music generate --prompt "Upbeat pop" --lyrics "La la la..." --out song.mp3 --quiet

# Detailed prompt with vocal characteristics
minimax music generate --prompt "Warm morning folk" \
  --vocals "male and female duet, harmonies in chorus" \
  --instruments "acoustic guitar, piano" \
  --bpm 95 \
  --lyrics-file song.txt \
  --out duet.mp3

# Instrumental (use --instrumental flag)
minimax music generate --prompt "Cinematic orchestral, building tension" --instrumental --out bgm.mp3
```

---

### vision describe

Image understanding via VLM. Provide either `--image` or `--file-id`, not both.

```bash
minimax vision describe (--image <path-or-url> | --file-id <id>) [flags]
```

| Flag | Type | Description |
|---|---|---|
| `--image <path-or-url>` | string | Local path or URL (auto base64-encoded) |
| `--file-id <id>` | string | Pre-uploaded file ID (skips base64) |
| `--prompt <text>` | string | Question about the image (default: `"Describe the image."`) |

```bash
minimax vision describe --image photo.jpg --prompt "What breed?" --output json
```

**stdout**: description text (text mode) or full response (json mode).

---

### search query

Web search via MiniMax.

```bash
minimax search query --q <query>
```

| Flag | Type | Description |
|---|---|---|
| `--q <query>` | string, **required** | Search query |

```bash
minimax search query --q "MiniMax AI" --output json --quiet
```

---

### quota show

Display Token Plan usage and remaining quotas.

```bash
minimax quota show [--output json]
```

---

## Tool Schema Export

Export all commands as Anthropic/OpenAI-compatible JSON tool schemas:

```bash
# All tool-worthy commands (excludes auth/config/update)
minimax config export-schema

# Single command
minimax config export-schema --command "video generate"
```

Use this to dynamically register minimax commands as tools in your agent framework.

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
minimax text chat --message "Hi" --output json | jq '.content'

# stderr has progress/spinners — discard if needed
minimax video generate --prompt "Waves" 2>/dev/null

# Chain: generate image → describe it
URL=$(minimax image generate --prompt "A sunset" --quiet)
minimax vision describe --image "$URL" --quiet

# Async video workflow
TASK=$(minimax video generate --prompt "A robot" --async --quiet | jq -r '.taskId')
minimax video task get --task-id "$TASK" --output json
minimax video download --task-id "$TASK" --out robot.mp4
```

---

## Configuration Precedence

CLI flags → environment variables → `~/.minimax/config.json` → defaults.

```bash
# Persistent config
minimax config set --key region --value cn
minimax config show

# Environment
export MINIMAX_API_KEY=sk-xxxxx
export MINIMAX_REGION=cn
```
