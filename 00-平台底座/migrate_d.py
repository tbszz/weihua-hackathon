# -*- coding: utf-8 -*-
import io, sys

PATH = r"e:\卫华黑客松\D-起重机内容工厂\docs\PRD.md"
text = io.open(PATH, encoding="utf-8").read()
edits = []

# 1 头部形态
edits.append((
"> 模块代号 `studio` ｜ 形态：单 Agent + 5 个 Skills ｜ 所属：卫华 AI 工作台（`weihua-ai`）",
"> 模块代号 `studio` ｜ 形态：单 Agent + 6 个 Skills ｜ 所属：卫华 AI 工作台（`weihua-ai`）"))

# 2 一句话定位
edits.append((
"给**品牌宣传部门和营销工程师**：输入一台起重机的参数，几分钟内得到一个**可逐层拆开的交互科普页**（带「X 辆车吊到 Y 层楼」式的尺寸类比）；到客户厂房拍一张照片、选一个型号，得到**「装在你厂里」的效果图和带出处的卖点文案**。所有素材以 `MediaAsset` 交给作品 E 剪成片。",
"给**品牌宣传部门和营销工程师**：输入一台起重机的参数，几分钟内得到一个**可逐层拆开的交互科普页**（带「X 辆车吊到 Y 层楼」式的尺寸类比）；到客户厂房拍一张照片、选一个型号，得到**「装在你厂里」的效果图和带出处的卖点文案**；再按卫华文风一键生成**公众号推文**，审核后写入草稿。素材以 `MediaAsset` 交给作品 E 剪成片，成片回传后作为推文配图。"))

# 3 P0 主线
edits.append((
"**输入 3800t 参数 → 交互科普页（四层拆解 + 尺寸类比）→ 拍一张厂房照片 → 合成效果图 + 卖点文案 → 素材以 `MediaAsset` 交给 E**",
"**输入 3800t 参数 → 交互科普页（四层拆解 + 尺寸类比）→ 拍一张厂房照片 → 合成效果图 + 卖点文案 → 素材以 `MediaAsset` 交给 E → 官方推文原版对照生成 AI 推文 → 审核后写公众号草稿**"))

# 4 P0-10
edits.append((
"| P0-9 | 人工复核 + 交付 | `core.review` 通过后写入 `MediaAsset`，作品 E 可读取 |",
"| P0-9 | 人工复核 + 交付 | `core.review` 通过后写入 `MediaAsset`，作品 E 可读取 |\n| P0-10 | 公众号推文与发布 | 按卫华文风生成推文，「原版 → AI 重做 → 参数核对」对照演示，审核后 feishu-towechat 写入公众号草稿（studio-R10） |"))

# 5 不做
edits.append((
"| 工程级三维模型、图纸转 Tekla/CAD 模型（#84） | 拆解图是**宣传示意**，不能当设计依据 |",
"| 工程级三维模型、图纸转 Tekla/CAD 模型（#84） | 拆解图是**宣传示意**，不能当设计依据 |\n| 视频剪辑、IP 出镜与成片渲染 | 作品 E 负责；本作品只消费 E 回传的成片做推文配图 |"))

# 6 studio-R10
edits.append((
"""| 验收 | 未通过复核的素材 E 读不到；审核日志能看到谁在什么时候通过 |

---

## 6. Agent / Skill 设计""",
"""| 验收 | 未通过复核的素材 E 读不到；审核日志能看到谁在什么时候通过 |

### studio-R10 公众号推文与发布（2026-11-07 自作品 E 迁入）

| 项 | 内容 |
|---|---|
| 输入 | `CraneSpec` / 卖点 `Claim[]`、科普页封面截图、效果图、E 回传的成片与关键帧（选）、官方原版推文（对照演示用） |
| 处理 | 按卫华文风写推文（感叹号标题、短句分行、「大国重器」口径，极限用语必须有 `Claim` 支撑）→ 参数一致性校验（studio-R8）→ 配图压到 < 1 MiB → 写飞书文档（`core.feishu`）→ `core.review` 通过 → feishu-towechat `sync --commit` 写草稿 → `draft/get` 回读校验 |
| 输出 | 底座 `Article{title, author, digest, content_markdown, cover, images[], channel, status}`，写草稿后回填 `wechat.draft_media_id` |
| 验收 | 标题 ≤ 32 字、摘要 ≤ 120 字、正文 < 20,000 字（feishu-towechat 预检）；`draft/get` 校验通过才算成功；正文所有数字与科普页 / 成片一致；未经复核不写草稿 |

**对照演示模式**：输入一篇官方原版推文（如 5679 3800t 签约稿），Agent 只保留主题和参数重新生成，界面三栏展示「原版原文 | AI 生成稿 | 参数核对表」，AI 稿每个数字可点开跳到原版出处。

---

## 6. Agent / Skill 设计"""))

