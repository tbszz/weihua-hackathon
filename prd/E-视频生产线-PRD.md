# 作品 E：视频生产线 PRD（模块代号 `video`）

> 版本 v0.1 ｜ 2026-11-06 ｜ 遵守 [`prd/_约定.md`](_约定.md)
> 依赖底座 `core`（Agent Runtime、编排器、检索、Claim、人工复核、飞书），能力按约定第 3 节直接引用，本文不重新设计。
> 上游：作品 D（`studio`）产出的 `MediaAsset`；下游：公众号（`Article`）。

---

## 1. 一句话定位

给**品牌宣传部门**用的视频生产线：丢进一批厂区实拍素材，再写一句主题，系统按卫华官方的「航拍 + 提升 + 参数字幕」风格出故事板，自动选镜头，配上中文配音、字幕、科技感包装和毛绒版大卫小华出镜，输出 16:9 成片，同时生成一篇公众号草稿。

---

## 2. 背景与痛点

### 2.1 场景表原话（`场景新.xlsx`）

| 序号 | 场景 | 原话 | 在本作品里的位置 |
|---|---|---|---|
| **#19（主报）** | 实拍视频AI自动剪辑系统 | “AI驱动线上或线下软件，对实拍视频片段库按照故事板自动剪辑、配音、配乐、字幕、包装调色，输出成片。” | 主链路：故事板 → 选镜头 → 配音 / 配乐 / 字幕 / 调色 → 成片 |
| #82 | 视频自动剪辑、特效生成、转场设计、三维科技感元素制作 | “降低科技感包装的门槛与成本；期望：利用AI视频生成工具生成高质量空镜；通过AI自动识别画面生成炫酷转场与科技感粒子特效；AI智能抠像及追踪；通过已有的素材，AI自动完成粗剪、精剪。” | 科技感包装（§5 video-R7）、AI 空镜补位（video-R4）；抠像追踪放 P1 |
| #11 | 大卫小华 IP 毛绒化与系列内容 | “把公司 IP“大卫小华”做成毛绒风形象，延展表情包、海报、短视频” | IP Agent（§6.3）、IP 风格规范（§5.1） |
| 参考场景（同名） | 大卫小华 IP 毛绒化与系列内容 | 品牌宣传部门；现在“做过一些 IP 与实景合成”；痛点“短视频、短剧做得差”；期望“一套毛绒风 IP 形象 + 延展物料 + 一段短视频” | 同上；P0 交付物 = 表情包 8 + 海报 2 + 视频出镜片段 |
| #25 | 文创类及IP形象系列内容延展 | “根据文创类需求及创意想法，利用AI输出相应的创意及3D形象”（行政部） | IP 延展；3D 形象放 P1 |
| #21 | 公众号推文AI闭环工作流 | “输入主题及产品名称，AI自动输出宣传推文，并配图（支持本地上传或者AI生成），校正完毕后，自动生成微信公众号风格排版设计，一键导入公众号发布。” | 发布 Agent（§6.6）；“一键导入”落到草稿箱，正式群发由人点 |
| 参考场景 | 短剧、短视频生产流水线 | 品牌宣传部门；“从脚本、分镜到成片的 AI 工作流”；期望“输入主题，自动出脚本、分镜和成片” | 编剧/分镜 Agent（§6.1）；短剧形态放 P1 |

另外 #10 原话“统筹多种AI工具协作生成类似3800t门机科普类视频所需的文案、脚本、图片及视频内容”主要归作品 D，本作品的「超大设备科普」故事板就是给它出片用的。

### 2.2 调研事实

