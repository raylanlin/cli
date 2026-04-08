<p align="center">
  <img src="assets/logo.png" alt="MiniMax" width="320" />
</p>

<p align="center">
  <strong>MiniMax AI 开放平台官方命令行工具</strong><br>
  在终端生成文字、图像、视频、语音和音乐。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mmx-cli"><img src="https://img.shields.io/npm/v/mmx-cli.svg" alt="npm version" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js >= 18" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="https://platform.minimaxi.com">开放平台</a>
</p>

## 功能特性

- **文本对话** — 多轮对话、流式输出、系统提示词、JSON 格式输出
- **图像生成** — 文生图，支持比例和批量控制
- **视频生成** — 异步生成，进度追踪
- **语音合成** — 30+ 音色、语速调节、流式播放
- **音乐生成** — 文生音乐，支持自定义歌词
- **图像理解** — 图片描述与识别
- **网络搜索** — MiniMax 搜索引擎
- **双区域** — 国际版（`api.minimax.io`）和国内版（`api.minimaxi.com`）自动切换

## 安装

```bash
npm install -g mmx-cli
```

> 需要 [Node.js](https://nodejs.org) 18+

## 快速开始

```bash
# 认证
mmx auth login --api-key sk-xxxxx

# 开始创作
mmx text chat --message "你好，MiniMax！"
mmx image "一只穿宇航服的猫"
mmx speech synthesize --text "你好！" --out hello.mp3
mmx video generate --prompt "海浪拍打礁石"
mmx music "欢快的流行乐"
mmx search "MiniMax AI 最新动态"
mmx vision photo.jpg
mmx quota
```

## 命令参考

### `mmx text`

```bash
mmx text chat --message "写一首诗"
mmx text chat --model MiniMax-M2.7-highspeed --message "你好" --stream
mmx text chat --system "你是编程助手" --message "用 Go 写 Fizzbuzz"
mmx text chat --message "user:你好" --message "assistant:嗨！" --message "你叫什么名字？"
cat messages.json | mmx text chat --messages-file - --output json
```

### `mmx image`

```bash
mmx image "一只穿宇航服的猫"
mmx image generate --prompt "科技感 Logo" --n 3 --aspect-ratio 16:9
mmx image generate --prompt "山水画" --out-dir ./output/
```

### `mmx video`

```bash
mmx video generate --prompt "海浪拍打礁石" --async
mmx video generate --prompt "机器人作画" --download sunset.mp4
mmx video task get --task-id 123456
mmx video download --file-id 176844028768320 --out video.mp4
```

### `mmx speech`

```bash
mmx speech synthesize --text "你好！" --out hello.mp3
mmx speech synthesize --text "流式输出" --stream | mpv -
mmx speech synthesize --text "Hi" --voice Boyan_new_hailuo --speed 1.2
echo "头条新闻" | mmx speech synthesize --text-file - --out news.mp3
mmx speech voices
```

### `mmx music`

```bash
mmx music "欢快的流行乐"
mmx music generate --prompt "爵士风" --lyrics "啦啦啦" --out song.mp3
```

### `mmx vision`

```bash
mmx vision photo.jpg
mmx vision describe --image https://example.com/img.jpg --prompt "这是什么品种的狗？"
mmx vision describe --file-id file-123
```

### `mmx search`

```bash
mmx search "MiniMax AI"
mmx search query --q "最新动态" --output json
```

### `mmx auth`

```bash
mmx auth login --api-key sk-xxxxx
mmx auth login                    # OAuth 浏览器授权
mmx auth status
mmx auth refresh
mmx auth logout
```

### `mmx config` · `mmx quota`

```bash
mmx quota
mmx config show
mmx config set --key region --value cn
mmx config export-schema | jq .
```

### `mmx update`

```bash
mmx update
mmx update latest
```

## 许可证

[MIT](LICENSE)