# 7 六个 Skills
edits.append(("### 6.2 五个 Skills", "### 6.2 六个 Skills"))

# 8 架构图
edits.append((
"""  照片 ─► site-composite（含卖点文案）──────► 参数一致性校验 ─────────┘
  产品图 ─► tripo-model（后台任务）─► GLB ──────────────────────────────┘
```""",
"""  照片 ─► site-composite（含卖点文案）──────► 参数一致性校验 ─────────┘
  产品图 ─► tripo-model（后台任务）─► GLB ──────────────────────────────┘
  主题 / 原版推文 ─► article-publish ─► 参数一致性校验 ─► core.review ─► 公众号草稿
        ▲ 配图：科普页封面截图 / 效果图 / E 回传成片关键帧
```"""))

# 9 article-publish skill
edits.append((
"""### 6.3 Tools（MCP / 确定性服务）""",
"""#### ⑥ `article-publish`：主题 / 原版推文 → 公众号草稿（自作品 E 迁入）

| 项 | 内容 |
|---|---|
| 输入 | 主题或官方原版推文、`Claim[]`、配图素材（科普页截图 / 效果图 / E 回传成片关键帧） |
| 输出 | `Article`（字段见底座 7.3.6 `article.schema.json`）+ 公众号草稿 `draft_media_id` |
| 子技能 | `weihua-copy-style`（感叹号标题、短句分行、「大国重器」等用语，极限用语必须有 `Claim` 支撑）、`article-layout`（排版） |
| 做法 | `core.search`（`brand_corpus` / `publicity`）取原版文风和参数 → 大模型写稿 → studio-R8 参数一致性校验 → `baoyu-compress-image` 压缩配图 → `core.feishu` 建飞书文档 → `core.review` 人工通过 → feishu-towechat `sync --commit` 写草稿 → `draft/get` 回读 |
| 失败降级 | 标题 ≤ 32、作者 ≤ 16、摘要 ≤ 120、正文 < 20,000 字且 < 1 MiB、图 < 1 MiB 为确定性校验，不过不出稿；feishu-towechat 返回 `ip_allowlist_required` 时不重试，先给 HTML 预览，等 IP 白名单确认后再写；`ambiguous` 结果不算成功；未经复核不写草稿 |

### 6.3 Tools（MCP / 确定性服务）"""))

# 10 Tools 表
edits.append((
"| `core.search` / `core.review` / `core.redact` | 底座 | 检索取证、人工复核、文本脱敏 |",
"""| `core.search` / `core.review` / `core.redact` | 底座 | 检索取证、人工复核、文本脱敏 |
| `core.feishu` | 底座 | 建飞书文档（推文定稿载体） |
| feishu-towechat（`html` / `sync --commit` / `draft/get`） | 外部 Skill | 推文排版预览、写公众号草稿、回读校验 |
| `baoyu-compress-image` | 外部 Skill | 配图压缩到 < 1 MiB |"""))

# 11 兜底表
edits.append((
"| 卖点 | 每条必须有出处，无出处不出现；`core.review` 人工通过后才能交给 E |",
"""| 卖点 | 每条必须有出处，无出处不出现；`core.review` 人工通过后才能交给 E |
| 推文与发布 | 长度限制确定性校验；数字过 studio-R8；未经复核不写草稿；白名单缺失时只出 HTML 预览 |"""))

# 12 7.4 接口
edits.append((
"| studio ← B（P1） | `QuoteResult` 里的型号 | 报价确认后直接给该型号出实景效果图（P1，不在 P0 链路里） |",
"""| studio ← B（P1） | `QuoteResult` 里的型号 | 报价确认后直接给该型号出实景效果图（P1，不在 P0 链路里） |
| studio ← E | 成片 `MediaAsset` + 封面帧 / 关键帧 / 字幕 / Claims | 推文配图与视频素材 |
| studio → 公众号 | `Article`（复核通过后 feishu-towechat 写草稿） | 只写草稿不发布，字段见底座 7.3.6 |"""))

# 13 页面
edits.append((
"| ⑤ 素材库 | 全部 `MediaAsset`，状态、交给 E |",
"""| ⑤ 素材库 | 全部 `MediaAsset`，状态、交给 E |
| ⑥ 推文与发布 | 原版 / AI 稿 / 参数核对三栏对照；公众号手机预览，标题 / 摘要 / 封面可改；「提交审核」→「写入草稿箱」，显示 `draft_media_id` 与回读校验结果 |"""))

# 14 演示脚本标题
edits.append(("## 9. 演示脚本（约 4 分 30 秒）", "## 9. 演示脚本（约 5 分 30 秒）"))

