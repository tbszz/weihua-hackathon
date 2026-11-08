# 视频生产线 P0 演示

本轮目标：本地素材 → 主题与模板 → 故事板 → 人工修改/换镜头 → 中文配音 → 实际 MP4 → 文件质检报告。公众号写稿、排版、飞书与草稿同步属于作品 D。

## 运行

前提：Windows，Node.js 22+，FFmpeg/FFprobe 在 PATH 中，Python 可运行 `D:\个人自媒体系统\tools\minimax-voice\minimax_voice.py`，并已配置 `alinVoice01`。浏览器从本机 Playwright Chromium 缓存查找，也可设置 CHROME_PATH 为 Chromium/Chrome 可执行文件路径。

```powershell
npm ci
npm run api
```

另一个终端运行 `npm run dev -- --host 127.0.0.1`。使用终端实际输出的网址，5173 被其他作品占用时 Vite 会使用 5174 等端口。API 固定监听 127.0.0.1:8705。

`npm run demo` 通过真实 API 跑 60 秒门机模板；`npm run demo -- --factory` 跑 45 秒智能工厂模板。`npm run check` 执行类型检查、规则测试和前端构建。`npm run chuanyue -- demo/chuanyue-control-demo.json --out demo/chuanyue-control-out --scale 0.5 --concurrency 1` 可单独复核截图中的控制室数据动效。

## 已有基础的复用

直接复用本机 Montage 项目的 `src/media/process.ts` 与 `ffprobe.ts`，保留无 shell 子进程调用、超时与编码探测逻辑。Remotion 合成采用原项目“分段镜头 + 配音 + 包装”的结构，但工业模板和界面重新实现；没有复制电商话术、日语翻译和产品评价组件。

## 当前能力与边界

- 60 秒超大设备科普、45 秒智能工厂两套确定性模板。主题生成标题；工业叙事与旁白使用模板，不声称已接大模型。
- 上传 JPG/PNG、MP4/MOV/WebM，SHA-256 去重、FFprobe 探测。视频归一化至 30fps、1920×1080，单素材最多取前 30 秒。文件名规则分类；不声称是视觉模型理解。可手动换镜头。
- 故事板可以修改旁白与单段时长。无出处数字、过长配音、过短源视频在渲染前阻断。当前数字白名单专用于 3800t 样例，尚非通用产品 Claim 数据库。
- 使用个人自媒体系统的 MiniMax 音色 `alinVoice01` 按段生成中文配音，实际语音长度不能超出镜头时长。可用 `MINIMAX_VOICE_ID` 和 `MINIMAX_VOICE_SCRIPT` 覆盖默认配置。字幕按句子字数分配显示时段，尚非音素级对齐。
- Remotion 负责字幕、图像缓推、HUD、扫描线、光带切换；FFmpeg 输出 H.264/AAC MP4。背景是本地产生的低音节拍演示音轨，正式宣传片需换成正式配乐。
- 当前笔记本采用 1920×1080 逻辑画布、0.5 倍中间渲染后升采样至 1920×1080，避免本机并发高分辨率编码卡顿。交付容器是 1080p，但本演示不宣称原生 1080p 画质；正式素材上线前需验证原生渲染性能。
- 个人声音来源：`D:\个人自媒体系统\output\minimax-voice\alinVoice01-first.mp3`；旁白生成使用同目录 `tools/minimax-voice/minimax_voice.py tts --voice-id alinVoice01`。试听文件只作为已存在音色的核对样本，成片旁白按镜头逐段生成。
- 实际全片解码并检查黑屏、冻结、平均音量、分辨率、帧率与时长，报告位于 `data/jobs/<id>/report.json`。字幕安全区仅做模板坐标约束，报告提示人工检查长文，不伪造完整视觉质检通过。
- 本地单任务渲染，任务结果写盘；服务中断的任务标为失败，需重新提交。尚未复用 Montage 的完整持久队列、lease 与自动重试。
- IP 形象与通用视觉模型接入待后续；本轮不调用 ChatCut 离线生成补充素材。
- 当前成片交付给人下载；作品 D 的 MediaAsset 双向联调和平台发布未接入。

## 演示素材

`public/demo/official-*.jpg` 来自卫华公开报道 [3800 吨门机整体提升](https://www.cranewh.com/detail/5739.html)，文章日期 2026-07-06。图片仅作本地演示引用，未据此声明取得商业再发布授权。原始图片地址和来源见 `data/sources.json`。未抓取官网 MP4。

其余 SVG 是本地绘制的工业示意图，画面标识为示意，不代表现场实拍，也不代表卫华设备真实结构。

## 手动检查路径

1. 打开页面，保留门机主题，点击生成故事板。
2. 选择第三段，核对 166.5m 来源；换素材、改旁白。
3. 在主题或旁白中写 4000 吨，确认被出处规则阻断。
4. 上传一段不少于 6 秒的视频，选择为第一镜头；短于段落时长则应被拒绝。
5. 点击确认并渲染，等待实际进度完成。
6. 播放真实 MP4，抽查中文配音、字幕、HUD、转场，下载成片与报告。

本轮浏览器工具因无法确认 Windows 浏览器 URL 而中止，不能把上述页面点击步骤标记为已完成。实际执行证据单独记录于测试报告。
