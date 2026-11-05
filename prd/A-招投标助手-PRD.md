# 作品 A：招投标助手 PRD（模块代号 `bid`）

> 版本 v0.1 · 2026-11-06
> 依据：`prd/_约定.md`、`选题方案.md` v0.3「作品 A」、`research/卫华集团调研报告.md`、`场景新.xlsx`、超聚变 Q1 仓库 `tbszz/XFusion_AI_Hackathon/question1`
> 底座能力（Agent Runtime、编排器、脱敏、检索、Claim、飞书、复核、导出、品牌外壳）只引用、不重新设计，Schema 以 `00-平台底座-PRD.md` 为准。

---

## 1. 一句话定位

给**国际部业务员**和**客户保障部（销售管理部）标书专员**用的多 Agent 助手：一句话说清楚要找什么标，它从海外公开招标平台把标找回来、推到飞书分给对应业务员；选中一条后，自动列出要准备的材料，从公司资料库里配好证照和业绩、检查有没有过期，填好授权书和承诺书，再出一份甲方背调报告，人工确认后打成材料包。

---

## 2. 背景与痛点

### 2.1 场景表原话

| 序号 | 场景 | 原话（摘录） | 本作品怎么覆盖 |
|---|---|---|---|
| **#80（主报）** | 投标报名资料整理、注册网站、项目系统查询自动整理 | 「1、可以根据我资料库里面的信息、资料等，根据甲方报名资料模板或公司固定的授权书、承诺书模板自动整理资料，填写授权书、承诺书等信息；2、可以自动根据公司信息注册网站；3、链接公司内部网站，根据多个模块里面的信息进行整理汇总。」 | 第 1 点是 P0 核心；第 2 点**不做自动注册**，改成生成「注册信息清单」；第 3 点 P0 用模拟资料库代替，P1 接内部系统只读接口 |
| #76 | 海外项目招标信息自动化采集管理系统 | 「通过AI工具实现海外项目招标信息的自动化获取，通过数据清洗和筛选后同步至飞书主动开发项目信息管理系统中，并分配至对应业务同事进行开发使用」 | 招标雷达 Agent，P0 |
| 参考场景 | 标书购买材料自动准备（客户保障部） | 现在：「人工按每家要求找材料、拼装、上传」；痛点：「碎、量大，各平台要求不一样」；期望：「读取招标公告，自动列出所需材料并从材料库拼好待上传」 | 公告解析 + 资料匹配 + 复核，P0 |
| #9 / 参考场景 | 供应商调查报告自动生成（客户保障部（销售管理部）） | 现在：「人工查各类网站并整理」；痛点：「只有1人在做」；期望：「输入供应商名称，自动查公开信息，生成标准调查报告」 | 背调 Agent，P0 对甲方，P1 对供应商批量 |
| #33 | 国外目标市场抓取客户信息及自动生成名录（国际部） | 「通过某一关键词（如Crane,Hoist,Industry）快速精准触达搜集当地某一区域相关行业信息……并快速筛选潜在客户的信息，并以Excel表格形式、自动导出结果」 | P1：复用雷达抓到的中标公告，整理成买方名录和竞品入局名录，导出 Excel |

几处值得在答辩里点出来的细节：

- #76 原话写的是「同步至**飞书**主动开发项目信息管理系统」，说明国际部已经在用飞书多维表格管项目。调研阶段「卫华是否在用飞书：未查到」，这条可以补上（仍需主办方确认租户能否用于比赛）。
- 参考场景里「标书购买材料」和「供应商调查报告」都写在**客户保障部**名下，「只有 1 人在做」——这是同一个岗位的连续工作，合并成一个作品理由充分。

### 2.2 调研事实（与本作品相关）