| 事实 | 对本作品的影响 | 出处 |
|---|---|---|
| 官方视频以大场面和硬参数为主：航拍、主梁提升、载荷试验、数字字幕叠加，配大气的配乐 | 故事板模板的固定骨架 | 调研报告 B7；[cranewh.com/video](https://www.cranewh.com/video) |
| 文案惯用“楼层数 / 车辆数”类比参数（如 3800t“相当于 50 多层楼”） | 参数字幕可以带一行类比；类比也要有出处 | 调研报告 B7、A4；[5679](https://www.cranewh.com/detail/5679.html) |
| 3800t-107m 门机：整机高 166.5 m、起升高度 130 m、双小车各 1900 t，2026-07-03 完成整体提升，用于温州浙海风母港 | 模板 1 的样例主题和参数 | [5679](https://www.cranewh.com/detail/5679.html)、[5739](https://www.cranewh.com/detail/5739.html) |
| 国家智能制造示范工厂（2023）、首批卓越级智能工厂（2025）、7 座智能工厂、PLM 设计周期 15 天 → 8.8 天、起重管家接入 3 万多台设备 | 模板 2 的参数卖点 | [5437](https://cranewh.com/detail/5437.html)、[chinacrane](http://www.chinacrane.net/news/202501/10/291053.html)、[河南日报 2026-06-10](https://dzb.henandaily.cn/html5/2026-06/10/content_14_1796672.htm) |
| IP「大卫 / David」「小华 / Hanna」2026-02-09 首发；官方海报是 3D Q 版、红白机甲风，只在公众号原文里有 | IP 风格的唯一参考；三视图、源文件、授权都没有 | 调研报告 B6；[5700](https://www.cranewh.com/detail/5700.html) |
| 表情包、周边、毛绒公仔、短视频出镜：**未查到** | 毛绒版和表情包是新增内容，不和已有物料冲突 | 调研报告 B6 |
| 口号“卫华让世界轻松起来”（常见写法“卫华起重，让世界轻松起来”）；企业精神“知重负重、唯实唯勤” | 片尾口号卡、推文结尾 | [cranewh.com/culture](https://www.cranewh.com/culture) |
| 公众号文风：标题常带感叹号，常用“国内首台套”“全球首台”“大国重器”，正文短句分行 | 发布 Agent 的文风约束 | 调研报告 B8 |
| 内部前例“AI 全能应用挑战赛”三等奖里已有“影像内容生产的第二曲线革命”“AI 从产品方案设计到营销推广全流程” | 答辩要讲区别：本作品是**实拍素材库驱动的确定性流水线**，参数有出处，带质检门禁，直接出公众号草稿 | [jdzj 339228](https://www.jdzj.com/news/339228.html) |

### 2.3 痛点归纳

1. 实拍素材多，粗剪全靠人翻素材，一条 1 分钟宣传片要 1–2 天（**待向主办方确认实际工时**）。
2. 科技感包装依赖外包或会 AE 的人（#82“降低科技感包装的门槛与成本”）。
3. IP 刚发布，只有一张海报，没有可直接用的延展物料，短视频里用不起来（参考场景痛点“短视频、短剧做得差”）。
4. 视频和推文分两拨人做，口径不统一，参数靠人工核对。

---

## 3. 用户与场景

| 岗位 | 现在怎么做 | 做成后怎么做 |
|---|---|---|
| 品牌宣传 / 新媒体编辑 | 在剪映或 PR 里手动翻素材、粗剪、配字幕，参数从新闻稿里抄 | 选模板、写一句主题、勾选素材 → 审一下故事板 → 等 5–10 分钟拿成片和公众号草稿，只改不满意的段落 |
| 设计师 | 外包或自己做 IP 延展、包装 | 在 IP 工坊里按风格规范批量出表情包和海报，只做审核和挑图 |
| 营销工程师（作品 D 用户） | 交互页录屏、效果图做完就停了 | D 的产出一键送进 E，自动剪进产品科普片 |
| 审核人（宣传部负责人） | 看成片、对参数 | 在复核页看 QC 报告，参数字幕每条都能点开出处 |

---

## 4. 范围

### 4.1 P0（两天内必须演示的完整闭环）

> 一批素材 + 一句主题 → 带 IP 出镜、字幕、配音和科技感包装的成片 → 公众号草稿

| # | 内容 |
|---|---|
| 1 | 2 套故事板模板：「超大设备科普」60 s、「智能工厂宣传」45 s，16:9，1920×1080 / 30 fps |
| 2 | 编剧/分镜 Agent：主题 → 分镜表（时长、画面要求、字幕、配音、HUD 参数、IP 出镜点、转场），参数只能取自 `Claim` |
| 3 | 素材理解 Agent：复用 Montage 的探测、CFR 归一化、联系表语义建档和缓存；换成工业镜头词表；按分镜选镜头；不够的段落用 AI 空镜池或 D 的 `MediaAsset` 补位 |
| 4 | IP Agent：毛绒风格规范定稿；**表情包 8 个、海报 2 张、视频出镜片段 3 段**（片头打招呼、讲解叠加、片尾挥手），均经人工审核 |
| 5 | 剪辑包装 Agent：Remotion 渲染；中文 TTS 配音；配乐和 ducking；逐句字幕；一套工业 LUT；科技感包装 P0 五种（§5 video-R7） |
| 6 | 质检 Agent：复用 Montage 的编码、解码、黑屏、冻结、响度门禁；新增「字幕数字 = Claim」、字幕安全区、时长、IP 出镜检查 |
| 7 | 发布 Agent：推文 `Article` → 飞书文档 → feishu-towechat → 公众号**草稿**（写草稿前过 `core.review`） |
| 8 | 页面：任务新建、故事板、IP 工坊、渲染与质检、发布预览 |
| 9 | 演示：预渲染 2 条完整成片 + 现场渲染一段 10–15 s |

### 4.2 P1（加分项）

- 9:16 竖版自动改版（同一份 EditPlan 重排安全区）；「新中式起重机产品快剪」30 s 模板；IP 短剧模板（3 镜头小剧情）
- 科技感包装其余几种：粒子汇聚、三维线框/全息、AI 识别画面自动选转场、镜头内物体追踪标注（#82“AI智能抠像及追踪”）
- 在 ChatCut 中打开精修：EditPlan 转成 ChatCut 时间线，人在 ChatCut 里改
- IP 开口说话（口型同步）、IP 3D 化（Tripo，复用 Heritage Foundry 接入）、#25 文创 3D 形象
- 视频直接上传公众号素材库或视频号
- 配乐 AI 生成（ChatCut `submit_music`），P0 用版权音乐库
- 批量：一次 N 个主题出 N 条（Montage 队列已支持 1–100 条）

### 4.3 不做

- 不做通用剪辑软件，不做逐帧手动时间线编辑（P1 交给 ChatCut）
- 不做全自动群发：只写到草稿箱，群发由人在公众号后台点
- 不训练 / 微调模型，不做 LoRA（两天做不完，用参考图 + 固定提示词保证一致性）
- 不生成任何没有出处的参数、荣誉、排名
- 不抓取、不下载官网视频；官方 mp4 只有在主办方授权后才放进素材库
- 不做 IP 正式三视图和商用授权文件（列为待确认）

---

## 5. 功能需求

### video-R1 新建视频任务

| 项 | 内容 |
|---|---|
| 输入 | 主题（一句话，≤ 50 字）；模板（可选，不选由编剧 Agent 推荐）；素材：本地上传视频/图片，或勾选作品 D 推送的 `MediaAsset`；时长档位（模板默认）；是否出 IP（默认是）；是否生成推文（默认是） |
| 处理 | 素材按 SHA-256 去重入库（复用 Montage `library-store`）；创建 `VideoJob`，进底座编排器 |
| 输出 | `VideoJob{id, topic, templateId, assetIds[], options, status}` |
| 验收 | 20 段素材（共 ≤ 2 GB）上传入库 ≤ 1 分钟；重复文件只存一份；`MediaAsset` 能在素材列表里看到来源标记「来自 D」 |

### video-R2 故事板生成（编剧/分镜 Agent）

| 项 | 内容 |
|---|---|
| 输入 | 主题、模板、`MediaAsset.卖点文案`、`core.search(主题, "publicity")` 检索到的历年宣传口径 |
| 处理 | 按模板骨架填每一段：画面要求（标签 + 景别）、字幕、配音、HUD 参数、IP 出镜点、转场；所有数字先做成 `Claim` 再引用 |
| 输出 | `Storyboard`（Schema 见 §6.1），在故事板页以分镜表展示，可改 |
| 验收 | ① 每段配音字数 ≤ 段时长 × 4.5 字/秒；② 字幕和 HUD 里的每个数字都能对上一条 `Claim`，且 `Claim.evidence` 非空；③ 总时长 = 模板时长 ± 0.5 s；④ 5 个测试主题全部通过①–③ |

### video-R3 素材理解与选镜头（素材理解 Agent）

| 项 | 内容 |
|---|---|
| 输入 | 素材集合、`Storyboard` |
| 处理 | 复用 Montage：ffprobe 探测 → 30 fps CFR 归一化 → 切点/运动/亮度/模糊度分析 → 抽样帧联系表 → 视觉模型一次建档（按 SHA-256 缓存）。把夏凉被语义槽位换成**工业镜头词表**（见下表），再按段落的 `requiredTags + shotTypes` 打分选段，不跨原片切点，同一区间不重复使用 |
| 输出 | `MaterialAnalysis[]`（沿用 Montage schema）+ `ShotSelection[]`（每段选中的素材、入点、出点、得分、理由） |
| 验收 | 20 段素材建档 ≤ 3 分钟（首次）/ ≤ 10 秒（命中缓存）；人工评审选镜头可用率 ≥ 80%；每个选择都能在页面上看到理由和缩略图 |

**工业镜头词表（替换 `summer-quilt-semantics.ts` 的 roles）**

| role | 中文 | 识别线索 |
|---|---|---|
| `aerial_wide` | 航拍全景 | 高空俯视、厂区或港口全貌、设备整体 |
| `girder_lift` | 主梁提升 / 吊装 | 主梁离地、钢丝绳受力、吊装作业 |
| `load_test` | 载荷试验 | 配重块、试验横幅、整机受载 |
| `structure_detail` | 结构细节 | 主梁、端梁、小车、吊钩特写 |
| `welding_process` | 焊接 / 工艺 | 焊花、焊接机器人、打磨 |
| `smart_line` | 智能产线 | 机器人、AGV、自动化工位 |
| `control_screen` | 控制室 / 数据屏 | 大屏、上位机界面、操作台 |
| `aicrane_ops` | 无人天车作业 | 无人驾驶室天车、自动抓取 |
| `people_work` | 人物作业 | 工人、工程师、安全帽（P0 不做人脸识别） |
| `brand_scene` | 品牌场景 | Logo、厂门、展会 |
| `unusable` | 不可用 | 黑屏、严重抖动、遮挡、过曝 |

### video-R4 素材补位

| 项 | 内容 |
|---|---|
| 输入 | 得分低于阈值（0.45）或没有候选的段落 |
| 处理 | 按顺序补位：① 作品 D 的 `MediaAsset`（录屏直接用；效果图做缓推 Ken Burns）；② **AI 空镜池**（P0 提前用 ChatCut `submit_video` 生成 6–8 段，按 role 打标入库，现场不调用）；③ MG 字卡（纯包装画面 + 参数 HUD） |
| 输出 | 补位后的 `ShotSelection`，`source` 字段标明 `footage / mediaAsset / ai_broll / mg_card` |
| 验收 | 素材只给 5 段时仍能出完整成片；成片里 AI 空镜在页面和推文里都标「AI 生成画面」 |

### video-R5 IP 资产（IP Agent）

| 项 | 内容 |
|---|---|
| 输入 | `IpStyleSpec`（风格规范，见 §5.1）、定稿参考图集、故事板里的 `ipCue` |
| 处理 | 参考图 + 固定提示词生成；自动一致性打分；人工审核后才进 IP 资产库 |
| 输出 | `IpAsset[]`：表情包 8、海报 2、出镜片段 3（片头 3 s、讲解叠加透明 PNG、片尾 4 s） |
| 验收 | 8 个表情包人评一致性均分 ≥ 4/5（5 人打分）；两角色不混淆（大卫不出现发髻，小华不出现短发）；所有资产都有审核记录 |

### video-R6 配音与字幕

| 项 | 内容 |
|---|---|
| 输入 | `Storyboard.segments[].voiceover / caption` |
| 处理 | 逐段中文 TTS（男声配大卫视角的厚重旁白，女声配小华出镜台词）；测量每段实际音频时长，**以配音时长反推段落时长**（± 0.3 s 内调镜头出点，超出则提示编剧 Agent 删字）；字幕按句切分，与配音按段对齐；配乐响度归一，旁白期间 ducking |
| 输出 | `VoiceTrack[]`（音频文件、时长、对应段落）、字幕时间轴 |
| 验收 | 字幕与配音起止偏差 ≤ 200 ms；整片 −16 ± 1 LUFS，true peak ≤ −1.5 dBTP（Montage 现有阈值） |

### video-R7 科技感包装（#82）

| 包装 | P0 / P1 | 做法 | 用在 |
|---|---|---|---|
| **数据 HUD 参数字幕** | **P0** | Remotion 组件：角框 + 数字滚动计数 + 单位 + 一行类比，参数来自 `Claim` | 参数卖点段 |
| **扫描线** | **P0** | 一道亮线沿设备轮廓或水平方向扫过，带细网格和轻微辉光 | 设备首次出现、结构细节 |
| **光带擦除转场** | **P0** | 斜向光带扫过完成切换，卫华红 + 白 | 段落之间 |
| **缩放穿越转场** | **P0** | 前一镜头推近放大 + 模糊，下一镜头从放大状态收回 | 从全景切到细节 |
| **片头标题 / 片尾品牌卡** | **P0** | 标题逐字出现；片尾 Logo + 口号 + 大卫小华 | 首尾 |
| 粒子汇聚 / 粒子消散 | P1 | 粒子汇聚成 Logo 或设备剪影 | 片尾 |
| 三维线框 / 全息 | P1 | 设备线框叠加（需 D 的 3D 模型或描边抠像） | 结构讲解 |
| AI 识别画面自动选转场 | P1 | 按前后镜头运动方向和主体位置选转场 | 全片 |
| 抠像 + 追踪标注 | P1 | ChatCut Smart Object 抠像 / 追踪，标签跟着吊钩走 | 吊装作业 |
| 多套 LUT | P1 | P0 只有一套「工业冷调 + 红色保护」LUT | 全片 |

验收：P0 五种在两套模板的成片里都出现；每种组件单独渲染 3 s 预览不卡顿；字幕和 HUD 不出 1920×1080 的 90% 安全区。

### video-R8 渲染

| 项 | 内容 |
|---|---|
| 输入 | `EditPlan`（Montage schema 扩展，见 §6.4） |
| 处理 | 复用 Montage 的持久化队列、lease 恢复、取消、失败重试；Remotion 按帧渲染 |
| 输出 | `rendered.mp4`（H.264 High / yuv420p / BT.709 / 30 fps CFR） |
| 验收 | 本机 60 s 成片渲染 ≤ 8 分钟（**待实测**，演示前测）；10–15 s 片段 ≤ 90 秒；中途取消后可重试 |

### video-R9 质检（质检 Agent）

检查项见 §6.5。验收：故意塞进黑屏 2 s、错误数字、超时长三个坏样例，全部被拦截并给出可定位的原因（时间码 + 段落）。

### video-R10 公众号草稿（发布 Agent）

| 项 | 内容 |
|---|---|
| 输入 | `Storyboard`、`Claim[]`、成片关键帧 3–5 张、IP 海报、QC 通过的成片 |
| 处理 | 按卫华文风写推文；配图压到 < 1 MiB JPG/PNG；写飞书文档（`core.feishu`）；`core.review` 通过后调 feishu-towechat `sync --commit` |
| 输出 | `Article{title, digest, body, images[], cover}` + 草稿 `media_id` |
| 验收 | 标题 ≤ 32 字、摘要 ≤ 120 字、正文 < 20,000 字（feishu-towechat 预检）；`draft/get` 校验通过才算成功；正文所有数字和视频一致 |

### 5.1 IP 毛绒化风格规范 `IpStyleSpec v0.1`

> 参考：官方海报（3D Q 版、红白机甲风，David / Hanna），见调研报告 B6。下表是本作品自定的毛绒版规范，**不是官方规范**；色值在拿到 VI 后替换。

| 维度 | 规范 |
|---|---|
| 材质 | 主体：短绒水晶超柔（minky），可见细绒毛和轻微起球；头盔：硬挺的毛毡 + 明线缝边；护目镜 / 面罩：半透明软胶片（大卫蓝色，小华浅蓝）；胸前标志、腰带：刺绣贴布；眼睛：黑色安全眼 + 一颗白色高光；不允许塑料反光、金属质感、写实皮肤 |
| 配色（暂定） | 卫华红 `#D7141A`（主色，机甲服）；奶白 `#F4F1EA`（头盔、袖套，比纯白更像绒布）；点缀蓝 `#2F7BEA`（护目镜）；点缀黄 `#F2B705`（腰带）；头发 黑 `#1E1E1E`。红白面积约 6:3，蓝黄合计 ≤ 10% |
| 比例 | 头身比约 1 : 1.2（官方海报接近 1 : 2，毛绒版更矮胖）；四肢短圆，手是连指手套形，不画手指；大卫身体比小华宽约 10%、高约 5% |
| 大卫 | 黑色短发（绒线块面，不分缕）；白红头盔 + 红色耳罩 + 蓝色护目镜推在额头；红色连体服，胸前刺绣卫华标志，黄蓝腰带；眉毛粗短，表情稳重 |
| 小华 | 黑色双发髻（两颗绒球）；白色头盔 + 半透明浅蓝面罩；红白上衣 + 红色百褶短裙；机械手臂改成白色绗缝袖套；靴子奶白；眼睛更大，表情灵动 |
| 表情 | 用刺绣线条画嘴和眉（不做写实口腔）；腮红是两块淡粉色绒布圆片；表情库：微笑、大笑、眨眼、惊讶、认真、思考、害羞、得意 |
| 光照与镜头 | 柔光棚拍，浅景深，45° 主光 + 轮廓光，背景纯色或浅灰渐变，像毛绒玩具产品照 |
| 禁止 | 不加入其他品牌或 IP 元素；不画成真人；不改变角色性别、发型、主配色；不出现起重设备以外的危险动作（站在吊钩下等，违反安全规范） |

**角色一致性怎么保证**

1. **定稿参考集**：先用官方海报做参考，生成每个角色的「正面、3/4 侧面、背面」各 4 张候选，人工各选 1 张，组成 6 张定稿参考图。这是唯一的视觉真值，版本号写进 `IpStyleSpec`。（正式三视图拿到后替换，见 §13）
2. **固定提示词**：提示词分成「锁定块」+「变量块」。锁定块逐字固定（材质、配色、比例、角色外形，见下），变量块只允许改表情、动作、道具、背景、构图。
3. **每次都带参考图**：所有图片生成都同时传入对应角色的 2–3 张定稿参考图（图像模型的参考图 / 多图编辑能力）；视频片段一律用**审核过的静帧做首帧**做图生视频，不用纯文生视频。
4. **自动检查 + 人工审核**：视觉模型按清单打分（头盔颜色、发型、胸前标志、主配色、头身比、材质），< 0.8 自动重生成，最多 2 次；之后进 `core.review`，人工通过才入库。
5. **双人同框**：先分别生成单人图再合成，或在提示词里写明左右站位，并同时传两个角色的参考图。

锁定块示例（大卫）：

```
毛绒玩具产品照，short-pile minky 绒布材质，可见细绒毛与明线缝边；
角色「大卫」：Q 版男孩，头身比 1:1.2，黑色绒线短发，
奶白色毛毡头盔配红色耳罩，蓝色半透明软胶护目镜推在额头，
卫华红连体服，胸前刺绣标志，黄蓝刺绣腰带，连指手套形小手，
黑色安全眼带白色高光，粗短刺绣眉；柔光棚拍，浅景深。
不要：塑料反光、金属、写实皮肤、手指、其他品牌元素。
```

**P0 产出清单**

| 类型 | 数量 | 内容 |
|---|---|---|
| 表情包 | 8 | 「你好呀」（小华挥手）、「收到」（大卫敬礼）、「点赞」、「加油」（握拳）、「谢谢」（鞠躬）、「我想想」（托腮问号）、「搞定！」（举小吊钩玩具）、「安全第一」（双人指安全帽）；240×240 PNG，透明底 |
| 海报 | 2 | ①「HELLO WEIHUA 毛绒版」双人形象海报，3:4；②「大卫小华带你看 3800 吨」：IP + 设备画面合成，用于推文封面和片头，16:9 |
| 视频出镜片段 | 3 | 片头打招呼 3 s（图生视频）；讲解叠加：透明底 PNG 角色 + Remotion 弹跳 / 指向动画，叠在画面右下角；片尾双人挥手 4 s（图生视频） |

---

## 6. Agent / Skill 设计

**编排**：底座编排器（医晓模式）跑一张固定 DAG，每一步输出都过 JSON Schema 校验，不合格的打回本步重试 1 次，再失败走兜底。

```
          ┌──────────────┐
主题+模板 ─▶│ 1 编剧/分镜  │──Storyboard──┬──────────────┐
          └──────────────┘              ▼              ▼
                                 ┌────────────┐  ┌────────────┐
             素材 / MediaAsset ─▶│ 2 素材理解 │  │ 3 IP       │◀─ IpStyleSpec
                                 └─────┬──────┘  └─────┬──────┘
                              ShotSelection        IpAsset[]
                                       └──────┬───────┘
                                              ▼
                                       ┌────────────┐
                                       │ 4 剪辑包装 │── EditPlan → Remotion
                                       └─────┬──────┘
                                         rendered.mp4
                                              ▼
                                       ┌────────────┐  不通过：回 4（最多 1 次）
                                       │ 5 质检     │──────────────▶
                                       └─────┬──────┘
                                          QcReport
                                              ▼
                                       ┌────────────┐
                                       │ 6 发布     │── core.review ──▶ 公众号草稿
                                       └────────────┘
```

人工节点（`core.review`）：故事板确认（演示里可设为自动通过）、IP 资产入库、写公众号草稿前。

### 6.1 编剧/分镜 Agent

| 项 | 内容 |
|---|---|
| 职责 | 主题 → 脚本 → 分镜表；只决定「讲什么、每段要什么画面」，不选具体素材 |
| Skills | `storyboard-template`（读模板骨架）、`weihua-copy-style`（官方文风和类比写法）、`claim-builder`（把检索结果写成 `Claim`） |
| Tools | `core.search(query, "publicity")`、读取 `MediaAsset`、`core.review` |
| 兜底 | **确定性规则**：① 字数 ≤ 时长 × 4.5；② 字幕 / HUD 里的数字用正则抽出，必须逐个匹配 `claims[].text`，匹配不上整段打回；③ 总时长对齐模板。规则两次不过 → 该段用模板默认文案（模板里预置、已核对出处）。**人工**：故事板页可直接改 |

```ts
Storyboard {
  id: string; jobId: string; templateId: "mega-equipment" | "smart-factory";
  title: string; durationSec: number; aspect: "16:9"; fps: 30;
  segments: Array<{
    id: string;               // "S1"…
    role: string;             // 模板段落：opening / ip_intro / scale / craft / lifting / specs / brand
    startSec: number; durationSec: number;
    visual: { requiredTags: string[]; shotTypes: ("aerial"|"wide"|"medium"|"close-up")[];
              note: string; fallback: ("mediaAsset"|"ai_broll"|"mg_card")[] };
    caption?: string;         // 屏幕主字幕
    voiceover?: { text: string; voice: "narrator_male" | "hanna_female" | "david_male" };
    hud?: { label: string; value: number; unit: string; analogy?: string; claimId: string };
    ipCue?: { character: "david" | "hanna" | "both"; asset: "intro_clip" | "overlay" | "outro_clip"; pose?: string };
    packaging: ("scanline" | "hud" | "title")[];
    transitionOut: "cut" | "light_sweep" | "zoom_through" | "fade";
  }>;
  claims: Claim[];            // 底座统一结构 {text, evidence:[source], confidence}
  music: { mood: "epic" | "tech"; trackId?: string };
}
```

### 6.2 素材理解 Agent

| 项 | 内容 |
|---|---|
| 职责 | 给每段素材建档；按分镜选镜头；不够时补位 |
| Skills | `industrial-shot-taxonomy`（§5 video-R3 词表 + 识别线索）、`shot-matcher` |
| Tools | Montage `analyze-bundle`（ffprobe、normalize、contact-sheet、视觉建档、cache）、`material-scene-planner`（改造）、AI 空镜池、`MediaAsset` 读取 |
| 兜底 | **确定性**：没有视觉模型 Key 或调用失败 → Montage `local-vision-analyzer` 只用技术指标（运动、亮度、模糊）+ 文件名/目录标签；质量 overall < 0.4 的区间不进候选；同一源区间不重复；不跨原片切点。**补位链**：MediaAsset → AI 空镜池 → MG 字卡。**人工**：故事板页每段可换候选 |

```ts
ShotSelection {
  segmentId: string;
  source: "footage" | "mediaAsset" | "ai_broll" | "mg_card";
  assetId: string; sourceIn: number; sourceOut: number;   // 秒；图片为 0/0
  role: string; score: number;                              // 0–1
  rationale: string;                                        // 中文一句话
  alternatives: Array<{ assetId: string; sourceIn: number; sourceOut: number; score: number }>;
  aiGenerated: boolean;                                     // 用于成片和推文里的标注
}
// MaterialAnalysis 直接沿用 Montage src/domain/analysis.ts 的 materialAnalysisSchema
```

### 6.3 IP Agent

| 项 | 内容 |
|---|---|
| 职责 | 维护 `IpStyleSpec` 和定稿参考集；批量出表情包、海报；为故事板的 `ipCue` 提供出镜素材 |
| Skills | `ip-plush-style`（§5.1 规范 + 锁定提示词）、`ip-consistency-check` |
| Tools | 图像生成（带参考图，`baoyu-image-gen` 已接 Seedream / GPT Image 等；或 ChatCut `submit_image`）、图生视频（ChatCut `submit_video`，`seedance-2-5` 首帧模式）、去背景、`core.review` |
| 兜底 | **确定性**：一致性分 < 0.8 自动重生成，最多 2 次；视频片段只用审核过的首帧。**降级**：生成失败或审核不过 → 用 IP 资产库里已通过的版本（演示前预生成）。**人工**：所有 IP 资产入库前必须人工通过 |

```ts
IpAsset {
  id: string; specVersion: string;                       // IpStyleSpec 版本
  character: "david" | "hanna" | "both";
  kind: "sticker" | "poster" | "intro_clip" | "overlay" | "outro_clip";
  file: string; width: number; height: number; durationSec?: number; alpha: boolean;
  expression?: string; pose?: string; caption?: string;  // 表情包文字
  prompt: { locked: string; variable: string; refImages: string[]; model: string; seed?: number };
  consistency: { score: number; checks: Record<"helmet"|"hair"|"emblem"|"palette"|"ratio"|"material", boolean> };
  review: "pending" | "approved" | "rejected";
}
```

### 6.4 剪辑包装 Agent

| 项 | 内容 |
|---|---|
| 职责 | 把故事板、选好的镜头、IP 素材、配音合成 `EditPlan`，提交渲染 |
| Skills | `voice-driven-timing`（按配音时长调段落）、`packaging-presets`（P0 五种包装的参数） |
| Tools | TTS（`TtsProvider` 中文实现）、Montage `normalizeAudio` / `normalizeVideo`、Remotion `render`、队列 |
| 兜底 | **确定性**：EditPlan 过 Montage `editPlanSchema` 校验（时间线连续、时长相等、音轨不越界）；TTS 失败 → 用缓存音频 → 再失败该段只出字幕不出配音并在 QC 里标黄；渲染失败 → 降低并发重试 1 次 |

`EditPlan` 在 Montage `src/domain/edit-plan.ts` 基础上扩展：

```ts
EditPlan (extends Montage editPlanSchema) {
  mode: "storyboard";                          // 新增，原来是 template | ai-script
  targetDurationSeconds: number;               // 放开 20–30 s 限制，改为 10–120 s
  width: 1920; height: 1080; fps: 30;          // 原来写死 1080×1920
  segments: Array<Montage.EditPlanSegment & {
    transition: "cut" | "light_sweep" | "zoom_through" | "fade";
    overlays: Array<
      | { type: "hud"; label: string; value: number; unit: string; analogy?: string; claimId: string; at: number }
      | { type: "scanline"; direction: "horizontal" | "contour"; at: number; duration: number }
      | { type: "ip_overlay"; ipAssetId: string; anchor: "bottom-right" | "bottom-left"; at: number; duration: number }
      | { type: "title"; text: string; at: number }
      | { type: "ai_label"; text: "AI 生成画面" }
    >;
  }>;
  audioTracks: Montage.AudioTrack[];           // narration / music / original
  captions: Array<{ text: string; start: number; end: number; style: "main" | "ip_dialog" }>;
  lut: "weihua-industrial-v1";
}
```

### 6.5 质检 Agent

| 检查项 | 级别 | 实现 | 来源 |
|---|---|---|---|
| 编码：H.264 High / yuv420p / BT.709 / 30 fps CFR / 帧数 | 阻断 | ffprobe | **复用** Montage `inspectVideoQuality` |
| 全片可解码 | 阻断 | ffmpeg decode | 复用 |
| 黑屏 ≥ 0.3 s、冻结 ≥ 2 s | 阻断 | `blackdetect` / `freezedetect` | 复用；P0 片头片尾的刻意黑场加白名单 |
| 响度 −16 ± 1 LUFS，true peak ≤ −1.5 dBTP | 阻断 | `loudnorm` 测量 | 复用 |
| 时长 = EditPlan ± 1 帧 | 阻断 | 规则 | 新增 |
| 字幕 / HUD 数字全部能对上 `Claim` | 阻断 | 规则（对 EditPlan 文本，不靠 OCR） | 新增 |
| 字幕、HUD 不出 90% 安全区 | 阻断 | 规则（组件布局计算） | 新增 |
| IP 出镜点在指定时段出现，且是已审核资产 | 阻断 | 规则（EditPlan 引用的 `IpAsset.review == approved`） | 新增 |
| AI 空镜都带「AI 生成画面」角标 | 阻断 | 规则 | 新增 |
| 字幕和配音对齐 ≤ 200 ms | 警告 | TTS 时长对照 | 新增 |
| 抽 9 帧做语义抽检：画面和字幕是否明显不符、是否出现人脸特写 / 不宜公开的画面 | 警告 | 视觉模型 | 新增，**只能报警，不能放行阻断项** |

兜底：阻断项不通过 → 带问题清单（段落 + 时间码 + 建议）回剪辑包装 Agent 自动修 1 次（复用 Montage「感知失败时换候选计划重渲染一次」机制）→ 仍不过 → 进人工复核，不进入发布。

```ts
QcReport {
  jobId: string; renderPath: string; passed: boolean; attempt: number;
  checks: Array<{ id: string; level: "block" | "warn"; passed: boolean;
                  detail: string; segmentId?: string; atSec?: number; frame?: string }>;
  measured: { durationSec: number; lufs: number; truePeak: number; frames: number };
}
```

### 6.6 发布 Agent

| 项 | 内容 |
|---|---|
| 职责 | 写配套推文，排版，写进公众号草稿箱 |
| Skills | `weihua-copy-style`（感叹号标题、短句分行、“大国重器”等用语，**极限用语必须有 Claim 支撑**）、`article-layout` |
| Tools | `core.feishu`（建飞书文档）、feishu-towechat（`html` 预览 / `sync --commit` 写草稿）、`baoyu-compress-image`、`core.review` |
| 兜底 | **确定性**：标题 ≤ 32、作者 ≤ 16、摘要 ≤ 120、正文 < 20,000 字且 < 1 MiB、图 < 1 MiB；数字与 `Claim` 对齐（同 QC 规则）。**流程**：未经 `core.review` 不写草稿；feishu-towechat 返回 `ip_allowlist_required` 时不重试，先给出 HTML 预览，等人确认 IP 白名单后再 `publish`；`ambiguous` 结果不算成功 |

```ts
Article {                       // 约定第 4 节 E → 公众号，具体 Schema 以底座 PRD 为准
  title: string;                // ≤ 32 字
  digest: string;               // ≤ 120 字
  author: string;               // 默认「卫华集团」（待确认）
  body: string;                 // Markdown，写入飞书文档后由 feishu-towechat 渲染
  images: Array<{ path: string; caption?: string; source: "frame" | "ip_poster" | "mediaAsset" | "ai" }>;
  cover: string;                // 默认海报②
  videoRef?: { renderPath: string; note: string };   // P0：正文放封面帧 + 文字说明；P1 上传素材库
  claims: Claim[];
  feishuDocUrl?: string; draftMediaId?: string;
}
```

---

## 7. 故事板模板

> 两套模板都沿用官方「航拍 + 提升 + 参数字幕」风格：开场大场面 → 尺寸 / 工艺 → 吊装作业 → 参数卖点 → 品牌收尾。配音按 4 字/秒估算。表中参数都来自调研报告，生成时由编剧 Agent 写成 `Claim`，出处是原文链接。

### 7.1 模板一「超大设备科普」`mega-equipment`（60 s，样例主题：3800 吨门机）

| 段 | 时间 | 画面要求（role / 景别） | 主字幕 / HUD | 配音（≤ 字数） | IP | 包装 / 转场 |
|---|---|---|---|---|---|---|
| S1 开场 | 0–6 s | `aerial_wide` 航拍，设备整体，缓慢推近 | 片头标题「3800 吨，站起来了！」 | 旁白：在浙江温州，一台巨型门机完成了整体提升。（≤ 22） | — | 标题；光带擦除 |
| S2 IP 引入 | 6–10 s | IP 片头片段（图生视频） | 「大卫小华带你看」 | 小华：大家好，我是小华！今天带你看个大家伙。（≤ 16） | 小华 `intro_clip` | 缩放穿越 |
| S3 尺寸 | 10–20 s | `aerial_wide` / `wide` 仰拍主体；缺素材用 D 的 3D 录屏 | HUD「整机高度 166.5 m」+ 类比「相当于 50 多层楼」 | 旁白：整机高 166.5 米，相当于 50 多层楼。（≤ 40） | 大卫 `overlay` 指向 | 扫描线；HUD |
| S4 工艺 | 20–30 s | `structure_detail` / `welding_process` 特写 | 「主梁 · 小车 · 吊具」（只写部件名，不写无出处的“自主制造”类说法，见 §14.2 第 8 条） | 旁白：主梁、小车和吊具，一段段焊接、拼装。（≤ 40） | — | 扫描线；光带擦除 |
| S5 提升 | 30–42 s | `girder_lift` 主梁离地、钢丝绳受力；缺素材用 AI 空镜 | 「2026 年 7 月 整体提升完成」 | 旁白：2026 年 7 月 3 日，整机完成整体提升。（≤ 48） | — | 缩放穿越 |
| S6 参数卖点 | 42–52 s | `wide` / MG 字卡 | HUD 依次：起升高度 130 m；双小车各 1900 t；跨度 107 m | 旁白：起升高度 130 米，上下两台小车各 1900 吨。（≤ 40） | 小华 `overlay` | HUD ×3 |
| S7 品牌收尾 | 52–60 s | IP 片尾片段 + Logo | 「卫华起重，让世界轻松起来」 | 大卫：卫华起重，让世界轻松起来！（≤ 14） | 双人 `outro_clip` | 片尾品牌卡；淡出 |

参数出处：[5679](https://www.cranewh.com/detail/5679.html)、[5739](https://www.cranewh.com/detail/5739.html)；口号：[culture](https://www.cranewh.com/culture)。

### 7.2 模板二「智能工厂宣传」`smart-factory`（45 s）

| 段 | 时间 | 画面要求（role / 景别） | 主字幕 / HUD | 配音（≤ 字数） | IP | 包装 / 转场 |
|---|---|---|---|---|---|---|
| S1 开场 | 0–5 s | `aerial_wide` 厂区航拍 | 片头标题「走进卫华智能工厂」 | 旁白：走进卫华智能工厂。（≤ 20） | — | 标题；光带擦除 |
| S2 荣誉 | 5–12 s | `smart_line` 产线全景 | HUD「国家智能制造示范工厂 2023」「首批卓越级智能工厂 2025」 | 旁白：国家智能制造示范工厂，首批卓越级智能工厂。（≤ 28） | — | HUD；扫描线 |
| S3 IP 引入 | 12–16 s | IP 片头片段 | 「跟大卫逛工厂」 | 大卫：我是大卫，跟我来！（≤ 16） | 大卫 `intro_clip` | 缩放穿越 |
| S4 智能制造 | 16–26 s | `welding_process` 焊接机器人、`smart_line` | HUD「设计周期 15 天 → 8.8 天」 | 旁白：三维设计让设计周期从 15 天缩短到 8.8 天。（≤ 40） | — | 扫描线；光带擦除 |
| S5 无人天车 | 26–34 s | `aicrane_ops` 无人天车作业；`control_screen` | 「AICrane 无人天车」 | 旁白：无人天车自动抓取、自动调度。（≤ 32） | 小华 `overlay` | HUD 角框 |
| S6 数据 | 34–40 s | `control_screen` 大屏 / MG 字卡 | HUD「起重管家 接入 3 万多台设备」 | 旁白：起重管家平台，已接入 3 万多台设备。（≤ 24） | — | HUD |
| S7 收尾 | 40–45 s | IP 片尾 + Logo | 「知重负重 唯实唯勤」 | 小华：卫华起重，让世界轻松起来！（≤ 16） | 双人 `outro_clip` | 片尾品牌卡 |

参数出处：[5437](https://cranewh.com/detail/5437.html)、[chinacrane](http://www.chinacrane.net/news/202501/10/291053.html)、[河南日报 2026-06-10](https://dzb.henandaily.cn/html5/2026-06/10/content_14_1796672.htm)、调研报告 C9。

模板以 JSON 存放（格式沿用 Montage `planning/templates/product-showcase.json` 的 slots），放在 `prd/assets/video/` 下作为开发输入（开发时生成）。

---

## 8. 数据与接口

### 8.1 数据来源与样例方案

| 数据 | P0 来源 | 说明 |
|---|---|---|
| 实拍素材 | ① 自己在园区/工地可公开拍摄的片段；② 主办方授权的内部素材；③ 授权后的官网 mp4（品牌片、3600t 载荷试验） | **授权待确认**；未授权前演示只用①和 AI 空镜，界面上不出现官网视频 |
| AI 空镜池 | ChatCut `seedance-2-5` 提前生成 6–8 段（航拍厂区、主梁提升、焊花、无人天车、控制大屏、港口门机剪影），每段 5–8 s | 全部标「AI 生成画面」；不生成带卫华 Logo 的画面 |
| 作品 D 的 `MediaAsset` | D 的交互页录屏、效果图 | 联调前用 D 的样例文件 |
| 宣传口径 | `core.search(..., "publicity")`，语料是调研报告引用的官网公开新闻 | 只用公开信息 |
| IP 参考 | 官方海报（链接见调研报告 B6），本地只放演示用的参考图 | 授权待确认 |
| 配乐 | 免版权音乐库 2 首（史诗、科技） | P1 AI 生成 |

本作品不处理客户名、金额等敏感字段；如果实拍素材里有客户现场，按 D 的规则只用公开或自拍画面。视觉建档支持切到本地模式（Montage `local-vision-analyzer`，只用技术指标），满足底座「只用本地模型」要求，但选镜头质量会下降。

### 8.2 和底座的接口

| 底座能力 | 本作品怎么用 |
|---|---|
| Agent Runtime + 编排器 | 6 个 Agent 的 DAG（§6） |
| 模型切换 | 编剧、发布用云端大模型；视觉建档默认云端（MiniMax，Montage 已接），可切本地 |
| `core.search` | 编剧 Agent 查历年宣传口径和参数 |
| `Claim` | 所有字幕 / HUD / 推文里的数字；界面点击可看原文 |
| `core.review` | 故事板确认、IP 资产入库、写公众号草稿前 |
| `core.feishu` | 推文写成飞书文档，供 feishu-towechat 读取 |
| 品牌外壳 | 统一登录、卫华红主题、大卫小华作为助手形象（毛绒版可回馈给底座使用） |

### 8.3 和其他作品的接口（约定第 4 节）

**消费 `MediaAsset`（D → E）**

| 字段 | E 怎么用 |
|---|---|
| 类型 = 交互页录屏 | 作为视频片段，进素材理解 Agent 建档，role 默认 `structure_detail` |
| 类型 = 效果图 | 图片片段，加缓推；用于「装在你厂里」类段落 |
| 类型 = 3D 模型 | P0 不直接用（要求 D 同时给一段转台录屏）；P1 渲染转台或做线框包装 |
| 产品型号 | 写进故事板标题和推文；触发 `core.search` 查参数 |
| 卖点文案 | 编剧 Agent 的输入；里面的数字同样要过 `Claim` 校验 |
| 文件路径 | 入库（SHA-256 去重） |

**产出 `Article`（E → 公众号）**：字段见 §6.6，对应约定里的「标题、正文、配图、封面」。

本作品内部对象（不跨作品）：`VideoJob`、`Storyboard`、`ShotSelection`、`IpAsset`、`IpStyleSpec`、`EditPlan`、`QcReport`。

---

## 9. 页面与交互

| 页面 | 关键交互 |
|---|---|
| ① 新建任务 | 输入主题；选模板（卡片显示样片缩略图）；拖入素材或勾选「来自作品 D」的素材；开关：IP 出镜、生成推文 |
| ② 故事板 | 分镜表逐段展示：时间、画面要求、选中镜头缩略图 + 理由、字幕、配音、HUD（数字可点开出处）；每段可换候选、改文字；「确认并渲染」 |
| ③ IP 工坊 | 风格规范（只读卡片 + 定稿参考图）；表情包 8 宫格、海报 2 张、出镜片段 3 段；每张显示一致性分和审核按钮 |
| ④ 渲染与质检 | 阶段进度（建档 / 配音 / 渲染 / 质检）；播放器；QC 清单（红黄绿，点击跳到时间码） |
| ⑤ 发布 | 左边公众号手机预览，右边标题 / 摘要 / 封面可改；「提交审核」→「写入草稿箱」；显示草稿 `media_id` 和校验结果 |

```
② 故事板
┌──────────────────────────────────────────────────────────────────────┐
│ 3800 吨，站起来了！   模板：超大设备科普  60s  16:9    [确认并渲染] │
├────┬────────┬──────────────┬───────────────────┬───────────────────┤
│段  │时间    │选中镜头       │字幕 / HUD          │配音                │
├────┼────────┼──────────────┼───────────────────┼───────────────────┤
│S1  │0–6s    │[航拍缩略图]   │3800 吨，站起来了！ │在浙江温州，一台…   │
│    │        │得分0.86 换▾   │                   │                   │
│S3  │10–20s  │[仰拍缩略图]   │HUD 166.5 m ⓘ出处  │整机高 166.5 米…    │
│    │        │IP:大卫 指向    │相当于50多层楼 ⓘ    │                   │
│S5  │30–42s  │[AI空镜] AI生成│2026年7月整体提升ⓘ │2026 年 7 月 3 日…  │
└────┴────────┴──────────────┴───────────────────┴───────────────────┘

④ 渲染与质检
┌───────────────────────────────┬──────────────────────────────┐
│                               │ 质检  ✔ 9  ⚠ 1  ✖ 0           │
│         [ 播放器 ]            │ ✔ 编码 H.264 High / BT.709    │
│                               │ ✔ 响度 -16.2 LUFS / -1.8 dBTP │
│ ▶ 00:23 / 01:00               │ ✔ 数字与出处一致 7/7           │
├───────────────────────────────┤ ✔ IP 资产均已审核             │
│ 建档 ■■■ 配音 ■■■ 渲染 ■■□ QC □ │ ⚠ S4 字幕与配音差 240ms ▶跳转 │
└───────────────────────────────┴──────────────────────────────┘
```

---

## 10. 演示脚本（约 4 分 30 秒）

| 时间 | 操作 | 画面 | 讲解词（要点） |
|---|---|---|---|
| 0:00–0:20 | 打开工作台，进入「视频生产线」 | 首页 + 毛绒大卫小华助手 | 宣传部做 1 分钟片子要翻素材、剪、配字幕、核参数，还要另写推文。我们把它做成一条流水线。 |
| 0:20–0:50 | 拖入 20 段厂区素材 + 勾选 D 推来的 3800t 交互页录屏；输入「3800 吨门机完成整体提升」，选「超大设备科普」 | 新建任务页 | 一句主题，一批素材，就够了。 |
| 0:50–1:40 | 等故事板出来（建档命中缓存，约 20 s），点开 S3 的 HUD 出处 | 故事板页；出处弹窗显示官网原文 | 故事板沿用卫华官方「航拍 + 提升 + 参数字幕」的套路。屏幕上每个数字都有出处，没有出处的数字规则会直接打回。素材不够的段落自动用 AI 空镜补，并标注出来。 |
| 1:40–2:20 | 切到 IP 工坊 | 毛绒大卫小华定稿图、8 个表情包、2 张海报 | 官方只有一张 3D 海报，我们定了一套毛绒规范：材质、配色、比例、表情。用定稿参考图 + 锁定提示词保证每张都是同一个角色，每张都过人工审核。 |
| 2:20–3:20 | 回到故事板，把 S6 剪成 12 s 短片段点「现场渲染」；同时播放预渲染好的 60 s 完整成片 | 渲染进度条；播放成片：航拍 → 小华打招呼 → 扫描线 + HUD → 提升 → 双人片尾 | 完整成片提前渲好；现场这段 12 秒，大概 1 分钟出来。（展示 HUD、扫描线、光带转场） |
| 3:20–3:45 | 打开质检报告；再演示一个坏样例：把 HUD 改成 200 m | QC 全绿；坏样例出现红色「数字无出处」 | 渲染完要过质检：编码、黑屏、冻结、响度，复用的是已经跑过生产的门禁；数字对不上出处，片子出不去。 |
| 3:45–4:10 | 进入发布页，点「提交审核」→ 审核通过 →「写入草稿箱」 | 公众号手机预览 → 返回草稿 `media_id` 和校验通过 | 推文和视频同一套口径、同一批出处，审核后一键写进公众号草稿箱，发不发由人决定。 |
| 4:10–4:30 | **链路串联**：回到首页链路图 | D → E → 公众号 高亮 | 内容创作链：D 生成 3800t 交互科普页 → E 自动剪进成片、IP 出镜 → 公众号草稿。检索底座同时给 B 查标配、给 E 查宣传口径。 |

演示保底：现场网络或渲染出问题时，切到提前录好的全流程录屏；公众号写草稿如果遇到 IP 白名单问题，切到 feishu-towechat 的 HTML 预览。

---

## 11. 验收标准与评测

| 指标 | 目标 | 测法 |
|---|---|---|
| 端到端成功率 | 两套模板各跑 5 次，≥ 9/10 一次出成片 + 草稿 | 用测试包 A、B |
| 出片时间（60 s 成片，建档命中缓存） | ≤ 10 分钟（**待实测**） | 计时 |
| 现场片段渲染（12 s） | ≤ 90 秒 | 演示机实测 |
| 数字与出处一致 | 100%（阻断项） | 规则统计 + 人工抽查 |
| 选镜头可用率 | ≥ 80% 段落被评为「可用」 | 3 人对 14 段打分 |
| 字幕与配音对齐 | 偏差 ≤ 200 ms 的句子 ≥ 95% | TTS 时长对照 |
| 响度 / 峰值 | −16 ± 1 LUFS，≤ −1.5 dBTP | QC 测量 |
| 黑屏 / 冻结 | 0 次（白名单除外） | QC |
| IP 一致性 | 8 个表情包人评均分 ≥ 4/5；角色混淆 0 次 | 5 人打分 |
| 公众号草稿 | `draft/get` 校验通过；标题、摘要、正文都在限制内 | feishu-towechat 回执 |
| 坏样例拦截 | 3/3 被拦截且能定位 | 测试包 C |

**测试样例**

| 包 | 内容 | 用途 |
|---|---|---|
| A 设备包 | 20 段（航拍、提升、焊接、细节、人物各若干）+ D 的录屏 1 段 | 模板一 |
| B 工厂包 | 15 段（产线、机器人、大屏、天车） | 模板二 |
| C 坏样例 | 只有 5 段素材；主题里带一个无出处的数字（「4000 吨」）；人为插入 2 s 黑屏的渲染结果；超时长的配音 | 补位、Claim 规则、QC |
| 主题集 | 5 句：「3800 吨门机完成整体提升」「走进卫华智能工厂」「无人天车如何干活」「新中式起重机为什么更矮」「大卫小华带你看车间」 | 故事板规则测试 |

---

## 12. 复用的已有项目

### 12.1 凉感 Montage（`C:\Users\ASUS\Desktop\AI自动化剪辑`）

| 模块 | 路径 | 处理 | 说明 |
|---|---|---|---|
| 媒体探测 / 归一化 | `src/media/ffprobe.ts`、`normalize-video.ts`、`analyze-video.ts`、`extract-frames.ts` | **直接用** | 30 fps CFR 归一化、切点/运动/亮度/模糊度分析 |
| 素材语义建档 | `src/analysis/analyze-bundle.ts`、`contact-sheet.ts`、`minimax-vision-analyzer.ts`、`openai-compatible-analyzer.ts`、`local-vision-analyzer.ts`、`cache.ts` | **直接用，改提示词** | 联系表单次请求 + SHA-256 缓存不变；提示词和标签换成工业镜头词表 |
| 分析与计划 Schema | `src/domain/analysis.ts`、`edit-plan.ts`、`material.ts` | **改造** | `analysis.ts` 不动；`edit-plan.ts` 放开 20–30 s 时长、加 `storyboard` 模式、overlays、captions |
| 镜头规划 | `src/planning/material-scene-planner.ts`、`template-planner.ts`、`templates/*.json` | **改造** | 打分、不跨切点、不重复的逻辑保留；`summer-quilt-semantics.ts` 换成 `industrial-semantics.ts`；模板 JSON 换成两套工业模板 |
| 脚本生成 | `src/planning/script-planner.ts`、`local-script-generator.ts` | **重写** | 换成编剧/分镜 Agent（中文、Claim 约束） |
| Remotion 渲染 | `src/remotion/render.ts`、`Root.tsx`、`project.ts` | **改造** | 渲染管线和并发控制保留；尺寸从 1080×1920 改为 1920×1080 并参数化 |
| 画面模板 | `src/remotion/SummerQuiltAd.tsx` | **重写** | 换成 `WeihuaStoryboard.tsx` + 包装组件（HUD、扫描线、光带转场、缩放穿越、片头片尾、IP 叠加、字幕） |
| 配音 | `src/voice/voice-service.ts`、`domain/voice-catalog.ts` | **改造** | `TtsProvider` 接口和语音缓存保留；`ja-JP` 音色 → 中文音色；新增国内 TTS Provider（MiniMax 语音或火山 / 阿里，**选型待定**），Google `cmn-CN` 做备选 |
| 翻译 | `src/translation/*`、`worker/translation-runtime.ts` | **去掉** | 中文直出，不需要翻译 |
| 队列与 Worker | `src/worker/main.ts`、`render-worker.ts`、`lease-maintenance.ts`、`server/project-store.ts`、`library-store.ts` | **直接用** | 持久化队列、lease、取消、重试、分阶段进度；`render-worker.ts` 里写死的 1080×1920 / 521 帧改为从 EditPlan 读 |
| 质量门禁 | `src/media/normalize-video.ts` 中 `inspectVideoQuality`、`render-worker.ts` 感知失败重渲染 | **直接用 + 扩展** | 新增 §6.5 里的规则检查 |
| 测试 | `tests/*.test.ts` | **直接用** | 改 schema 后对应更新 edit-plan、render-smoke、planner 测试 |
| Web 工作台 | `src/web/*` | **不用** | 页面走底座统一外壳 |

### 12.2 ChatCut Desktop（本机，MCP `mcp__chatcut_desktop__*` + chatcut 系列 skills）

只读了 skill 文档和工具说明，没有创建或修改任何 ChatCut 项目。

| 能力 | ChatCut 对应 | 可行性评估 | 本作品用法 |
|---|---|---|---|
| AI 空镜生成 | `submit_video`（skill `video-gen`；首选 `seedance-2-5`，4–30 s，支持首尾帧和多参考；`seedance2fast` 几分钟出、上限 720p） | 可行；按积分计费，单段生成要几分钟到十分钟，**不适合现场调用** | **P0 离线预生成** 空镜池 6–8 段 |
| IP 出镜片段 | `submit_video` 首帧模式 + `submit_image` | 可行；一致性靠首帧 | **P0 离线生成** 片头、片尾 2 段 |
| 特效 / 转场 | `create-pixel-processor`（Web / HTML 像素处理器）、`shader-gen`、内置库 `browse_library` | 可行，但效果挂在 ChatCut 时间线上，不能直接给 Remotion 用 | P0 在 Remotion 自己写；ChatCut 放 P1 精修 |
| MG | `create-motion-graphics`（支持 **Remotion 源码**，可转透明视频） | 可行；同一份 Remotion 组件可以两边复用 | P0 包装组件按 Remotion 写，P1 直接导进 ChatCut |
| 字幕 | `edit_captions` / 字幕模板 | 可行，但需要转写或卡片 | P0 不用：脚本文本已知，Remotion 直接画；P1 用它的动态字幕模板 |
| 配音 | `submit_voice`（TTS、克隆） | 可行；中文音色质量**待试听** | P0 备选 TTS |
| 抠像 / 追踪 | 内置 Mask Portrait / Smart Object、`select_matte_object` | 可行，需逐镜头操作 | P1（#82 抠像追踪） |
| 口型 / 数字人 | `submit_lipsync`、`digital-human` | digital-human 说明里明确不用于游戏 / 3D 角色；卡通 IP 口型**待实测** | P1 |
| 导出 | `export`、`track_progress` | 可行 | P1「在 ChatCut 中打开精修」后导出 |

**分工结论**：Remotion 负责成片主渲染（确定性、可批量、源码可控、和 Montage 队列 / 质检打通、离线可跑）；ChatCut 负责两件事：① 生成类素材的来源（AI 空镜、IP 片段，P0 离线）；② 人工精修台（P1，把 EditPlan 转成 ChatCut 时间线）。P0 主链路不依赖 ChatCut 在线，ChatCut 宕机或积分不足不影响演示。

### 12.3 其他

| 项目 | 路径 | 处理 |
|---|---|---|
| feishu-towechat | `~/.claude/skills/feishu-towechat` | **直接用**：`html` 预览、`sync --commit` 写草稿、`draft/get` 校验；凭据走 `WECHAT_APP_ID / WECHAT_APP_SECRET` 或 DPAPI 文件 |
| baoyu-image-gen / baoyu-compress-image | `~/.claude/skills/` | **直接用**：IP 图片生成（带参考图）、配图压缩到 < 1 MiB |
| 医晓 | `E:\医晓` | 参考多 Agent + 确定性规则「大模型不能降级」的模式（由底座编排器提供） |
| Heritage Foundry | `tbszz/Heritage-Foundry` | P1：IP 3D 化（Tripo） |

---

## 13. 两天开发计划

> 前提：底座的 Runtime、编排器、`core.search`、`Claim`、`core.review`、`core.feishu` 在 D1 下午前能用；没好之前用本地桩（同样的函数签名）。

| 半天 | 内容 | 产出 / 检查点 |
|---|---|---|
| **D1 上午** | ① Fork Montage：尺寸参数化、放开时长、去翻译、加中文 TTS Provider；② 工业镜头词表 + 建档提示词；③ 两套模板 JSON；④（并行）IP：用官方海报做参考出定稿候选，人工选定 6 张，写死锁定提示词；ChatCut 离线提交 AI 空镜池和 IP 片头片尾 | 测试包 A 能建档；能用中文配音渲出一条无包装的竖改横样片 |
| **D1 下午** | ① 编剧/分镜 Agent + Claim 规则；② Remotion 包装组件：HUD、扫描线、光带擦除、缩放穿越、片头片尾、IP 叠加、字幕；③ 配音反推时长；④ IP：表情包 8、海报 2 生成和审核 | 主题 → 故事板 → 带包装的第一版成片 |
| **D2 上午** | ① 编排器串 6 个 Agent；② 质检扩展（Claim、安全区、IP、AI 角标、时长）；③ 补位链；④ 页面：新建、故事板、IP 工坊、渲染质检 | 两套模板各出 1 条完整成片；坏样例 3/3 拦截 |
| **D2 下午** | ① 发布 Agent + 飞书文档 + feishu-towechat 写草稿；② 发布页；③ 预渲染两条演示成片、录全流程备份视频；④ 实测渲染时间，定现场片段长度；⑤ 彩排 2 遍 | 公众号草稿 `draft/get` 通过；演示脚本跑通 |

---

## 14. 风险与待确认事项

### 14.1 风险

| 风险 | 影响 | 应对 |
|---|---|---|
| 实拍素材授权：内部视频、官网 mp4、工地画面 | 不能用就没有真实素材 | 先用自拍 + AI 空镜跑通；授权后替换；未授权素材不进演示 |
| AI 视频生成时长和成本：单段几分钟到十分钟，按积分计费 | 现场等不起、预算超 | 全部离线预生成并入库复用；生成前用 `estimate_generation` 估积分；P0 总量控制在 10 段以内（**积分预算待确认**） |
| 渲染时间：60 s 1080p 在笔记本上可能要数分钟 | 现场冷场 | 预渲染完整成片 + 现场只渲 10–15 s 片段；D2 下午实测后定片段长度 |
| IP 一致性：生成模型可能把角色画走样 | 品牌风险 | 定稿参考集 + 锁定提示词 + 自动打分 + 人工审核；不过审的不进片 |
| IP 授权：毛绒化属于对公司 IP 的再创作 | 不能对外展示 | 演示前向主办方确认；确认前只在内部演示 |
| 参数口径：官方不同文章数字可能不一致（如 3000t 小车 1500 t / 1600 t） | 字幕出错 | 只用调研里一致的数字；不一致的不上屏；`Claim.confidence` 低于阈值时打回 |
| 中文 TTS 音色不够「大气」 | 观感一般 | 准备 2 家 TTS 试听后选定；保底用人工录一段旁白（Montage 支持上传配音） |
| 公众号写草稿要 IP 白名单、AppSecret | 现场写不进去 | 提前配好并跑通一次；不行就切 HTML 预览 |
| ChatCut 依赖（积分、桌面端在线） | AI 空镜和 IP 片段出不来 | P0 主链路不依赖 ChatCut 在线；素材提前生成好 |
| 实拍画面里有人脸、客户现场、未公开设备 | 合规 | 选素材时排除；QC 语义抽检报警；推文配图人工过一遍 |

### 14.2 需要向主办方确认

1. 内部实拍素材（视频、照片）和官网视频（品牌片、3600t 载荷试验等）能否用于黑客松演示，授权范围到哪里（只内部演示 / 可公开）。
2. 大卫小华的**三视图、源文件、官方色值和使用规范**；毛绒化再创作是否被允许，演示后能否对外使用。
3. VI 手册和品牌主色值（目前暂用 `#D7141A`）。
4. 能否提供一个测试用公众号（或「卫华集团」号的测试草稿权限）及 AppID / 白名单配置；推文默认作者署名。
5. AI 视频 / 图片生成的预算（ChatCut 积分或其他平台额度）由谁承担。
6. 演示环境：现场电脑配置（影响渲染时间）、能否联网。
7. 宣传部目前做一条 1 分钟片子的实际工时和流程（用于答辩里的效率对比数字）。
8. 「全部自主制造」「国内首台套」这类说法在视频和推文里能否使用、以哪份官方口径为准（目前模板一 S4 只写部件名）。
9. 卫华内部是否已有指定的配乐库 / 字体（字体版权）。