# 15 演示脚本内容
edits.append((
"| **4:00–4:30（链路串联）** | 点「交给视频生产线」，切到作品 E | E 的故事板里，录屏落在「参数卖点」段，效果图落在「应用场景」段，讲解词进了配音轨 | 「这就是内容创作链的前半段：D 出可核对的素材，E 剪成片、配上大卫小华出镜，再一键生成公众号草稿。」 |",
"""| 4:00–4:40 | 打开「推文与发布」，载入官方 3800t 原版推文，点「AI 重做」 | 三栏对照：原版原文 / AI 生成稿 / 参数核对表；AI 稿同样是感叹号标题、短句分行 | 「把官方推文扒下来存进检索库，AI 按同样的文风重写一遍——文风像、写法新，每个数字都能对回原版出处。」 |
| 4:40–5:00 | 点「提交审核」→ 通过 →「写入草稿箱」 | 公众号手机预览；返回 `draft_media_id`，回读校验通过 | 「审核后一键写进公众号草稿箱，发不发由人决定。写不进去时降级为 HTML 预览，流程不断。」 |
| **5:00–5:30（链路串联）** | 点「交给视频生产线」，切到作品 E | E 的故事板里，录屏落在「参数卖点」段，效果图落在「应用场景」段；E 成片后回传，成为推文配图 | 「内容创作链：D 出可核对的素材，E 剪成片、配上大卫小华出镜，成片回传 D，由 D 统一生成公众号草稿。」 |"""))

# 16 验收
edits.append((
"| 演示全流程 | 4 分 30 秒内走完，任何外部接口失败都能自动降级不中断 |",
"""| 推文数字与官方一致率 | 100%（与科普页同一套参数一致性校验） |
| 公众号草稿 | `draft/get` 校验通过；标题、摘要、正文都在限制内 |
| 演示全流程 | 5 分 30 秒内走完，任何外部接口失败都能自动降级不中断 |"""))

# 17 复用项目
edits.append((
"""| 空境工作台的图像编辑接入 | `E:\\室内设计\\tuiqiao-re\\app\\google-image.mjs`、`server.mjs` | 调用 Nano Banana 的请求组装（底图 + 参考图 + 文字指令）、响应解析、图片校验、错误映射、代理配置 | **改造**：只保留调用层；任务指令全部重写为工业场景 |""",
"""| 空境工作台的图像编辑接入 | `E:\\室内设计\\tuiqiao-re\\app\\google-image.mjs`、`server.mjs` | 调用 Nano Banana 的请求组装（底图 + 参考图 + 文字指令）、响应解析、图片校验、错误映射、代理配置 | **改造**：只保留调用层；任务指令全部重写为工业场景 |
| feishu-towechat | `~/.claude/skills/feishu-towechat` | `html` 预览、`sync --commit` 写草稿、`draft/get` 校验；凭据走 `WECHAT_APP_ID / WECHAT_APP_SECRET` 或 DPAPI 文件 | **直接用**（2026-11-07 自作品 E 迁入） |
| baoyu-compress-image / baoyu-cover-image | `~/.claude/skills/` | 配图压缩到 < 1 MiB；封面生成 | **直接用**；P0 封面默认用科普页封面截图，cover-image 放 P1 |"""))

# 18 计划
edits.append((
"| **D2 下午** | 录屏脚本；`core.review` 接入；`MediaAsset` 交付给 E 联调；降级开关演练；按演示脚本彩排 3 遍 | 全流程可演示 |",
"| **D2 下午** | 录屏脚本；`core.review` 接入；`MediaAsset` 交付给 E 联调；`article-publish` + 飞书文档 + feishu-towechat 写草稿联调；降级开关演练；按演示脚本彩排 3 遍 | 全流程可演示；公众号草稿 `draft/get` 通过 |"))

# 19 风险
edits.append((
"| 官方产品图、展会模型图授权不明 | 素材不能对外用 | 演示前向主办方要授权或官方图片 |",
"""| 官方产品图、展会模型图授权不明 | 素材不能对外用 | 演示前向主办方要授权或官方图片 |
| 公众号写草稿要 IP 白名单、AppSecret | 现场写不进去 | 提前配好并跑通一次；不行就切 HTML 预览 |"""))

# 20 待确认
edits.append((
"| 10 | VI 主色值 | 页面和效果图卖点卡的品牌色（底座统一事项） |",
"""| 10 | VI 主色值 | 页面和效果图卖点卡的品牌色（底座统一事项） |
| 11 | 测试公众号、AppID / 白名单、草稿作者名（2026-11-07 自 E 迁入） | 写草稿联调；拿不到就用 feishu-towechat HTML 预览保底 |"""))

fails = 0
for i, (old, new) in enumerate(edits, 1):
    n = text.count(old)
    if n != 1:
        print("FAIL edit %d: found %d occurrences" % (i, n))
        fails += 1
    else:
        text = text.replace(old, new, 1)
        print("OK edit %d" % i)

if fails == 0:
    io.open(PATH, "w", encoding="utf-8", newline="\n").write(text)
    print("D PRD updated.")
else:
    print("Aborted, file unchanged.")
sys.exit(1 if fails else 0)