| 事实 | 对本作品的意义 | 出处 |
|---|---|---|
| 设 6 大海外战区，在俄罗斯、墨西哥等 8 个国家设办事处，100 多个海外营销服务机构，国际团队近 400 人 | 雷达按战区分配商机；战区具体划分**待确认** | [craneweihuaglobal global_markets](https://www.craneweihuaglobal.com/global_markets/) |
| 海外服务中心：乌克兰、沙特、乌兹别克斯坦、泰国、新加坡、墨西哥、马来西亚 | 定 P0 优先监控市场 | [craneweihua.com/internat](https://craneweihua.com/internat) |
| 沙特阿美电力车间项目 2023-10 在达曼签约，金额近 1000 万美元；另有 NEOM、马来西亚东海岸铁路、泰国林查班港等 | 中东是已验证市场，演示用「中东」有说服力；这些项目可作业绩库模拟样例的参照 | [cranewh 5418](https://www.cranewh.com/detail/5418.html)、[global news/616](https://www.weihuacraneglobal.com/news/616.html) |
| 卫华海洋做过 23 个海外港口（韩国、肯尼亚港务局、智利、缅甸等） | 港口起重机是海外重点品类 | [osfair](https://osfair.com/articles/global-expansion-81) |
| 2025 年海外营收增长约 35% | 海外找标需求在增长 | [河南日报 2026-10-18](https://dzb.henandaily.cn/html5/2026-10/18/content_10_1815362.htm) |
| 国内公开中标样例：广州工控项目卫华 891 万元 vs 河南矿山 933 万元 | 国内标讯可沿用 Q1 的国内源；中标公告能看出对手 | [gdebidding](https://www.gdebidding.com/zbjggs/208429.jhtml) |
| 2025 年合格供应商名录 PDF 已公开（安阳钢铁、日照钢铁、SEW 等，按等级划分） | 供应商背调 P1 的真实输入样例 | [1744852047966125.pdf](https://img.craneweihua.com/upload/20250417/1744852047966125.pdf) |
| 常见对手：河南矿山、圣起、三一海洋、振华；国外 Konecranes、Demag | 中标公告里识别竞品入局（#33 P1） | 调研报告 A5、C11 |
| 上届内部 AI 挑战赛最佳创意奖是「AI 搭建外贸客户信息管理系统」 | 答辩要讲清区别：我们不是客户管理系统，而是「找标 → 报名材料 → 背调」的投标前置流水线 | [jdzj 339228](https://www.jdzj.com/news/339228.html) |

---

## 3. 用户与场景

| 岗位 | 现在怎么做 | 做成后怎么做 |
|---|---|---|
| 国际部业务员 | 每天自己翻各国招标网站、多边银行网站，靠关键词手搜；漏标靠运气；找到后手动录入飞书 | 每天早上 8:30 飞书收到「今日新标」卡片，已按战区分给自己；点「认领」进入跟进 |
| 国际部主管 / 战区负责人 | 不知道团队覆盖了哪些平台、漏了哪些标 | 多维表格看全部标讯、认领状态、来源覆盖率 |
| 客户保障部标书专员（全公司可能只有 1 人） | 每个标拿到公告后，逐条读资格要求，去共享盘翻营业执照、ISO、特种设备许可证、业绩合同，检查过期，手填授权书和承诺书，人工查甲方和供应商背景 | 在工作台点「生成材料包」：3 分钟内拿到材料清单（绿/黄/红）、填好的授权书和承诺书、甲方背调报告；只处理红黄项，人工确认后导出 |
| 销售经理 | 等标书专员排期 | 材料包和 `TenderPackage` 自动流转给报价（作品 B），商机节点自动进飞书跟进（作品 C） |

---

## 4. 范围

### 4.1 P0（两天内必须演示的完整闭环）

> 演示闭环：输入「中东 港口起重机 近 3 个月」→ 招标清单推到飞书 → 选一条 → 材料清单 + 填好的授权书和承诺书 + 甲方背调报告 → 人工确认 → 材料包。

| # | 能力 | 说明 |
|---|---|---|
| P0-1 | 一句话找标 | 解析市场、产品、时间范围；关键词按「中英阿」词表自动扩展 |
| P0-2 | 3 个海外源 | 世界银行 API、欧盟 TED API 实时调用；沙特 Etimad 访客公开列表用无头浏览器低频抓取 + 缓存（见 7.2） |
| P0-3 | 清洗、去重、打分、分配 | 复用 Q1 去重；按产品线相关度和截止时间排序；按战区规则分给业务员 |
| P0-4 | 推送飞书 | 写入飞书多维表格「海外标讯」，并给负责人发消息卡片 |
| P0-5 | 公告解析 | 从公告正文中抽出资格要求、关键时间、所需材料，每条都附原文出处 |
| P0-6 | 资料匹配 | 去模拟的公司资料库里配证照、资质、业绩、人员，以投标截止日为基准检查有效期 |
| P0-7 | 文书填写 | 公司固定模板：授权书、承诺书，各一个中文版和一个英文版（英文按世行标准招标文件里的 Manufacturer's Authorization / Bid-Securing Declaration 结构） |
| P0-8 | 甲方背调 | 制裁名单、多边银行禁入名单、项目融资信息、公开新闻；风险分用确定性规则计算 |
| P0-9 | 复核 + 材料包 | 列出缺失项、过期项、风险项，经 `core.review` 人工确认后导出 zip（Word + PDF + 清单 Excel） |
| P0-10 | 注册信息清单 | 针对目标平台（如 Etimad、UNGM），从资料库生成注册需要填的字段清单，人工照着填 |
| P0-11 | 串联输出 | 产出 `TenderPackage` → B、`Opportunity` → C |

### 4.2 P1（加分项，有时间再做）

| # | 能力 |
|---|---|
| P1-1 | 更多源：UNGM、亚行 ADB、亚投行 AIIB、非洲开发银行、国内 Q1 原有的 5 个源（中国招标投标公共服务平台等） |
| P1-2 | 甲方模板自动填写：识别甲方 Word 模板里的下划线空白和「[ ]」占位，映射到资料库字段 |
| P1-3 | 供应商批量背调：输入供应商名录（如 2025 合格供应商名录 PDF），批量出报告（#9） |
| P1-4 | 海外客户名录（#33）：从世行、TED 的中标公告里整理「谁买过起重机、谁中了标」，导出 Excel |
| P1-5 | 接内部系统（#80 第 3 点）：通过 CRM/OA 只读接口或导出文件，汇总项目信息 |
| P1-6 | 公告附件（PDF 招标文件）解析：调用底座的文档解析，抽取技术协议章节给 B |
| P1-7 | 国内主体背调：天眼查官方开放平台 API（需采购）替换演示缓存 |

### 4.3 不做（明确写出来）

| 不做 | 原因 | 替代方案 |
|---|---|---|
| **自动注册招标网站**（#80 第 2 点） | 各平台有验证码、手机/邮箱验证、实名认证，沙特 Etimad 等还要求本地商业登记；自动注册既做不稳，也有合规风险 | 生成「注册信息清单」（P0-10），人工照着填 |
| 自动购买标书、自动上传投标文件 | 涉及付款和以公司名义提交，必须由人操作 | 材料包按平台要求的文件名和格式整理好，人工上传 |
| 登录态抓取、绕过反爬/验证码 | 合规风险；Q1 的剑鱼、采招网登录态源在本作品不启用 | 只用免登录公开页面和官方 API；被拦就降级到缓存 |
| 付费标讯聚合平台（dgMarket、TendersInfo、GlobalTenders 等） | 需要订阅，比赛期间无法提供 | P1 之后如公司已有账号再评估 |
| 电子签章、自动盖章 | 法律效力问题 | 文书里留出签字盖章位，人工处理 |
| 让大模型决定风险等级或「能不能投」 | 结论必须可复核、可复现 | 风险分走确定性规则表（6.4），模型只写摘要 |
| 编写完整技术标/商务标 | 超出两天范围，且技术协议归作品 B | 只交 `TenderPackage` 给 B |

---

## 5. 功能需求

| 编号 | 名称 | 输入 | 处理 | 输出 | 验收标准 |
|---|---|---|---|---|---|
| **bid-R1** | 一句话意图解析 | 自然语言，如「中东 港口起重机 近 3 个月」「每天早上 8 点推东南亚桥式起重机的标」 | 规则先解析（复用 Q1 `nlp.py` 的时间和频率解析，新增海外地区词典和产品词表），模型只复核冲突；地区展开为国家列表，产品展开为多语种关键词（7.3） | `SearchIntent`（6.3） | 10 条测试句，市场、产品线、时间三要素全对 ≥ 9 条；界面显示展开后的国家和关键词，可手动增删 |
| **bid-R2** | 多源抓取 | `SearchIntent` | 每个源一个适配器（继承 Q1 `TenderSource`），各自超时、限速、失败隔离；实时失败自动读当天缓存，并在界面标「缓存 · 抓取于 hh:mm」 | `TenderNotice[]` 原始集合 + 每个源的状态 | 3 个源都能返回结果或明确的降级状态；任何一个源挂掉不影响出结果 |
| **bid-R3** | 清洗、去重、相关度打分 | 原始 `TenderNotice[]` | 去重：同源 ID、URL、标题归一化相似度（复用 Q1 `cleaning.py`）；相关度：正向词命中、CPV 码命中、负向词扣分（如 tower crane、truck-mounted crane、crane hire）；截止风险：复用 Q1 `attach_risk` | 排好序的 `Opportunity[]`（6.3），每条带「为什么相关」 | 20 条人工标注样本上 precision@10 ≥ 80%；已截止的标不进主列表 |
| **bid-R4** | 分配与推送飞书 | `Opportunity[]` + 战区分配表（模拟） | 按国家 → 战区 → 负责人规则分配；写入飞书多维表格（`core.feishu`），已推送过的按 `content_hash` 跳过（复用 Q1 `storage.py`）；给负责人发卡片，按钮：认领 / 忽略 / 生成材料包 | 多维表格新增行、消息卡片 | 演示时 30 秒内飞书出现记录和卡片；重复运行不重复推送 |
| **bid-R5** | 定时监控 | 带频率的意图 | 复用 Q1 `scheduler.py`（APScheduler + SQLite），增量只推新标 | 定时任务列表 | 演示用「每 1 分钟」模式能触发一次增量 |
| **bid-R6** | 公告解析 | 一条 `Opportunity` 的正文（含 HTML）和附件链接 | 模型按 Schema 抽取资格要求、关键时间、所需材料、投标保证金、语言、币种；**每个字段必须带原文片段**，代码校验片段确实出现在正文里，校验不过就丢弃并标「需人工确认」；日期用正则二次校验 | `ParsedTender`（6.3） | 10 条标注公告：关键时间准确率 100%（错了宁可空），资格要求召回 ≥ 85%；所有字段都能点开看到原文 |
| **bid-R7** | 资料匹配与有效期检查 | `ParsedTender.requirements` + 公司资料库 | 每条要求先归到「资料类型码」（7.4.2）：关键词规则优先，规则不中再让模型归类并给置信度，置信度 < 0.7 交人工；按类型码去资料库取件；业绩按条件过滤（年限、吨位、品类、地区、份数）；有效期以**投标截止日**为基准判定 | `MaterialChecklist`：每项绿（齐全有效）/ 黄（30 天内过期或需人工确认）/ 红（缺失或已过期） | 5 个边界用例（已过期、截止前过期、业绩年限不够、缺件、要求不明确）全部判对；匹配结果和资料库记录一一可追溯 |
| **bid-R8** | 授权书、承诺书填写 | 模板 + 资料库 + `ParsedTender` | 模板用 Word 占位符（`{{company.name_en}}` 这类）；字段值**只能**来自资料库或公告解析结果，每个字段记录来源；取不到的值填成红色「【待补：字段名】」，不允许模型编写；中文模板和英文模板按公告语言自动选择 | 填好的 .docx + 字段来源表 | 4 个模板都能生成；抽查生成文书，编造字段数 = 0；缺失字段 100% 标红 |
| **bid-R9** | 甲方背调 | 甲方名称（+ 国家）或供应商名称 | 依次查：制裁名单、多边银行禁入名单、项目融资信息、国别风险分类、公开新闻；国内主体加查工商信息（演示用缓存）；按规则表计分；模型只把查到的事实写成摘要，每条事实是一个 `Claim` | `DueDiligenceReport`（6.3）+ Word/PDF | 同一输入两次运行分数一致；6 个测试主体（含 2 个虚构命中名单的主体）等级全对；每条结论都有出处 |
| **bid-R10** | 注册信息清单 | 目标平台 + 资料库 | 按平台字段模板（P0 内置 Etimad、UNGM 两个）从资料库取值，标出需要人工准备的项（如沙特本地商业登记、DUNS 号） | Excel / 飞书文档清单 | 清单字段 100% 有值或明确标「需人工」 |
| **bid-R11** | 复核与材料包 | 上面所有产出 | 汇总红黄项和风险项，提交 `core.review`；通过后按「序号_材料名_语言.pdf」规则命名打包 | 材料包 zip + 复核记录 | 未经复核不能导出；复核意见写入审计日志 |
| **bid-R12** | 串联输出 | 复核通过的材料包 | 组装 `TenderPackage`（给 B）和 `Opportunity`（给 C）；写飞书多维表格对应字段 | 两个对象 | 字段满足 `_约定.md` 第 4 节，B/C 能直接读 |
| bid-R13（P1） | 海外客户名录 | 市场 + 关键词 | 从世行合同授予公告、TED 授予公告里提取买方和中标方，识别国内同行（河南矿山、振华等）和国际品牌（Konecranes、Demag 等） | Excel：买方、国家、采购品类、年份、中标方、金额、来源链接 | 每行有来源链接 |
| bid-R14（P1） | 供应商批量背调 | 名录 Excel/PDF | 逐个跑 bid-R9 | 汇总表 + 单份报告 | — |

---

## 6. Agent / Skill 设计

### 6.1 总体编排

用底座编排器（医晓模式）串 6 个 Agent。前 1 个按「找标」触发，后 5 个按「选中一条标」触发。每个 Agent 都是「确定性代码打底 + 模型只做它擅长的那一小段」，模型失败时整条链不中断。

```text
一句话 ─▶ ① 招标雷达 ─▶ Opportunity[] ─▶ 飞书多维表格 + 卡片
                                         │ 用户点「生成材料包」
                                         ▼
              ② 公告解析 ─▶ ParsedTender ─┬─▶ ③ 资料匹配 ─▶ MaterialChecklist ─┐
                                          ├─▶ ④ 文书填写 ─▶ FilledDoc[]        ├─▶ ⑥ 复核 ─▶ core.review ─▶ 材料包
                                          └─▶ ⑤ 背调     ─▶ DueDiligenceReport ─┘          └▶ TenderPackage→B / Opportunity→C
```

③④⑤ 互不依赖，并行执行。

### 6.2 6 个 Agent 分工

| Agent | 职责 | 模型做什么 | 确定性代码做什么 | 兜底 |
|---|---|---|---|---|
| ① 招标雷达 | 意图解析、多源抓取、去重打分、分配推送 | 复核意图冲突；给每条标写一句中文摘要（外文公告翻译） | 意图规则解析、关键词扩展、各源适配器、去重、相关度打分、分配规则、飞书写入 | 模型失败：摘要用公告原标题 + 机器翻译占位；源失败：读缓存；全部失败：展示演示缓存集并显式标注 |
| ② 公告解析 | 抽资格要求、时间、材料、保证金 | 按 Schema 抽取，附原文片段 | 片段存在性校验、日期正则校验、时区归一 | 校验不过的字段置空并标「需人工确认」；模型完全失败：只用正则抽日期，其余全部交人工 |
| ③ 资料匹配 | 要求 → 资料类型码 → 资料库条目；查有效期 | 规则没归上类的要求，模型归类并给置信度 | 关键词归类、资料库查询、业绩过滤、有效期判定 | 置信度 < 0.7 或无法归类：标黄，交人工指定 |
| ④ 文书填写 | 选模板、填字段 | 无（P0）；P1 识别甲方模板空白 | 模板渲染、字段取值、来源记录、缺失标红 | 任一字段取不到：标红「【待补】」，不阻断生成 |
| ⑤ 背调 | 查公开信息、算风险分、写报告 | 把事实写成摘要；新闻是否与主体相关的判定（仅作参考，不进分数） | 各数据源查询、名单匹配、规则计分、定级 | 某数据源不可用：该规则记「数据不足」，不加分，报告置信度降级并要求人工复核 |
| ⑥ 复核 | 汇总问题、提交人工、打包 | 生成复核摘要（3–5 句话） | 汇总红黄项、风险项、阻断项；调 `core.review`；打包导出 | 永远需要人工确认，模型不参与放行 |

### 6.3 输入输出 Schema

> 字段名统一用英文，与底座 Schema 对齐；`Claim` 和 `Source` 结构以底座为准。`*` 表示必填。

```ts
// ① 招标雷达 —— 输入
interface SearchIntent {
  raw_query*: string;               // 「中东 港口起重机 近 3 个月」
  markets*: string[];               // ["SA","AE","QA","OM","KW","BH","IQ","EG"]（ISO 国家码）
  market_label: string;             // 「中东」
  product_lines*: string[];         // ["port_crane"]，见 7.3 产品线代码
  keywords*: {lang: string; terms: string[]}[];   // 展开后的多语种词
  negative_terms: string[];
  cpv_codes: string[];              // TED 用
  date_from*: string; date_to*: string;           // ISO 日期
  frequency?: "once"|"daily"|"weekly"|"minutely";
  send_time?: string;
}

// ① 招标雷达 —— 输出（也是 A→C 的交换对象）
interface Opportunity {
  opportunity_id*: string;          // bid-<source>-<source_id>
  name*: string;                    // 商机名称（中文摘要标题）
  title_original*: string;
  source*: "worldbank"|"ted"|"etimad"|"ungm"|"adb"|string;
  source_url*: string;
  notice_type*: "invitation"|"prequalification"|"eoi"|"award"|"other";
  buyer*: string;                   // 甲方
  country*: string; region*: string;// 区域 = 战区
  product_lines: string[];
  relevance_score*: number;         // 0–100
  relevance_reasons*: string[];     // 「命中 STS crane」「CPV 42414140」
  published_at*: string;
  key_dates*: {name: "publish"|"clarification_deadline"|"bid_deadline"|"bid_opening"; at: string; evidence?: Claim}[];
  owner*: {name: string; feishu_open_id: string};   // 负责人
  funding?: string;                 // 「World Bank IDA-72640」
  doc_fee?: {amount: number; currency: string};
  is_cached*: boolean; fetched_at*: string;
  content_hash*: string;
}

// ② 公告解析 —— 输入：Opportunity + 正文 HTML/附件链接；输出：
interface ParsedTender {
  opportunity_id*: string;
  tender_no*: string;               // 招标编号，如 RFB No.
  language*: string; currency?: string;
  key_dates*: Opportunity["key_dates"];
  requirements*: Requirement[];     // 资格要求 + 所需材料
  bid_security?: Claim;             // 投标保证金/保函要求
  technical_docs: {name: string; url: string}[];   // 技术协议/规格书附件 → 给 B
  unparsed_notes: string[];         // 抽不出来、需要人工看的段落
}
interface Requirement {
  req_id*: string;
  category*: "eligibility"|"experience"|"financial"|"technical"|"document"|"form";
  text*: string;                    // 原文
  text_zh*: string;                 // 中文
  evidence*: Claim;                 // 原文出处
  material_type?: string;           // ③ 填，资料类型码，见 7.4.2
  constraints?: {min_count?: number; within_years?: number; min_capacity_t?: number; region?: string; min_amount?: number; currency?: string};
}

// ③ 资料匹配 —— 输出
interface MaterialChecklist {
  opportunity_id*: string;
  base_date*: string;               // 判定有效期的基准日 = 投标截止日
  items*: {
    req_id*: string;
    material_type*: string;
    status*: "green"|"yellow"|"red";
    reason*: string;                // 「ISO 9001 证书 2027-03-01 到期，有效」
    matched: {library_id: string; name: string; expiry?: string; file: string}[];
    match_method*: "rule"|"model"|"manual";
    confidence*: number;
  }[];
}

// ④ 文书填写 —— 输出
interface FilledDoc {
  template_id*: string;             // "auth_letter_zh" | "auth_letter_en_maf" | "commitment_zh" | "bid_securing_declaration_en"
  file_path*: string;
  fields*: {key: string; value: string|null; source: "library"|"tender"|"system"; source_ref: string}[];
  missing_fields*: string[];
}

// ⑤ 背调 —— 输入：{subject_name*, country*, subject_role*: "buyer"|"supplier", tender_amount_est?}；输出：
interface DueDiligenceReport {
  subject_name*: string; country*: string; subject_role*: "buyer"|"supplier";
  risk_score*: number;              // 0–100
  risk_level*: "low"|"medium"|"high"|"blocked";
  rule_hits*: {rule_id: string; points: number; evidence: Claim}[];
  data_gaps*: string[];             // 哪些数据源没查到
  confidence*: "full"|"partial";    // 有数据缺口就是 partial
  sections*: {title: string; claims: Claim[]}[];   // 基本信息、名单筛查、项目融资、国别风险、新闻
  summary*: string;                 // 模型写的摘要，只能引用 claims
  generated_at*: string; file_path*: string;
}

// ⑥ 复核 —— 输出（也是 A→B 的交换对象）
interface TenderPackage {
  tender_no*: string;               // 招标编号
  opportunity_id*: string;
  buyer*: string;                   // 甲方
  bid_deadline*: string;            // 截止时间
  technical_docs*: {name: string; url: string; local_path?: string}[];  // 技术协议文件
  requirements*: Requirement[];     // 资格要求
  checklist*: MaterialChecklist;
  documents*: FilledDoc[];
  buyer_dd*: Pick<DueDiligenceReport,"risk_level"|"risk_score"|"file_path">;
  review*: {status: "approved"|"rejected"; reviewer: string; at: string; comment?: string};
  package_path*: string;            // 材料包 zip
}
```

### 6.4 背调风险评分规则表（确定性，不交给大模型）

- 起始 0 分，命中规则加分，封顶 100；**一票否决**规则命中直接定为 `blocked`。
- 等级：0–29 低，30–59 中，60–100 高。
- 某条规则所需的数据源不可用时，这条规则**不加分**，记入 `data_gaps`，报告置信度降为 `partial`，等级旁边显示「数据不足，需人工复核」。
- 规则表存成配置文件（YAML），版本号写进报告页脚，改规则要走复核。

| 规则 ID | 规则 | 适用 | 数据源 | 分值 |
|---|---|---|---|---|
| DD-01 | 主体名称命中联合国安理会综合制裁名单 / 美国 OFAC SDN 名单 / 欧盟金融制裁名单（名称归一化后完全匹配，或别名匹配） | 全部 | 各名单官方公开下载文件 | **一票否决** |
| DD-02 | 命中世界银行禁入/交叉禁入企业名单 | 全部 | 世行 Debarred Firms 公开页 | +60 |
| DD-03 | 经营状态为吊销、注销、停业、清算 | 国内主体 | 工商信息（演示用缓存） | +60 |
| DD-04 | 列入失信被执行人 | 国内主体 | 同上 | +40 |
| DD-05 | 近 2 年有被执行人记录：任一记录 +10；被执行总额 ≥ 注册资本 10% 再 +10 | 国内主体 | 同上 | +10 / +20 |
| DD-06 | 近 12 个月列入经营异常名录 | 国内主体 | 同上 | +15 |
| DD-07 | 近 12 个月有行政处罚 | 国内主体 | 同上 | +10 |
| DD-08 | 近 2 年作为被告的买卖合同/承揽合同纠纷 ≥ 3 起（付款能力信号） | 甲方 | 同上 | +15 |
| DD-09 | 成立不满 1 年 +15；1–3 年 +8 | 全部 | 工商信息 / 公开注册信息 | +15 / +8 |
| DD-10 | 注册资本 < 本项目估算金额 | 甲方 | 工商信息 + 公告 | +10 |
| DD-11 | 所在国 OECD 国家风险分类为 6 类 +10，7 类 +15 | 境外主体 | OECD 公开分类表 | +10 / +15 |
| DD-12 | 近 12 个月公开新闻中，主体名称与负面词同时出现（拖欠、破产、欺诈、腐败、bankruptcy、fraud、corruption、default 等，词表固定），每条 +5，最多 +15 | 全部 | 新闻检索 | +5 ~ +15 |
| DD-13 | 项目有世行/亚行等多边开发银行融资（付款来源有保障） | 甲方 | 公告的 funding 字段 / 世行项目 API | −10 |
| DD-14 | 甲方是政府部门或国有港务/能源机构 | 甲方 | 公告买方类型 | −5 |

说明：
- 负向分只在没有一票否决时生效，最低到 0。
- DD-12 只做关键词共现计数，模型可以在报告里注明「这条新闻可能与主体无关」，但**不能改分**。
- 演示中涉及「命中名单」「有负面记录」的主体一律用虚构公司名，不对真实企业展示负面结论。

### 6.5 Skills 与 Tools 清单

| 类型 | 名称 | 被谁用 | 说明 |
|---|---|---|---|
| Tool | `bid.source.worldbank.search` | ① | 世行 procnotices API |
| Tool | `bid.source.ted.search` | ① | TED v3 Search API |
| Tool | `bid.source.etimad.list` | ① | 无头浏览器读访客列表，限速 + 缓存 |
| Tool | `bid.keywords.expand` | ① | 词表展开（7.3） |
| Tool | `bid.library.query` | ③④ | 资料库查询（按类型码、条件） |
| Tool | `bid.template.render` | ④ | docx 占位符渲染 |
| Tool | `bid.dd.sanctions_check` / `bid.dd.debarment_check` / `bid.dd.wb_project` / `bid.dd.news` / `bid.dd.cn_registry_cache` | ⑤ | 背调数据源 |
| Service | `bid.dd.score` | ⑤ | 规则引擎（纯代码） |
| Skill | 「海外标讯解读」 | ② | 公告结构知识：世行 SPN/RFB、TED 表单、Etimad 字段含义 |
| Skill | 「投标资料类型码」 | ③ | 类型码定义 + 中英阿关键词 |
| 底座 | `core.feishu`、`core.review`、`core.redact`、`core.search`、`Claim`、导出、编排器 | 全部 | 不重复设计 |

---

## 7. 数据与接口

### 7.1 数据来源总览

| 数据 | 来源 | 真实 / 模拟 |
|---|---|---|
| 海外标讯 | 世界银行、TED、Etimad（P0）；UNGM、ADB 等（P1） | 真实公开数据 + 演示前一晚的缓存 |
| 公司资料库 | 模拟（7.4） | **全部模拟**：公司名称用「卫华（演示）」，证照号、人名、身份证号都是虚构的 |
| 授权书、承诺书模板 | 公司固定模板（待主办方提供）；没有就按通用格式和世行标准文件格式自拟 | 模拟 |
| 战区与业务员分配表 | 模拟 | 模拟，战区名待确认 |
| 制裁/禁入名单 | 联合国、OFAC、欧盟、世行公开名单 | 真实公开数据（演示命中用虚构主体插入测试副本） |
| 国内工商信息 | `tianyancha-cli` 缓存的 JSON | 演示只用缓存 |

### 7.2 海外数据源调研结论

> 只看公开页面，没有登录或注册。访问日期 2026-11-06。

| 平台 | 免登录能看列表 | 详情/正文 | API / RSS | 自动化可行性 | 结论 |
|---|---|---|---|---|---|
| **世界银行** procurement notices | 能 | 能，API 直接返回 `notice_text` 全文、截止日期和时间、联系人、融资编号 | **有公开 JSON API，免 Key**：`search.worldbank.org/api/v2/procnotices?format=json&qterm=crane`，实测 `crane` 全量 395 条，`overhead crane` 招标公告 10 条；支持 `notice_type_exact` 等过滤 | 高 | **P0 主力源** |
| **欧盟 TED** | 能 | 能（HTML/PDF/XML 多语种） | **有公开 Search API v3，搜索免 Key**：`POST api.ted.europa.eu/v3/notices/search`，支持专家查询语法和 CPV 过滤；实测 2026-08 以来起重机相关 CPV 命中 149 条 | 高 | **P0**：覆盖欧洲（卫华有英国、荷兰、芬兰项目），CPV 过滤精度高 |
| **沙特 Etimad**（政府采购平台） | 能，访客页 `tenders.etimad.sa/Tender/AllTendersForVisitor`，实测显示有效招标 2375 条 | 列表字段丰富：发布日、机构、参考号、答疑截止、投标截止、开标时间、**标书文件费**（多为 1000 里亚尔） | 页面通过 `AllSupplierTendersForVisitorAsync` 异步接口取数，但有 F5 机器人防护，curl 直接请求不稳定 | 中：要用无头浏览器、低频、带缓存 | **P0（中东演示用）**：实时尝试 + 缓存兜底；购买标书需要沙特本地注册，正好用来演示「注册信息清单」 |
| **UNGM**（联合国全球采购） | 能，`ungm.org/Public/Notice` 实测显示有效公告 1758 条 | 详情页公开；部分招标文件需注册后下载（**待确认**） | 没找到公开 API；搜索走带防伪令牌的表单接口，curl 返回 403 | 中低：浏览器自动化 | P1 |
| **亚洲开发银行 ADB** | 浏览器能打开招标页 | — | 页面提到 RSS 订阅，具体地址未确认；curl 返回 403 | 低 | P1，**待确认** RSS 地址 |
| **亚投行 AIIB** | 能（项目采购列表页 HTTP 200） | — | 未发现 API | 中 | P1 |
| 非洲开发银行 AfDB、欧洲复兴开发银行 EBRD | curl 403 / 跳转，未在浏览器深入验证 | — | 未确认 | — | P1，**待确认** |
| 国内源（Q1 原有：中国招标投标公共服务平台、中国采购与招标网等） | 能 | 能 | Q1 已实现 | 高 | P1（本作品聚焦海外，国内标可直接复用 Q1） |

**P0 结论：用 3 个源——世界银行 API + TED API（实时）+ Etimad 访客列表（浏览器抓取 + 缓存）。**

- 前两个是官方 API，演示时现场实时调用，证明「真的在抓」；Etimad 撑起「中东」这个演示市场。
- 世行和 TED 的中东结果偏少，所以「中东 港口起重机」演示的主要结果来自 Etimad + 世行，演示前一晚跑一次全量并缓存；界面如实标出哪些是缓存。
- 备用演示句：「东南亚 桥式起重机 近 3 个月」（世行实时结果更多）。
- 抓取规范：每个源每分钟不超过 10 次请求；只读公开页面；遵守 robots.txt；不保存个人联系方式以外的无关数据；联系人信息只在系统内展示，不外传。

### 7.3 关键词体系

#### 7.3.1 产品线 × 多语种词表（P0 内置，配置文件可改）

| 产品线代码 | 卫华产品线 | 中文 | English | العربية（中东） | Русский（俄语区/中亚） | Español（墨西哥/拉美） | 参考 CPV |
|---|---|---|---|---|---|---|---|
| `overhead_crane` | 桥式起重机（含新中式、双梁、冶金） | 桥式起重机、桥吊、行车、天车 | overhead crane, EOT crane, bridge crane, double girder crane, single girder crane, overhead travelling crane | رافعة علوية، رافعة جسرية | мостовой кран, кран-балка | grúa puente, puente grúa | 42414100 等，实现前用 TED CPV 表核对 |
| `gantry_crane` | 门式起重机 | 门式起重机、龙门吊、门吊 | gantry crane, goliath crane, semi-gantry crane | رافعة قنطرية | козловой кран | grúa pórtico | 同上 |
| `port_crane` | 港口机械（卫华海洋） | 岸桥、场桥、门座起重机、卸船机 | STS crane, ship-to-shore crane, quay crane, RTG, RMG, rubber tyred gantry, rail mounted gantry, portal crane, level luffing crane, ship unloader, harbour crane | رافعة الميناء، رافعة الحاويات، رافعة رصيف | портальный кран, контейнерный перегружатель | grúa portuaria, grúa pórtico de muelle | 42414110、42414140 等 |
| `hoist` | 电动葫芦 | 电动葫芦、钢丝绳葫芦、环链葫芦 | electric hoist, wire rope hoist, chain hoist | ونش كهربائي، رافعة سلسلة | таль, электротельфер | polipasto, polipasto eléctrico | 待核对 |
| `metallurgy_crane` | 冶金起重机 | 冶金起重机、铸造起重机 | ladle crane, foundry crane, casting crane | رافعة المغرفة | литейный кран | grúa de colada | — |
| `explosion_proof` | 防爆起重机 | 防爆起重机 | explosion-proof crane, ATEX crane | رافعة مقاومة للانفجار | взрывозащищённый кран | grúa antiexplosiva | — |
| `boat_hoist` | 船艇搬运 | 船艇搬运机、游艇吊 | boat hoist, mobile boat lifter, travel lift | رافعة القوارب | — | — | — |
| `shipyard_gantry` | 造船/海工门机 | 造船门机 | shipbuilding gantry crane, Goliath crane | — | — | — | — |
| `components` | 零部件（蒲瑞） | 减速机、车轮组、吊钩组、卷筒 | crane gearbox, crane wheel, hook block, wire rope drum, spreader | — | — | — | — |
| `smart_crane` | AICrane 智能起重机 | 无人天车、智能起重机 | automated crane, unmanned crane, smart crane | — | — | — | — |

**负向词（命中扣分，不直接过滤）**：tower crane、mobile crane、truck-mounted crane / truck fitted with crane、crawler crane、crane hire / rental、crane operator training、forklift。依据：世行 `crane` 首条结果就是「Truck Equipment fitted with Hydraulic Crane」，与卫华产品不符。

**通用词（单独出现时加分少）**：crane、hoist、lifting equipment、material handling。

> 阿拉伯语、俄语、西班牙语词条由模型初拟，**实现前请国际部当地同事校对**（列入待确认）。

#### 7.3.2 目标市场（按调研定优先级）

| 优先级 | 市场标签 | 国家（ISO） | 依据 | P0 源 |
|---|---|---|---|---|
| 1 | 中东 | SA、AE、QA、OM、KW、BH、IQ、EG | 沙特服务中心；沙特阿美、NEOM 项目 | Etimad、世行 |
| 1 | 东南亚 | TH、MY、SG、ID、VN、PH | 泰国、新加坡、马来西亚服务中心；林查班港、东海岸铁路 | 世行 |
| 2 | 中亚 / 俄语区 | UZ、KZ、RU、UA | 乌兹别克斯坦、乌克兰服务中心；俄罗斯办事处；哈萨克斯坦项目 | 世行 |
| 2 | 拉美 | MX、CL | 墨西哥服务中心、办事处、墨西哥西语站；智利港口 | 世行 |
| 3 | 欧洲 | EU 成员国、GB | 英国谢菲尔德、荷兰机场、芬兰项目 | TED |
| 3 | 非洲 | KE、TZ、NG 等 | 肯尼亚港务局项目 | 世行 |

「6 大海外战区」的正式划分没有公开，上表是按服务中心推的工作假设，**待主办方确认**后替换为正式战区。分配表（模拟）：`{战区 → 负责人飞书 open_id}`。

### 7.4 公司资料库

#### 7.4.1 结构

资料库是一组 JSON/YAML 记录 + 文件目录（P0），所有记录共用下面的公共字段；同时把文件文本灌进 `core.search` 的 `bid_library` 集合，供模糊检索。

| 公共字段 | 说明 |
|---|---|
| `library_id` | 唯一 ID |
| `material_type` | 资料类型码（7.4.2） |
| `entity` | 所属主体：集团 / 河南卫华 / 卫华海洋 / 蒲瑞……（投哪个主体就取哪个主体的件） |
| `name_zh` / `name_en` | 名称 |
| `number` | 证书号、合同号等（演示数据虚构） |
| `issuer` | 发证机关 / 客户 |
| `issue_date` / `expiry_date` | 签发日、到期日；长期有效写 `null` 并加 `perpetual: true` |
| `files` | `[{lang, path, sha256, pages}]`，每个语种一个扫描件 |
| `tags` | 自由标签，如「ISO」「港机」 |
| `updated_by` / `updated_at` | 维护人、更新时间 |

四大类和各自的扩展字段：

| 类别 | 例子 | 扩展字段 |
|---|---|---|
| 证照 | 营业执照、特种设备生产许可证（起重机械）、ISO 9001/14001/45001、CE 证书、出口相关登记 | `scope`（许可范围，如「桥式起重机 A 级」） |
| 资质 / 荣誉 | 制造业单项冠军、专精特新、高新技术企业 | `level`（国家级 / 省级） |
| 业绩 | 类似项目合同 | `customer`、`country`、`product_line`、`model`、`capacity_t`、`span_m`、`amount`、`currency`、`contract_date`、`acceptance_date`、`proof_files`（合同首页、验收单、中标通知书） |
| 人员 | 法定代表人、授权代表、项目经理、技术负责人 | `role`、`name_zh`、`name_en`、`title`、`id_no`（虚构、脱敏）、`certs`（证书及有效期）、`signature_specimen` |
| 财务（附属类） | 近三年审计报告、纳税证明、银行资信证明 | `period`（所属年度） |

样例（全部虚构）：

```yaml
- library_id: LIC-001
  material_type: LIC_BUSINESS
  entity: 河南卫华（演示）
  name_zh: 营业执照
  name_en: Business License
  number: "91410000DEMO000001"
  issuer: 某市场监督管理局（演示）
  issue_date: 2019-05-10
  perpetual: true
  files: [{lang: zh, path: library/lic/business_license_zh.pdf}, {lang: en, path: library/lic/business_license_en.pdf}]
- library_id: CERT-ISO9001
  material_type: CERT_ISO9001
  entity: 河南卫华（演示）
  number: "DEMO-QMS-2024-0001"
  issue_date: 2024-03-02
  expiry_date: 2027-03-01
- library_id: CERT-CE-OHC
  material_type: CERT_CE
  entity: 河南卫华（演示）
  scope: Overhead cranes, Machinery Directive 2006/42/EC
  expiry_date: 2026-12-10        # 演示用：会在某个投标截止日前过期 → 黄/红
- library_id: PERF-2023-SA-01
  material_type: PERF_SIMILAR
  entity: 河南卫华（演示）
  customer: 某中东能源公司电力车间项目（演示）
  country: SA
  product_line: overhead_crane
  capacity_t: 50
  amount: 9800000
  currency: USD
  contract_date: 2023-10-16
  acceptance_date: 2024-09-30
  proof_files: [library/perf/sa01_contract_p1.pdf, library/perf/sa01_acceptance.pdf]
- library_id: PER-AUTH-01
  material_type: PERSON_AUTH_REP
  role: 授权代表
  name_zh: 张演示
  name_en: ZHANG Yanshi
  title: 国际部区域经理
  id_no: "4107**********0011"
```

#### 7.4.2 资料类型码（匹配用）

| 类型码 | 含义 | 规则关键词（节选） |
|---|---|---|
| `LIC_BUSINESS` | 营业执照 / 公司注册证明 | business license, certificate of incorporation, commercial registration, 营业执照 |
| `CERT_SPECIAL_EQUIP` | 特种设备生产许可证 | manufacturing license, special equipment |
| `CERT_ISO9001` / `CERT_ISO14001` / `CERT_ISO45001` | 体系证书 | ISO 9001 …… |
| `CERT_CE` | CE 认证 | CE marking, Machinery Directive |
| `PERF_SIMILAR` | 类似业绩 | similar contracts, experience, at least N contracts |
| `FIN_AUDIT` | 审计报告 | audited financial statements |
| `FIN_BANK_REF` | 银行资信证明 | bank reference, line of credit |
| `FIN_TURNOVER` | 年均营业额要求 | average annual turnover |
| `PERSON_*` | 人员 | key personnel, project manager |
| `FORM_AUTH` | 授权书 / 制造商授权 | authorization, power of attorney, Manufacturer's Authorization |
| `FORM_COMMIT` | 承诺书 / 投标保证声明 | declaration, undertaking, Bid-Securing Declaration |
| `BID_SECURITY` | 投标保证金 / 保函 | bid security, bid bond, bank guarantee（**只提示，不自动处理**，交财务） |
| `DOC_FEE` | 标书购买费 | document fee, قيمة وثائق المنافسة |
| `REG_PLATFORM` | 平台注册 | registered on, supplier registration |

有效期判定（以投标截止日 D 为基准）：`expiry < D` → 红；`D ≤ expiry < D + 30 天` → 黄（中标后签约时可能已过期）；其余 → 绿；长期有效 → 绿。

### 7.5 文书模板与填充

| 模板 ID | 名称 | 语言 | 主要占位符 |
|---|---|---|---|
| `auth_letter_zh` | 法定代表人授权委托书 | 中 | `company.name_zh`、`legal_rep.name_zh`、`auth_rep.name_zh`、`auth_rep.id_no`、`tender.no`、`tender.title`、`tender.buyer`、`validity_until`、`sign_date` |
| `auth_letter_en_maf` | Manufacturer's Authorization（按世行标准招标文件格式） | 英 | `company.name_en`、`company.address_en`、`tender.no`、`tender.buyer`、`goods_description`、`auth_rep.name_en`、`sign_date` |
| `commitment_zh` | 投标承诺书（真实性、无违法记录、不串标） | 中 | `company.name_zh`、`tender.no`、`tender.title`、`sign_date` |
| `bid_securing_declaration_en` | Bid-Securing Declaration | 英 | `company.name_en`、`tender.no`、`tender.buyer`、`validity_until` |

填充规则：

1. 模板是带占位符的 .docx，渲染用 docxtpl 一类库，格式不动。
2. `company.*`、`*_rep.*` 只能来自资料库；`tender.*` 只能来自 `ParsedTender`（附 Claim）；`sign_date` 默认当天，`validity_until` 默认投标截止日 + 有效期天数（公告没写就标黄让人填）。
3. 每个字段写一行来源记录（`FilledDoc.fields`），界面上点字段能跳到资料库记录或公告原文。
4. 取不到的字段渲染成红色「【待补：授权代表证件号】」，导出前复核环节必须处理完。
5. 签字、盖章位置留空，不做电子签章。
6. 授权代表证件号这类个人信息：发给云端模型前走 `core.redact`；文书渲染在本地完成，不经过模型。

### 7.6 注册信息清单（替代自动注册）

按平台给出「要填什么、从哪取、谁准备」：

| 平台 | 字段（节选） | 从资料库取 | 需人工 |
|---|---|---|---|
| Etimad | 公司英文名、注册号、地址、联系人、邮箱、电话、经营活动分类 | 公司名、地址、营业执照号 | 沙特本地商业登记（CR）或本地代理信息；Etimad 是否接受境外供应商直接注册**待确认** |
| UNGM | 公司名、国家、注册号、成立年份、员工数、UNSPSC 分类码、联系人 | 公司基本信息 | UNSPSC 起重设备分类码在 UNGM 公开页核对后填写 |

### 7.7 与底座和其他作品的接口

| 方向 | 对象 / 能力 | 用法 |
|---|---|---|
| 底座 → A | 编排器、模型切换、`core.redact`、`core.search`、`Claim`、`core.feishu`、`core.review`、文件导出、品牌外壳 | 见 `_约定.md` 第 3 节，本作品不重复设计 |
| A → 飞书 | 多维表格「海外标讯」 | 字段：商机名称、原标题、来源、链接、国家、战区、产品线、相关度、发布时间、投标截止、负责人、状态（新/已认领/忽略/材料包已生成/已复核）、材料包链接、甲方风险等级 |
| **A → B** | `TenderPackage` | 招标编号、甲方、截止时间、技术协议文件、资格要求（字段见 6.3）；B 读 `technical_docs` 识别非标点 |
| **A → C** | `Opportunity` | 商机名称、区域、负责人、关键节点（`key_dates`）；C 据此在飞书建节点和逾期提醒 |

> 具体 Schema 以底座 PRD 为准；字段名不一致时以底座为准，本作品做映射。

---

## 8. 页面与交互

| 页面 | 作用 |
|---|---|
| P1 招标雷达 | 一句话输入、意图展开（可编辑）、来源状态、结果列表 |
| P2 标讯详情 | 公告原文与解析结果左右对照，点字段高亮原文 |
| P3 材料包工作台 | 材料清单（绿黄红）、文书预览、背调报告摘要、提交复核 |
| P4 背调报告 | 风险分、命中规则、各数据源结果、出处 |
| P5 公司资料库 | 四大类记录维护，到期提醒（60 天内到期置顶） |
| P6 定时任务 | 监控任务列表，复用 Q1 |

**P1 招标雷达**

```text
┌ 卫华 AI 工作台 › 招投标助手 ───────────────────────────── 大卫小华 ┐
│ [ 中东 港口起重机 近 3 个月                          ] [找标] [定时] │
│ 已理解：市场 中东(SA AE QA OM KW BH IQ EG)  产品 港口机械            │
│        关键词 STS crane · RTG · portal crane · رافعة الميناء … [编辑] │
│        时间 2026-08-06 ~ 2026-11-06                                   │
│ 来源：世界银行 ✓ 实时 12   TED ✓ 实时 0   Etimad ◐ 缓存 08:10 9       │
├──────────────────────────────────────────────────────────────────────┤
│ 相关度 标题（中文摘要）               国家 截止      负责人  状态     │
│ 92    某港务局 RTG 采购（2 台）        SA   12-05 ⚠  王**   新  [▶]  │
│ 85    港口岸桥改造                     EG   12-14    李**   新  [▶]  │
│ 41    卡车随车吊（负向词 -30）         ZM   已截止   —      折叠      │
├──────────────────────────────────────────────────────────────────────┤
│ [推送到飞书]  已推送 7 条 · 跳过重复 2 条                               │
└──────────────────────────────────────────────────────────────────────┘
```

**P3 材料包工作台**

```text
┌ 某港务局 RTG 采购 · 招标编号 2611xxxx · 投标截止 2026-12-05 ─────────┐
│ 材料清单（基准日 12-05）          │ 文书                              │
│ ● 营业执照            绿 [看]     │ 授权书(EN, MAF)   2 处待补 [预览] │
│ ● ISO 9001 至 2027-03 绿 [看]     │ 承诺书(EN)        完整     [预览] │
│ ● CE 证书 12-10 到期  黄 签约前过期│───────────────────────────────────│
│ ● 类似业绩 ≥2 份 5 年内 绿 2/2    │ 甲方背调  低风险 15 分  [报告]    │
│ ● 审计报告 2023-2025  红 缺 2025  │  · DD-13 世行融资 −10             │
│ ● 投标保函            黄 交财务   │  · DD-11 国别风险 +10 ……          │
│ ● 标书费 1000 SAR     黄 需人工购买│ 注册信息清单（Etimad）    [下载]  │
├───────────────────────────────────┴───────────────────────────────────┤
│ 复核摘要：2 红 4 黄；红项需补齐后才能导出。   [提交复核]  [导出材料包] │
└───────────────────────────────────────────────────────────────────────┘
```

关键交互：
- 点任一解析字段 → 右侧高亮公告原文片段（`Claim`）。
- 点资料项 → 打开资料库记录和扫描件。
- 黄/红项可手工改判，改判要写理由，记入审计日志。
- 飞书卡片按钮「生成材料包」→ 后台触发 ②–⑥，完成后卡片更新为「材料包待复核」并附链接。

---

## 9. 演示脚本（4 分 30 秒）

| 时间 | 操作 | 画面 | 讲解词 |
|---|---|---|---|
| 0:00–0:25 | 打开工作台 | 首页 + 场景表 #80、#76 原话 | 「客户保障部的标书专员，现在一个人要读公告、翻资料、填授权书、查甲方。国际部要每天自己翻各国招标网站。这是场景表 #80 和 #76 的原话。」 |
| 0:25–1:05 | 输入「中东 港口起重机 近 3 个月」，点找标 | 意图展开：8 个国家、中英阿关键词；三个来源状态灯依次亮起 | 「一句话就行。它把『中东』展开成 8 个国家，『港口起重机』展开成英文和阿拉伯文的词。世界银行和欧盟 TED 是官方接口，现场实时调；沙特 Etimad 是公开访客页，这里用的是今早 8 点的缓存，界面上标得很清楚。」 |
| 1:05–1:30 | 滚动结果，指出负向词扣分那一条；点「推送到飞书」 | 切到飞书：多维表格新增记录，负责人收到卡片 | 「随车吊这种不是我们的产品，自动降权。按战区分好了人，直接进飞书——就是 #76 说的『同步至飞书……分配至对应业务同事』。」 |
| 1:30–2:15 | 在飞书卡片点「生成材料包」，回到工作台 | P2：公告原文 + 解析结果，点「投标截止」高亮原文 | 「公告解析 Agent 把资格要求、时间、要交的材料都抽出来了。每一条都能点回原文，抽不准的宁可留空交给人。」 |
| 2:15–3:05 | P3 材料包工作台 | 绿黄红清单；CE 证书标黄；预览英文授权书，红色「待补」 | 「资料匹配是规则做的：以投标截止日为准查有效期，CE 证书 12 月 10 号到期，比截止日晚，但签约时可能已经过期，所以标黄。授权书和承诺书按公司模板自动填好，每个字段都能追到资料库；取不到的标红，模型不许编。」 |
| 3:05–3:40 | 打开甲方背调报告 | 风险 15 分，低；命中规则列表；再切到一个虚构公司，命中制裁名单 → 一票否决 | 「背调分数是规则表算的，不是模型拍的，同样的输入永远同样的分。这个是虚构公司，命中制裁名单，直接一票否决。」 |
| 3:40–4:00 | 点「提交复核」→ 审批通过 → 导出材料包 | 复核记录；zip 文件列表 | 「最后由人确认才放行，整包导出。注册网站我们不做自动化——验证码和实名认证绕不过去，也不该绕——给的是注册信息清单。」 |
| 4:00–4:30 | **链路串联** | 工作台链路图：A 的 `TenderPackage` 流到 B 的报价页，`Opportunity` 流到 C 的飞书节点 | 「这个标的技术协议已经交给报价智能体去识别非标点；投标截止、开标这些节点，飞书跟进助手已经建好了提醒。找标、背调、报价、跟进，一条线走通。」 |

---

## 10. 验收标准与评测

### 10.1 指标

| 指标 | 目标 | 测法 |
|---|---|---|
| 意图解析三要素准确率 | ≥ 9/10 | 10 条测试句 |
| 招标雷达 precision@10 | ≥ 80% | 20 条人工标注（相关/不相关）样本 |
| 公告关键时间准确率 | 100%（允许置空，不允许错） | 10 条标注公告 |
| 资格要求召回率 | ≥ 85% | 同上，人工列出的要求条数为分母 |
| 解析字段带出处比例 | 100% | 自动检查 `Claim.evidence` 非空且原文可定位 |
| 资料匹配、有效期判定 | 5/5 边界用例全对 | 见 10.2 |
| 文书编造字段数 | 0 | 对照字段来源表逐项核 |
| 背调分数可复现 | 100% | 同一输入跑 3 次分数一致 |
| 背调等级 | 6/6 正确 | 见 10.2 |
| 端到端耗时 | 找标 ≤ 60 秒；选中到材料包 ≤ 3 分钟 | 演示环境计时 |
| 源失败降级 | 任意关掉一个源仍能出结果 | 断网/改错 URL 测试 |

### 10.2 测试样例准备

| 样例集 | 数量 | 内容 |
|---|---|---|
| 意图测试句 | 10 | 中东/东南亚/中亚/拉美/欧洲 × 不同产品线 × 不同时间表达；含 2 条定时 |
| 公告样本 | 30 | 世行 10、TED 10、Etimad 10（缓存），其中 20 条人工标注相关度，10 条标注全部字段 |
| 资料库边界用例 | 5 | ① 证书已过期；② 截止日后 30 天内过期；③ 业绩年限不够；④ 缺件（2025 审计报告）；⑤ 要求表述模糊需人工 |
| 背调主体 | 6 | ① 某真实国有港务机构（只用公开信息，预期低风险）；② 有世行融资的甲方；③ 虚构公司命中制裁名单（预期 blocked）；④ 虚构公司命中世行禁入（预期高）；⑤ 虚构国内公司有失信记录（缓存 JSON，预期高）；⑥ 数据源全部不可用（预期 partial + 人工复核） |
| 模板 | 4 | 中英授权书、中英承诺书 |

---

## 11. 复用的已有项目

**超聚变 Q1**（`tbszz/XFusion_AI_Hackathon/question1/source`）

| 模块 | 现在是什么 | 怎么处理 |
|---|---|---|
| `bid_aggregator/sources.py` 的 `TenderSource` 基类、`safe_fetch` | 统一的适配器基类：超时、限速、失败隔离、登录态检测、来源状态 | **直接用**。新增 `WorldBankSource`、`TedSource`、`EtimadVisitorSource`（Playwright）；P1 加 `UngmSource`。剑鱼、采招网登录态源不启用 |
| `bid_aggregator/models.py` 的 `QueryIntent`、`TenderRecord`、`SourceResult` | 国内场景字段（省市区） | **改造**：`QueryIntent` 加 `markets`、`product_lines`、多语种 `keywords`、`cpv_codes`；`TenderRecord` 扩成 `Opportunity`（加国家、买方、融资、截止时间结构化、币种、语言） |
| `bid_aggregator/nlp.py` | 规则解析时间、频率、中国地区 | **改造**：时间和频率解析直接用；地区词典换成海外国家 + 市场标签；关键词解析接入 7.3 词表 |
| `bid_aggregator/intent_agent.py` | 模型复核意图、多模型回退 | **改造**：换提示词，模型调用改走底座 |
| `bid_aggregator/cleaning.py` | 去重、过滤、截止时间风险 | **直接用**去重和 `attach_risk`；日期解析补阿拉伯数字格式和英文月份 |
| `bid_aggregator/agent.py` | 5 段 Agent（意图、多源、字段、质量、成稿）+ `AgentTrace` | **改造**：5 段收进「招标雷达 Agent」内部；`AgentTrace` 映射到底座的执行轨迹；字段抽取提示词改造成公告解析 Agent 的基础 |
| `bid_aggregator/llm.py` | 比赛 OpenAI 兼容客户端 | **弃用**，改走底座模型层（云端/本地可切换） |
| `bid_aggregator/word.py` | 招标汇总 Word 报告（决策页、优先级、来源可信度、项目卡片） | **改造**：用于「招标清单」导出和背调报告排版；文书填写另写（docxtpl） |
| `bid_aggregator/storage.py`、`scheduler.py` | SQLite 增量（已推送哈希）+ APScheduler 定时 | **直接用** |
| `web_app.py` | FastAPI 单页 | **重写**进底座品牌外壳，后端接口可沿用 |
| `tests/` | 来源、过滤、调度等测试 | 改造后沿用，补 10.2 样例 |
| `tianyancha-cli-main`（`tyc dossier company/risk`） | 天眼查网页接口 CLI，12 节背调 Markdown | **改造**为背调 Agent 的国内主体工具，只读缓存 JSON。注意：它依赖个人浏览器登录态和非官方接口，**比赛演示只用缓存**，正式落地应换天眼查/企查查官方开放平台（付费） |

**其他**

| 项目 | 用法 |
|---|---|
| 医晓 | 多 Agent 编排模式和「规则引擎不能被模型降级」的做法（由底座提供） |
| XFusion-Agent | 复核与审计（由底座 `core.review` 提供） |
| Loomi | Agent Runtime、Claim → Evidence 校验（由底座提供） |

---

## 12. 两天开发计划

> 前提：底座的编排器、飞书、复核、导出至少有可调用的桩。底座没好时，本作品先用本地桩函数，接口签名按 `_约定.md` 写。

| 时段 | 任务 | 产出 |
|---|---|---|
| **D1 上午** | 从 Q1 拉代码；写 `WorldBankSource`、`TedSource`；`EtimadVisitorSource`（Playwright）+ 缓存；词表 YAML；`nlp.py` 海外地区改造 | 一句话 → 3 源原始结果 |
| **D1 下午** | 相关度打分 + 负向词；战区分配；飞书多维表格写入和卡片；公告解析 Agent（Schema + 出处校验） | 招标清单进飞书；单条公告能解析 |
| **D2 上午** | 模拟资料库（YAML + 假扫描件）；资料匹配规则 + 有效期；4 个模板 + 渲染；背调：名单下载与匹配、世行项目查询、规则引擎、报告排版 | 材料清单、文书、背调报告都能出 |
| **D2 下午** | 复核 Agent + `core.review` + 打包；`TenderPackage`/`Opportunity` 输出；P1–P4 页面联调；跑 10.2 测试集；前一晚的全量缓存；彩排 2 遍 | 完整闭环 + 指标表 |

缓冲：如果 D2 中午前 Etimad 抓取不稳定，直接切到纯缓存；如果背调新闻源不稳定，DD-12 记「数据不足」，不影响演示。

---

## 13. 风险与待确认事项

### 13.1 风险

| 风险 | 影响 | 应对 |
|---|---|---|
| 现场网络访问不了世行/TED/Etimad | 实时抓取失败 | 每个源都有缓存兜底，界面标注；演示前一晚全量缓存 |
| Etimad 机器人防护升级 | P0 中东源只剩缓存 | 本来就设计为「实时尝试 + 缓存」；备用演示句换成东南亚 |
| 中东实时结果少 | 演示画面单薄 | 缓存集提前挑好 8–10 条相关标 |
| 公告是阿拉伯语 | 解析质量下降 | 模型先翻译再抽取，原文 + 译文对照显示；关键时间用正则 |
| 背调对真实企业得出负面结论 | 名誉和合规风险 | 负面用例一律虚构主体；真实主体只展示公开事实 |
| 资料库含个人信息 | 隐私 | 全部虚构；发给云端模型前 `core.redact`；可切换只用本地模型 |
| `tianyancha-cli` 合规 | 非官方接口 | 只用缓存，不在现场实时调用；落地换官方 API |
| 底座未按时可用 | 联调延误 | 本地桩函数，接口签名先对齐 |

### 13.2 需要向主办方确认

1. **提交规则**：一个作品能否对应场景表多行（本作品主报 #80，合并 #76、#9、#33 和两条参考场景）。
2. **6 大海外战区的正式划分**，以及各战区负责人（用于分配规则；演示可用化名）。
3. **国际部现有的飞书「主动开发项目信息管理系统」**（#76 原话提到）：能否提供多维表格字段结构或测试租户，便于直接对接。
4. **公司固定的授权书、承诺书模板**，以及一两份甲方报名资料模板（脱敏）；没有的话用自拟模板。
5. **公司资料库现状**：证照、业绩、人员资料目前存在哪里（共享盘 / OA / 档案系统），有没有有效期台账；#80 第 3 点说的「公司内部网站」「多个模块」具体是哪个系统，能否给只读接口或导出样例。
6. 背调是否已有**天眼查/企查查企业账号或官方 API**；比赛中能否展示基于公开数据的背调结论。
7. 阿拉伯语、俄语、西班牙语关键词请国际部同事校对。
8. 比赛现场网络能否访问 worldbank.org、ted.europa.eu、etimad.sa。
9. 海外投标的常见主体是河南卫华、卫华国际（香港）还是卫华海洋——决定资料库取哪个主体的证照。
