# 卫华视频生产线

P0 本地演示：上传素材 → 选择工业模板 → 编辑故事板 → `alinVoice01` 中文配音与自动剪辑 → MP4 与质检报告。

在此目录执行：

```powershell
npm ci
npm run api
```

首次接入兔子 API 时，复制 `.env.example` 为 `.env`，填写 `TUZI_API_KEY`。视频默认调用 tuziapi 上的 `MiniMax-H3`；图片使用 Codex 内置 image_gen：

```powershell
Copy-Item .env.example .env
# 编辑 .env，填入 TUZI_API_KEY=你的真实密钥
npm run api
```

主角配音需要另外填写 MiniMax 直连的 `MINIMAX_API_KEY` 和你已经复刻好的 `MINIMAX_VOICE_ID`。配角沿用视频生成模型生成的声音，不会复制其他真人音色。当前项目不会把 `TUZI_API_KEY` 冒充成 MiniMax 直连音色密钥。

另开终端执行 `npm run dev -- --host 127.0.0.1`，打开 Vite 输出的网址。API 位于 `http://127.0.0.1:8705`。

- `npm run check`：类型、规则测试和构建。
- `GET /api/tuzi/health`：验证密钥和兔子 API 连通性，不会创建视频任务。
- `POST /api/tuzi/videos`：提交视频生成任务；`GET /api/tuzi/videos/:id` 查询异步任务。
- `npm run demo`：真实导出 60 秒门机样片。
- `npm run chuanyue -- <project.json>`：「名场面穿越」风格成片（硬切 + 竖排书法标题 + 对白字幕 + 配音/音效/BGM，母带校准到 -9.5 LUFS，输出 film.mp4 与 report.json）。规格见 [名场面穿越](docs/名场面穿越/原片拆解.md)，工程模板见 `docs/名场面穿越/示例工程.json`，配套 Skill「名场面穿越」。

故事板页提供“和剪辑助手聊聊”：可说“节奏太慢，快一点”“把第 3 段缩短到 6 秒”或“删掉最后一段”。没有配置 Agent 模型时使用本地快捷指令；配置 `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` 后，会话切换到 Claude Agent SDK，编辑操作仍通过服务端校验工具提交。`名场面穿越` Skill 是独立工作流，只在明确调用时加载，不会被当成故事板模板。

渲染完成后，交付页的“导出剪映草稿”会生成包含 `draft_content.json`、素材副本、配音、配乐、`captions.srt` 和 `manifest.json` 的压缩包。导出包会标明剪映版本兼容性尚待本机打开验证；Remotion HUD 与动画包装不会伪装成已转换的剪映效果。
- `npm run demo -- --factory`：真实导出 45 秒工厂模板样片。
- 设置 `RENDER_SMOKE=1` 后执行 `npm run test:render`：真实上传、去重、参数拒绝、渲染和下载测试。
- 设置 `VIDEO_SMOKE=1` 后执行 `npm test -- tests/video-upload.test.ts`：真实视频导入与剪辑测试，使用明确的测试画面。

需要 Python、`D:\个人自媒体系统\tools\minimax-voice\minimax_voice.py`、`alinVoice01` 的 MiniMax 配置、FFmpeg/FFprobe 与 Chromium。完整运行前提、复用说明及当前限制见 [P0 演示说明](docs/P0-demo.md)。

本轮使用本地规则模板，尚未连接视觉/编剧模型；IP 可后补。未调用 ChatCut 生成离线补充素材。公众号职责归 D；[重工业 AIGC 视频 Skill](docs/P1-industrial-aigc-skill.md) 为 P1 规划。
