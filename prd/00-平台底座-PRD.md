# 00 · 卫华 AI 工作台 · 平台底座 PRD（`core`）

> 版本 v1.0 · 2026-11-06 · 遵守 [`prd/_约定.md`](_约定.md)
> 底座**不单独参赛**。它的 P0 定义为「5 个作品都要用、缺了就各自重复造轮子的最小集合」，必须在 **1.5 天**内搭好。
> 本文是第 3 节能力和第 4 节数据对象的**唯一权威定义**：其他 5 份 PRD 引用这里的接口名、字段名和枚举值，不再重新设计。
> 复用来源都读过源码（第 11 节写了具体文件），不是照着 README 写的。

---

## 1. 一句话定位

给 5 个参赛作品（A 招投标、B 报价、C 飞书跟进、D 内容工厂、E 视频生产线）提供**一个本机运行的底座服务** `weihua-core` 和**一个统一外壳** `weihua-web`。底座负责模型网关（云端 / 本地切换）、脱敏网关、检索、出处、飞书、人工复核与审计、文件导出、跨作品数据交接；外壳负责统一导航、登录和大卫小华助手。作品只写自己的业务逻辑，并且无论用 Python 还是 Node 写，都通过 **HTTP 或 MCP** 调用同一套底座能力。

---

## 2. 背景与痛点

| # | 痛点 | 依据 |
|---|---|---|
| 1 | **企业数据敏感**：技术协议、报价、客户名单都是内部数据，评委一定会问「数据发到哪里去了」 | 选题方案 v0.3「作品 B · 数据脱敏」：「这一点回应『企业数据敏感』，也是答辩卖点」；卫华 2025 年 2 月营销、售后已全面接入 DeepSeek（[河南经济报](https://www.hnjjbs.com/article/2025-02/17398430786328.html)），说明内部已经在用云端大模型，数据出域是现实问题 |
| 2 | **5 个作品会各自重复写同样的东西**：飞书接入、检索、出处展示、人工确认、Word 导出 | 选题方案 v0.3「平台的作用：共享代码和品牌」；第四节开发顺序把底座放在第 0 步 |
| 3 | **技术栈不统一**：A 基于超聚变 Q1（Python FastAPI），E 基于凉感 Montage（Node + Remotion），检索基于 PPTSight（Python） | 选题方案第三节资产表 |
| 4 | **AI 结论要能追溯**：报价判断、背调结论、宣传参数都必须能点开看原文，否则一线不敢用 | 选题方案作品 B「每条判断都有出处，关键判定由规则兜底」 |
| 5 | **评委熟悉「限时演示 + 现场答辩」**，每个作品只有几分钟；链路串联只有最后 30 秒，必须一键能跑通 | 卫华内部「AI 全能应用挑战赛」2026-08-28 决赛采用限时演示加现场答辩（[jdzj 339228](https://www.jdzj.com/news/339228.html)） |
| 6 | **飞书是内部协同工具**：场景表 #12、#35、#36 明确提到「飞书群」「飞书文档」；但公开报道里查不到卫华用飞书 | 选题方案作品 C「注意」；调研报告 C9「飞书、千问、MinerU 在卫华的使用情况：未查到」 |
| 7 | **品牌统一**：5 个作品分开提交，但要让评委一眼看出是同一个平台；卫华 2026-02-09 发布了 IP「大卫」「小华」 | 调研报告 B6（[5700](https://www.cranewh.com/detail/5700.html)） |
| 8 | **两天约束**：场景表写明「两天内做不完的场景不在本次活动范围」，底座占用的时间越少，留给作品的越多 | 选题方案 v0.3 开头 |

卫华已有的信息系统（SAP、PLM、CRM、MES、SRM、OA、数据中台，[e-works](https://articles.e-works.net.cn/700/article154623.htm)）**本次都不直连**，一律用模拟或脱敏的导出数据代替（见第 7 节）。

---

## 3. 用户与场景

底座的直接用户是**作品开发者（就是自己）**和**演示时的评委**；间接用户是各作品的一线岗位。

| 角色 | 现在 | 有了底座之后 |
|---|---|---|
| 作品开发者 | 每个作品各写一套飞书调用、检索、Word 导出、登录页，5 个作品 5 套风格 | 作品里 `from weihua_core import Core` 或 `import { Core } from "@weihua/core"`，一行调用；Agent 直接挂 `weihua-core` MCP，拿到检索、出处、飞书工具 |
| 评委 | 看到 5 个互不相干的 Demo | 看到同一个「卫华 AI 工作台」：统一导航、同一个大卫小华助手、同一套「已脱敏」「有出处」「待复核」的标识；最后 30 秒看到对象从一个作品流到下一个作品 |
| 信息化 / 数据安全负责人（答辩时的提问者） | 担心客户名、金额被发到外部大模型 | 顶栏一键切「仅本地模型」；任何时候能打开「云端看到了什么」，对比本地原文和发出去的脱敏文本 |
| 一线岗位（业务员、报价员、销售经理、品牌专员） | — | 在工作台里收到交接对象（「A 推来一个标」），在复核中心点「通过 / 驳回」，在飞书里收到提醒 |

---

## 4. 范围

### 4.1 P0（1.5 天内必须完成，5 个作品共用的最小集合）

| 编号 | 能力 | P0 做到什么程度 | 哪些作品依赖 |
|---|---|---|---|
| core-R1 | 底座服务与代码骨架 | monorepo、`weihua-core` FastAPI 服务、统一错误格式、一键启动脚本 | 全部 |
| core-R2 | 数据对象与交接 | 6 个对象的 JSON Schema、校验、存取、交接收件箱、`chain_id` | 全部 |
| core-R3 | 模型网关 | Anthropic 兼容和 OpenAI 兼容两个入口；`cloud` / `cloud_redacted` / `local_only` 三种模式；密钥只在底座 | 全部 |
| core-R4 | 脱敏网关 | 正则 + 词典 + 轻量 NER（jieba 词性）；会话级映射加密存储；网关出域时自动脱敏、回来时还原；出域二次扫描 | A、B、C 必需；D、E 可选 |
| core-R5 | 检索 | PPTSight 移植：PDF / PPTX / DOCX / XLSX / MD 入库，FTS + 向量 + 数值事实混合检索，`collection` + `filters` | A、B、E |
| core-R6 | 出处 | `Claim` 结构、引文校验、原文查看接口 | A、B、D、E |
| core-R7 | 飞书 | 发消息、@人、回复、多维表格读写、读文档、建文档、群消息订阅（基于 lark-cli 1.0.96） | A、B、C、E |
| core-R8 | 人工复核与审计 | `core.review` 三态、带修改的通过、哈希链审计日志 | A、B、C、E |
| core-R9 | 文件导出 | Word、Excel、飞书文档；PDF 在装了 LibreOffice 时可用 | A、B、C、E |
| core-R10 | 编排器与规则引擎 | Python 版编排器（agent / code / review 三种节点、字段锁、只升不降、保守回退）；TS 精简版；通用规则引擎 | A、B、E（多 Agent）；B、A（规则） |
| core-R11 | MCP 服务 | `/mcp` 暴露检索、出处、对象、交接、复核、飞书、导出工具（**不暴露还原和设置**） | 用 Agent SDK 的全部作品 |
| core-R12 | 品牌外壳 | 统一导航（5 个入口）、演示账号切换、模式开关、「已脱敏」徽标、大卫小华助手、复核中心、链路视图、6 个共用前端组件 | 全部 |

### 4.2 P1（加分项，有时间再做）

- 飞书卡片审批：复核请求以交互卡片发到飞书，点「通过」直接回写（`card.action.trigger` 事件，lark-cli 支持，不需要公网回调）
- 本地大模型 NER（用本地 Qwen 抽取客户名、人名，补 jieba 的漏检）；地址、项目名脱敏
- 扫描件 OCR（MinerU 或 Loomi 的 `server/localOcr.js` Windows OCR）
- 飞书扫码登录，替代演示账号
- 检索重排（本地 bge-reranker）
- 出处附录自动插入 PDF 页码高亮截图
- 每个作品单独打包提交的脚本 `scripts/pack.ps1 -App <代号>`（是否需要看主办方提交规则）

### 4.3 不做（明确排除）

| 不做 | 原因 |
|---|---|
| 直连 SAP / CRM / PLM / OA 等内部系统 | 拿不到权限，两天也接不完；用导出的模拟数据代替 |
| 真实的统一身份认证、权限审批流、多租户 | 演示用 4 个预置账号足够；真实 SSO 是落地阶段的事 |
| 自研 Agent 框架、自研 Agent 循环 | 沿用 Loomi 的结论：通用 Agent 行为交给 Claude Agent SDK，底座只管「Agent 知道什么、能做什么、允许说什么」 |
| 底座自己的业务页面（报价、招标等） | 属于各作品 |
| 公网部署、高可用、集群 | 演示在一台笔记本（加可选的内网本地模型机）上跑 |
| 把映射表、密钥交给作品进程 | 安全边界，见第 5.4 节 |
| 下载或二次创作大卫小华官方海报原图 | 授权未确认；P0 用占位形象（见 5.12） |

---

## 5. 功能需求

### 5.0 总体架构

```text
┌──────────────────────── weihua-web（品牌外壳 · Vite + React）────────────────────────┐
│ 顶栏：卫华AI工作台 | A招投标 B报价 C飞书跟进 D内容工厂 E视频 | 🔒模式 | 账号 | 交接收件箱 │
│ 作品页面（/bid /quote /follow /studio /video）  复核中心  链路视图  知识库  设置       │
│ 共用组件：ClaimCard · SourceViewer · RedactionBadge · ReviewPanel · RunTrace · AssistantDock │
└───────────────┬──────────────────────────────────────────────────────────────────────┘
                │ 同源 http://localhost:8700（底座反向代理各作品后端，免 CORS）
┌───────────────▼──────────────── weihua-core（Python 3.11 · FastAPI · :8700）──────────┐
│ /v1  REST：objects handoffs runs redact search claims sources feishu reviews audit exports settings auth │
│ /mcp MCP（streamable HTTP）：给各作品里的 Agent SDK 会话挂载                                     │
│ /llm 模型网关：/llm/anthropic/v1/messages · /llm/openai/v1/chat/completions · /llm/embed          │
│      └─ 出域前：脱敏 → 二次扫描 → 出域日志；回来后：还原（流式缓冲）                               │
│ 存储：SQLite（core.db）+ storage/ 文件目录 + 加密映射表                                           │
└──┬──────────────┬───────────────┬────────────────┬──────────────────────────────────┘
   │ lark-cli     │ 云端模型       │ 本地模型         │ 各作品后端（只拿 app token，不拿模型密钥）
   ▼              ▼               ▼                  ▼
 飞书开放平台   Claude/DeepSeek   Ollama/vLLM        apps/bid(:8701 Py) quote(:8702 Py) follow(:8703 Py)
 (测试租户)    (Anthropic 兼容)   Qwen + bge-m3      studio(:8704 Node) video(:8705 Node+Remotion)
```

**三条硬原则**（贯穿下面所有需求）：

1. **密钥只在底座**：云端模型 Key、飞书凭据、映射表加密 Key 只存在 `weihua-core` 进程里。作品拿到的只是底座签发的 `app token`。所以「仅本地模式」和「出域必须脱敏」是**底座强制执行**的，作品想绕也绕不过去。
2. **失败时关闭**：脱敏失败、二次扫描发现漏网、本地模式下目标是公网地址，一律拒绝请求并报错，**绝不降级为明文发送**。
3. **大模型不改判**：规则节点和人工给出的结论在编排器里是「锁定字段」，大模型只能提「升级线索」，不能把它改轻（医晓的 escalate-only 原则）。

### 5.1 统一约定（所有接口共用）

**基址与鉴权**

| 项 | 约定 |
|---|---|
| 基址 | `http://localhost:8700`（环境变量 `WEIHUA_CORE_URL`） |
| 作品身份 | 请求头 `Authorization: Bearer <app_token>`；token 由 `scripts/dev.ps1` 启动时写进各作品的 `.env`，形如 `wh_app_quote_<随机32位>`，绑定作品代号 |
| 用户身份 | 外壳通过 Cookie `wh_session`（HS256 JWT）登录；底座反向代理时给作品后端注入 `X-Weihua-User: <user_id>`、`X-Weihua-Roles: quoter,sales` |
| 会话 | 请求头 `X-Weihua-Session: <session_id>`，脱敏映射、敏感度水位都按会话隔离；没有则底座生成并在响应头返回 |
| 链路 | 请求头 `X-Weihua-Chain: <chain_id>`（可选），用于把 A→B→C 的对象、运行、审计串在一起 |
| 幂等 | 写操作支持 `Idempotency-Key` 请求头（24 小时内同 key 返回同一结果） |
| ID | `<前缀>_<ULID>`，前缀：`tp` TenderPackage、`opp` Opportunity、`qr` QuoteResult、`ma` MediaAsset、`art` Article、`clm` Claim、`doc` 文档、`f` 文件、`rv` 复核、`ho` 交接、`run` 运行、`ses` 会话、`chain` 链路、`exp` 导出、`map` 映射 |
| 时间 | ISO 8601，带时区，例如 `2026-11-20T17:00:00+08:00` |
| 命名 | JSON 字段一律 `snake_case`；枚举值一律小写英文，界面上显示中文（对照表见各 Schema） |

**统一错误格式**（HTTP 状态码 + 响应体）

```json
{
  "error": {
    "code": "LOCAL_ONLY_VIOLATION",
    "message": "当前为仅本地模型模式，已拒绝发往 api.anthropic.com 的请求",
    "retryable": false,
    "detail": {"target_host": "api.anthropic.com", "mode": "local_only"},
    "audit_id": "aud_01JC3Z7K9V2M4QW8E5R6T7Y8U9"
  }
}
```

| code | HTTP | retryable | 含义 / 处理 |
|---|---|---|---|
| `INVALID_ARGUMENT` | 400 | 否 | 参数不合法 |
| `SCHEMA_VALIDATION_FAILED` | 422 | 否 | 对象不符合 Schema；`detail.errors` 给出 JSON Pointer 路径 |
| `UNAUTHENTICATED` | 401 | 否 | 缺 token |
| `PERMISSION_DENIED` | 403 | 否 | 作品无权写这个对象类型 / 飞书目标不在白名单 / 角色无权复核 |
| `NOT_FOUND` | 404 | 否 | — |
| `VERSION_CONFLICT` | 409 | 否 | 乐观锁版本不符，重新读取后再改 |
| `REVIEW_STATE_CONFLICT` | 409 | 否 | 复核已决定，不能再改 |
| `IDEMPOTENCY_CONFLICT` | 409 | 否 | 同一个幂等 key 带了不同请求体 |
| `CONFIRMATION_REQUIRED` | 428 | 否 | 高风险写操作（群发、写多维表格非白名单表）需先过复核；`detail.review_id` |
| `LOCAL_ONLY_VIOLATION` | 403 | 否 | 仅本地模式下尝试访问公网模型 |
| `REDACTION_FAILED` | 500 | 否 | 脱敏器异常；请求**不会**被明文发出 |
| `EGRESS_BLOCKED` | 403 | 否 | 出域二次扫描发现未脱敏的敏感实体；`detail.findings` 只含类型和位置，不含原文 |
| `MODEL_UNAVAILABLE` | 503 | 是 | 模型不可达；本地模式下**不会**自动切到云端 |
| `UPSTREAM_TIMEOUT` | 504 | 是 | 上游超时 |
| `FEISHU_AUTH_REQUIRED` | 401 | 否 | lark-cli 未登录或 token 过期；`detail.hint` 给出登录命令 |
| `FEISHU_SCOPE_MISSING` | 403 | 否 | 缺权限范围；`detail.scopes` |
| `FEISHU_RATE_LIMITED` | 429 | 是 | 带 `Retry-After` |
| `FEISHU_AMBIGUOUS` | 502 | 否 | 写操作超时，结果未知；**不自动重试**（沿用 feishu-towechat 的不变量），由调用方用同一幂等 key 查询或人工确认 |
| `EVIDENCE_NOT_FOUND` | 404 | 否 | 出处里的文档或页不存在 |
| `EXPORT_FAILED` | 500 | 否 | 模板渲染或格式转换失败；`detail.stage` |
| `INTERNAL` | 500 | 否 | 其他 |

### core-R1 底座服务与代码骨架

- **输入**：仓库、`.env`（模型 Key、飞书 profile、加密 Key）
- **处理**：`scripts/dev.ps1` 依次启动本地模型健康检查 → `weihua-core` → 各作品后端 → `weihua-web`；签发 5 个 app token；载入 `data/mock/` 种子数据
- **输出**：浏览器打开 `http://localhost:8700` 看到工作台首页
- **验收**：干净 Windows 机器上执行一条命令，60 秒内首页可用；`GET /v1/health` 返回每个子系统状态（模型、本地模型、飞书、检索索引、存储）

`GET /v1/health` 返回示例：

```json
{"status": "ok", "version": "1.0.0", "components": {
  "llm_cloud": {"status": "ok", "provider": "anthropic", "model": "claude-sonnet-5-5"},
  "llm_local": {"status": "ok", "provider": "ollama", "model": "qwen3:14b", "base_url": "http://127.0.0.1:11434"},
  "embedding": {"status": "ok", "model": "bge-m3", "local": true},
  "feishu": {"status": "ok", "identity": "bot", "tenant": "test"},
  "search": {"status": "ok", "collections": 8, "documents": 63, "pages": 1210},
  "storage": {"status": "ok", "free_gb": 120.4}
}}
```

#### 代码组织：推荐 **monorepo + 底座服务（HTTP / MCP）**

| 方案 | 做法 | 优点 | 缺点 | 结论 |
|---|---|---|---|---|
| ① 共用包 + 5 个独立仓库 | 底座做成 Python 包和 npm 包，各作品各自 import | 每个作品独立提交最干净 | Python 和 Node 要维护两份实现；映射表、索引、审计分散在 5 个进程里，「仅本地模式」无法统一强制；Schema 一改要改 6 个仓库 | 不选 |
| ② **monorepo + 底座服务** | 一个仓库；底座是一个常驻服务，所有能力走 HTTP，Agent 走 MCP；Python / TS 客户端只是很薄的封装 | 一份实现，跨语言；状态（映射、索引、审计、密钥）集中在一处，安全策略只有一个执行点；Schema 一处定义、生成两种语言类型；一条命令启动全部，演示稳 | 多一个进程；单独提交某个作品时要连同底座一起打包 | **选这个** |
| ③ 单体应用 | 5 个作品写进同一个后端 | 最省事 | A 是 Python、E 是 Node + Remotion，硬合并要重写；作品不能单独提交和演示 | 不选 |

选 ② 的关键理由：**脱敏映射和模型密钥必须只有一份，并且只在一个进程里**。如果做成库，每个作品进程都会持有映射和密钥，「仅本地模式」就只是一个约定，不是一个保证。

**目录结构**

```text
weihua-ai/
├── core/                         # 底座服务（Python 3.11，FastAPI，uv 管理）
│   ├── weihua_core/
│   │   ├── app.py                # FastAPI 入口、反向代理、静态托管 web/dist
│   │   ├── api/                  # /v1 路由：objects handoffs runs redact search claims sources
│   │   │                         #          feishu reviews audit exports settings auth
│   │   ├── mcp/server.py         # /mcp：MCP 工具定义（复用 api 层的服务函数）
│   │   ├── llm/                  # 模型网关：anthropic_proxy.py openai_proxy.py embed.py modes.py egress_guard.py
│   │   ├── redact/               # detector.py（正则/词典/NER）mapping.py（加密存储）stream_restore.py
│   │   ├── search/               # 移植 PPTSight：ingest/ index.py hybrid.py synonyms_crane.py
│   │   ├── claims/               # verify.py（移植 Loomi claimEvidence 的规范化匹配）
│   │   ├── review/               # reviews.py audit.py（移植 XFusion Approval/AuditLog + 哈希链）
│   │   ├── feishu/               # lark.py（移植 feishu-towechat 的 lark_cli.py 无 shell 调用）events.py
│   │   ├── export/               # docx.py xlsx.py pdf.py feishu_doc.py templates/
│   │   ├── objects/              # store.py handoff.py runs.py
│   │   └── auth/                 # demo_accounts.py tokens.py
│   ├── config/                   # models.yaml redact.yaml feishu.yaml collections.yaml
│   └── tests/
├── schemas/                      # JSON Schema 单一事实源（本文 7.3 节原样落地）
│   ├── common.schema.json
│   ├── tender-package.schema.json  opportunity.schema.json  quote-result.schema.json
│   ├── media-asset.schema.json     article.schema.json      claim.schema.json
│   └── codegen.ps1               # → packages/core-py/weihua_core_client/models.py（datamodel-codegen）
│                                 # → packages/core-ts/src/types.ts（json-schema-to-typescript）
├── packages/
│   ├── core-py/                  # pip 包 weihua-core-client：Core 客户端 + orchestrator + rules
│   └── core-ts/                  # npm 包 @weihua/core：Core 客户端 + orchestrator-lite
├── web/                          # 品牌外壳 + 5 个作品前端模块（Vite + React + TS）
│   └── src/
│       ├── shell/                # 顶栏、导航、登录、设置、复核中心、链路视图、知识库
│       ├── ui/                   # 共用组件（5.12）
│       └── modules/{bid,quote,follow,studio,video}/
├── apps/                         # 5 个作品后端，各自的 PRD 决定内部结构
│   ├── bid/      (Python FastAPI，基于超聚变 Q1)
│   ├── quote/    (Python FastAPI)
│   ├── follow/   (Python FastAPI)
│   ├── studio/   (Node，three.js / Tripo)
│   └── video/    (Node + Remotion，基于凉感 Montage)
├── data/
│   ├── mock/                     # 模拟数据（第 7 节），全部带 demo_data: true
│   └── storage/                  # 运行时文件（.gitignore）
└── scripts/dev.ps1  seed.ps1  replay-chain.ps1
```

- Python 侧用 uv workspace，TS 侧用 pnpm workspace，不引入 Nx / Turborepo。
- 作品前端**默认**写在 `web/src/modules/<代号>/`，共享外壳和组件；已有独立前端的作品（例如 Q1 自带页面）可以先用 iframe 嵌入 `/apps/<代号>/ui/`，外壳通过 `postMessage` 下发主题、用户、会话和模式（消息格式见 5.12）。
- 端口：core 8700；bid 8701、quote 8702、follow 8703、studio 8704、video 8705；web 开发态 5173（生产态由 core 托管 `web/dist`）。底座把 `/apps/<代号>/api/*` 反向代理到对应端口。

### core-R2 数据对象与交接

- **输入**：作品提交的对象 JSON（第 7.3 节 Schema）
- **处理**：按 `$id` 选 Schema 校验 → 检查写权限（见下表）→ 存 SQLite（JSON 列 + 索引列）→ 写审计
- **输出**：带版本号的对象；交接时生成收件箱条目和深链接
- **验收**：6 个对象的样例都能通过校验；故意删一个必填字段返回 422 且指出路径；A 交接给 B 后，B 的导航上出现红点，点开直接带着 `TenderPackage` 进入 B 页面

**写权限**（谁产出谁写，其他作品只读）

| 对象 | 可创建 / 修改 | 只读 |
|---|---|---|
| `TenderPackage` | bid | 全部 |
| `Opportunity` | bid、follow（follow 只能改 `stage`、`milestones[*].status`、`risks`、`next_action`、`feishu`） | 全部 |
| `QuoteResult` | quote | 全部 |
| `MediaAsset` | studio、video | 全部 |
| `Article` | video | 全部 |
| `Claim` | 全部（嵌在别的对象里，或单独存） | 全部 |

**接口**

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/objects/{type}` | 新建；`type` ∈ `tender_package` `opportunity` `quote_result` `media_asset` `article` `claim`；返回完整对象（含 `id`、`version: 1`） |
| GET | `/v1/objects/{type}/{id}` | 读取；`?restore=false` 时返回脱敏版本（敏感字段用占位符） |
| GET | `/v1/objects/{type}?chain_id=&created_by=&status=&limit=&cursor=` | 列表 |
| PATCH | `/v1/objects/{type}/{id}` | JSON Merge Patch；请求头 `If-Match: <version>`，不符返回 409 |
| POST | `/v1/handoffs` | `{object_type, object_id, to_app, note?}` → `{handoff_id, deep_link, status: "pending"}` |
| GET | `/v1/handoffs?to_app=quote&status=pending` | 收件箱 |
| POST | `/v1/handoffs/{id}/accept` | 接收方打开后标记为已接收；写审计 |

交接返回示例：

```json
{"handoff_id": "ho_01JC40A1B2C3D4E5F6G7H8J9K0", "object_type": "tender_package",
 "object_id": "tp_01JC3Y8M2N4P6Q8R0S2T4V6W8X", "from_app": "bid", "to_app": "quote",
 "chain_id": "chain_01JC3Y7A0B1C2D3E4F5G6H7J8K", "status": "pending",
 "deep_link": "/quote?handoff=ho_01JC40A1B2C3D4E5F6G7H8J9K0",
 "created_at": "2026-11-20T10:02:11+08:00"}
```

**链路 ID 规则**：A 首次创建 `TenderPackage` 时由底座生成 `chain_id`；之后任何以它为上游（`lineage`）的对象自动继承同一个 `chain_id`。链路视图（5.12）按 `chain_id` 画出 A→B→C 或 D→E。

**运行记录**（编排器写，外壳 `RunTrace` 组件读）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/v1/runs` | `{app, pipeline, chain_id?, input_ref?}` → `{run_id}` |
| POST | `/v1/runs/{run_id}/steps` | 追加一步：`{step_id, kind: agent\|code\|review, status, started_at, ended_at, model?, mode?, input_hash, output_ref?, locked_fields?, escalation?, error?}` |
| PATCH | `/v1/runs/{run_id}` | `{status: running\|waiting_review\|succeeded\|failed}` |
| GET | `/v1/runs/{run_id}` | 返回全部步骤，外壳轮询（1 s）或 SSE `GET /v1/runs/{run_id}/stream` |

### core-R3 模型网关

作品**不直接连任何模型**。用 Claude Agent SDK 的作品把 `ANTHROPIC_BASE_URL` 指向底座，其他调用走 OpenAI 兼容入口。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/llm/anthropic/v1/messages` | Anthropic Messages 兼容（含流式 SSE、tool_use）。Agent SDK 配置：`ANTHROPIC_BASE_URL=http://localhost:8700/llm/anthropic`，`ANTHROPIC_API_KEY=<app_token>` |
| POST | `/llm/openai/v1/chat/completions` | OpenAI 兼容（含流式、tools）。给不用 Agent SDK 的简单调用 |
| POST | `/llm/embed` | `{texts: [str], purpose: "query"\|"document"}` → `{vectors: [[float]], model, dim}`。**永远走本地模型**，与模式无关 |
| GET | `/v1/settings/model-mode` | 返回当前生效模式、各作品覆盖、本地模型健康 |
| PUT | `/v1/settings/model-mode` | `{scope: "global"\|"app:quote", mode}`；只有 `admin` 角色或演示者账号可调；写审计 `model_mode_changed` |
| GET | `/v1/egress?session_id=&limit=` | 出域日志（只存发出去的**脱敏后**内容），供「云端看到了什么」抽屉使用 |

**三种模式**

| 模式 | 界面显示 | 走哪个模型 | 出域前处理 | 适用 |
|---|---|---|---|---|
| `cloud` | ☁ 云端 | `config/models.yaml` 的 `cloud.primary` | 不脱敏，但仍做二次扫描，扫到敏感实体就拒绝（`EGRESS_BLOCKED`） | 只用公开资料的环节，例如 D 的 3800t 公开参数、E 的官网新闻 |
| `cloud_redacted`（**默认**） | ☁🛡 云端·已脱敏 | `cloud.primary` | 脱敏 → 二次扫描 → 发出 → 回来还原 | 绝大多数场景 |
| `local_only` | 🔒 仅本地 | `local.primary` | 不脱敏（数据不出本机或内网）；出站目标必须是私有地址 | 技术协议、报价、客户清单；答辩演示「数据不出域」 |

**生效规则**：生效模式 = 下面三者里**最严**的一个（`local_only` > `cloud_redacted` > `cloud`）：

1. 全局设置；
2. 作品级覆盖（只能更严，不能更松：全局是 `cloud_redacted` 时，作品不能设成 `cloud`）；
3. **会话敏感度水位**：本会话里只要 `core.search` 返回过 `sensitivity = confidential` 集合的内容，或者 `core.objects` 读过 `sensitivity = confidential` 的对象，这个会话就至少升到 `cloud_redacted`；集合配置了 `force_local: true` 的，升到 `local_only`。水位只升不降，会话结束才清零。

**模型配置**（`core/config/models.yaml`，示例）

```yaml
cloud:
  primary:   {provider: anthropic, base_url: https://api.anthropic.com, model: claude-sonnet-5-5, api_key_env: ANTHROPIC_API_KEY}
  fallback:  {provider: deepseek,  base_url: https://api.deepseek.com/anthropic, model: deepseek-chat, api_key_env: DEEPSEEK_API_KEY}   # 卫华已在用 DeepSeek，答辩时可切
local:
  primary:   {provider: ollama, base_url: http://127.0.0.1:11434, model: qwen3:14b, protocol: anthropic}   # Ollama 的 Anthropic 兼容接口，待验证；不行则 protocol: openai，由网关转换
  embedding: {provider: ollama, base_url: http://127.0.0.1:11434, model: bge-m3}
policy:
  default_mode: cloud_redacted
  allow_cloud_fallback_in_local_only: false   # 固定 false，写在这里是为了让评委看到
```

**处理流程（`cloud_redacted`）**

```text
作品 Agent SDK ──messages──▶ 网关
  1 校验 app token → 取会话 → 算生效模式
  2 遍历 system / messages / tool_result 里所有文本块 → core.redact（同会话同原文 → 同占位符）
  3 出域二次扫描：对脱敏后文本再跑一遍检测器，命中任何高置信实体 → EGRESS_BLOCKED
  4 写出域日志（脱敏后文本、目标、模型、token 数）
  5 转发到云端模型；流式返回时按 5.4.6 的缓冲规则还原占位符
  6 返回给 Agent SDK 的是**还原后**的文本 → Agent 的工具调用参数里是真实值，工具在本地执行，不受影响
```

- 返回给作品的响应头：`X-Weihua-Mode: cloud_redacted`、`X-Weihua-Redacted-Count: 12`、`X-Weihua-Session: ses_...`，外壳据此刷新徽标。
- 本地模式的出站守卫：网关的 HTTP 客户端在 `local_only` 下只允许私有地址（127/8、10/8、172.16/12、192.168/16、`localhost`）。判定函数移植自 Loomi `server/modelClient.js` 的 `isPrivateAddress`，但**用法相反**：Loomi 用它禁止私有地址（防 SSRF），这里用它只允许私有地址。
- 本地模式下模型不可达：返回 `MODEL_UNAVAILABLE`，界面提示「本地模型未启动」，**不会**自动改走云端。
- 格式转换：本地模型只支持 OpenAI 协议时，网关做 Anthropic ↔ OpenAI 转换（参考 Loomi `toOpenAiMessages` / `toOpenAiTools` 和 XFusion-Agent `services/llm_router.py` 的 `OpenAICompatiblePlugin`）。

**验收**：

- 三种模式切换后，下一次请求即生效（正在进行的流式请求跑完为止）；
- `local_only` 下拔掉网线，B 的完整流程仍能跑通；用 `netstat` / 抓包确认没有发往公网模型的连接；
- `cloud_redacted` 下出域日志中，对 100 条脱敏测试样例的二次扫描命中数为 0；
- 作品 `.env` 里搜不到任何模型 Key。

### core-R4 脱敏网关

详见 **5.4 节**（单独成节）。

### core-R5 检索

基于 PPTSight（`tbszz/XFusion_AI_Hackathon/question5/01_prototype/PPTSight`）。读源码后确认的现状和要做的改造：

| PPTSight 现状（源码确认） | 改造 |
|---|---|
| `backend/app/schema.sql`：`documents / pages / chunks / facts` 四张表 + `pages_fts`、`chunks_fts` 两个 FTS5 虚表 | 保留；加 `collections` 表，`documents` 加 `collection`、`sensitivity`、`doc_type`、`tags`、`effective_date` 列 |
| 只有一个全局库，`search(query, limit)` 没有集合和过滤 | 加 `collection` 和 `filters`；**先过滤再检索**（借 Loomi 的范围不变量：越权查询直接抛错，不悄悄缩小范围） |
| `services/semantic.py` 的「语义分」其实是同义词组打分（8 组通用词），`requirements.txt` 里没有任何向量模型 | 换成起重机同义词组（起重量/额定起重量/吊重；跨度/轨距；工作级别/A5/M5；减速机/减速器；变频/调速……，来源 `research/glossary.md`）；**新增真实向量**：本地 bge-m3 经 `/llm/embed` 计算，向量存 SQLite BLOB，演示规模（≤ 2 万块）直接 numpy 暴力余弦，不引入向量库 |
| `services/rag_index.py`：按句切块（420 字，重叠 60）、数值事实抽取（`NUMBER_FACT_RE`）、表格行事实 | 直接用；`NUMBER_FACT_RE` 补单位 `t`、`m`、`m/min`、`r/min`；表格行事实正好适合标配库 / 加价标准 Excel |
| 解析器：`pdf_parser.py`、`pptx_parser.py`、`legacy_ppt.py`（PDF/PPTX/PPT） | 新增 `docx_parser.py`（python-docx，按标题和条款编号切分，定位符用条款号）、`xlsx_parser.py`（openpyxl，一行一页，定位符 `Sheet1!A12`）、`md_parser.py` |
| `workspace.py` 的 `search()` 把缓存行全量扫描打分（页 + 块 + 事实），按分数去重 | 保留打分逻辑作为 FTS 通道；三路（FTS / 向量 / 数值事实）用 RRF（k=60）融合 |
| 返回 `docId、sourceFile、page、title、quote、fullText、score、sourceType` | 映射到底座统一的 `SearchHit`（下文） |

**接口**

```text
POST /v1/collections                               建集合 {name, title, sensitivity, force_local?, description?}
POST /v1/collections/{name}/documents   multipart  入库 file + meta{doc_type, title?, tags?, product_series?, effective_date?, demo_data}
                                                   → {doc_id, pages, chunks, facts, status: "indexed"|"failed", warnings}
GET  /v1/collections/{name}/documents              文档列表
DELETE /v1/documents/{doc_id}                      删除（写审计）
POST /v1/search                                    检索（下文）
GET  /v1/sources/{doc_id}?page=&locator=           原文查看（core-R6）
```

**`core.search` 签名**（`_约定.md` 第 3 节的落地版）

```python
# Python 客户端
core.search(query: str, collection: str | list[str], filters: SearchFilters | None = None,
            limit: int = 8, modes: list[str] = ["fts", "vector", "facts"]) -> list[SearchHit]
```

```ts
// TS 客户端
core.search(query: string, collection: string | string[], filters?: SearchFilters,
            opts?: { limit?: number; modes?: ("fts" | "vector" | "facts")[] }): Promise<SearchHit[]>
```

请求：

```json
{"query": "QD 20/5t A5 电机品牌要求",
 "collection": ["standard_config", "quote_history"],
 "filters": {"doc_type": ["标配库", "历史报价"], "product_series": ["QD"],
             "effective_after": "2025-01-01", "tags": ["桥式"], "doc_ids": null},
 "limit": 8, "modes": ["fts", "vector", "facts"]}
```

响应：

```json
{"results": [
  {"text": "QD 型 20/5t A5：起升电机标配 YZR 系列绕线电机，变频调速为选配，加价见加价标准 3.2 条。",
   "score": 0.0328,
   "source": {"doc": "doc_01JC2A0000STDCONFIG000001", "doc_title": "桥式起重机标配库（模拟）",
              "collection": "standard_config", "page": 12,
              "locator": {"kind": "table_row", "value": "QD标配!A37"},
              "quote": "起升电机标配 YZR 系列绕线电机，变频调速为选配"},
   "match": {"fts": 3, "vector": 1, "facts": null},
   "sensitivity": "confidential"}
 ],
 "modes_used": ["fts", "vector", "facts"], "degraded": [], "took_ms": 84}
```

- 返回给 Python / TS 客户端的是 `results` 数组；`degraded` 非空时（例如本地向量模型没起来，只剩 FTS）客户端打一条警告，外壳在结果区显示「向量检索不可用，已降级为关键词检索」。**不会**悄悄降级。
- `score` 是 RRF 融合分，只用于排序，不要拿来当置信度。
- 没有结果返回空数组，不报错；作品必须把「没查到」如实展示（例如 B 里判为「需人工确认」），不能让大模型编。

**预置集合**（`core/config/collections.yaml`，全部是模拟或公开数据）

| 集合 | 标题 | 敏感度 | force_local | 内容 | 主要使用者 |
|---|---|---|---|---|---|
| `standard_config` | 标配库 | confidential | 否 | 模拟的桥式 / 门式标配表（Excel） | B |
| `price_rules` | 加价标准 | confidential | **是** | 模拟加价标准 | B |
| `quote_history` | 历史报价 | confidential | 否 | 模拟历史报价单 20 份 | B |
| `notices` | 内部通知 | internal | 否 | 模拟通知（对应 #42） | B |
| `company_materials` | 公司资质业绩 | internal | 否 | 营业执照、资质、业绩清单（用公开信息 + 模拟） | A |
| `tender_docs` | 招标文件 | internal | 否 | A 抓到的招标公告和技术协议 | A、B |
| `brand_corpus` | 品牌口径 | public | 否 | 官网新闻、社会责任报告（公开） | D、E |
| `speeches` | 讲话稿 | internal | 否 | 模拟讲话稿（对应原 9 / #79） | P1 |

**验收**：30 条标注问题（标配库 10、历史报价 10、品牌口径 10）top-5 命中率 ≥ 85%；每条结果都能用 `source` 打开原文并高亮 `quote`；入库 50 页 PDF ≤ 60 s。

### core-R6 出处

- **`Claim` 结构**：`{text, evidence: [Source], confidence}` + 附加字段（完整 Schema 见 7.3.7）。所有 AI 结论都用它，包括 B 的非标判定、A 的背调结论、D/E 的产品参数。
- **校验**：`POST /v1/claims/verify`，对每个 `evidence[i]` 取原文，检查 `quote` 是否在原文里出现。匹配方法移植 Loomi `server/claimEvidence.js`：先规范化（去空白和标点、统一全半角、同义动词归一），再做子串匹配，并检查前 12 个字以内有没有否定词（「未」「没有」「不」），有否定词不算支持。
- **原文查看**：`GET /v1/sources/{doc_id}?page=12&locator=QD标配!A37` 返回整页文本、高亮区间和缩略图地址。

`core.claims.verify` 签名：

```python
core.claims.verify(claims: list[Claim]) -> list[Claim]   # 回填每条的 verification
```

响应里每条 `Claim.verification`：

| status | 含义 | 界面 |
|---|---|---|
| `verified` | 所有出处的引文都在原文中找到 | 绿色「有出处」 |
| `no_evidence` | 没有给出处 | 灰色「无出处」，**不能进入导出文件**，除非人工确认 |
| `quote_mismatch` | 给了出处但引文对不上（可能是大模型编的） | 红色「出处不符」，自动发起复核 |
| `human_confirmed` | 人工在复核中确认 | 蓝色「人工确认」 |
| `rule_decided` | 规则引擎判定（`decided_by = rule`），出处是规则条目 | 深色「规则判定」 |

**验收**：故意构造 20 条编造引文，100% 判为 `quote_mismatch`；20 条真实引文（含换行、全半角差异）100% 判为 `verified`。

### core-R7 飞书

所有调用都通过 lark-cli（本机已装 1.0.96，`lark-cli auth status` 显示 bot 身份 ready）。调用方式移植 feishu-towechat 的 `scripts/feishu_wechat/lark_cli.py`：解析出无 shell 的 argv 前缀后用 `subprocess` 直接执行，参数逐个传，不拼字符串。lark-cli 拒绝绝对路径和 `..`，所以底座执行 lark-cli 时把 `cwd` 设为 `data/storage/feishu/`，附件先复制进去再用相对路径。

| 能力 | Python 签名 | REST | 对应 lark-cli | 风险 |
|---|---|---|---|---|
| 发消息 | `core.feishu.send(to: FeishuTarget, *, text=None, markdown=None, card=None, mentions: list[str] = [], idempotency_key: str) -> {message_id}` | `POST /v1/feishu/messages` | `im +messages-send --chat-id/--user-id --text/--markdown/--content --idempotency-key` | write |
| @人 | `core.feishu.mention(chat_id, open_ids: list[str], text, idempotency_key) -> {message_id}` | `POST /v1/feishu/mentions` | 同上，markdown 里拼 `<at user_id="ou_x"></at>` | write |
| 回复 | `core.feishu.reply(message_id, *, text=None, markdown=None, in_thread=False, idempotency_key) -> {message_id}` | `POST /v1/feishu/messages/{id}/reply` | `im +messages-reply` | write |
| 读群消息 | `core.feishu.list_messages(chat_id, start=None, end=None, limit=200) -> list[FeishuMessage]` | `GET /v1/feishu/chats/{chat_id}/messages` | `im +chat-messages-list` | read |
| 查人 | `core.feishu.resolve_user(query: str) -> list[{open_id, name, email}]` | `GET /v1/feishu/users?q=` | `contact` | read |
| 多维表格·列表 / 搜索 | `core.feishu.base_list(app_token, table_id, *, view_id=None, filter=None, limit=100)`；`base_search(app_token, table_id, query)` | `GET /v1/feishu/bases/{app}/tables/{table}/records` | `base +record-list` / `+record-search` | read |
| 多维表格·新增 / 更新 | `core.feishu.base_upsert(app_token, table_id, records: list[{record_id?, fields}]) -> list[{record_id}]` | `POST /v1/feishu/bases/{app}/tables/{table}/records:upsert` | `base +record-batch-create` / `+record-batch-update` | write |
| 读文档 | `core.feishu.doc_fetch(url_or_token, format="markdown") -> {title, markdown, doc_token}` | `GET /v1/feishu/docs/{token}` | `docs +fetch --doc-format markdown` | read |
| 建文档 | `core.feishu.doc_create(title, markdown, folder_token=None) -> {doc_token, url}` | `POST /v1/feishu/docs` | `docs +create --doc-format markdown --content @file` | write |
| 订阅事件 | `core.feishu.subscribe(event_key, *, filter=None) -> AsyncIterator[FeishuEvent]` | `GET /v1/feishu/events/stream?keys=im.message.receive_v1&chat_id=`（SSE） | `event consume <key>`（底座常驻子进程） | read |

- `FeishuTarget` = `{chat_id}` 或 `{open_id}` 或 `{email}`（三选一）。
- **事件订阅**：底座对每个 EventKey 只起一个 `lark-cli event consume` 常驻子进程（避免多个消费者抢事件），读 NDJSON，按订阅条件分发给作品（SSE），并落库 7 天供回放。P0 订阅 `im.message.receive_v1`（C 的群消息、@机器人）；P1 加 `card.action.trigger`（飞书卡片审批）。子进程退出时自动重启，3 次失败后 `/v1/health` 标红。
- **白名单**：`core/config/feishu.yaml` 列出允许写入的 `chat_id`、多维表格 `app_token/table_id`、文件夹。写操作目标不在白名单 → `PERMISSION_DENIED`；lark-cli 标记为 high-risk-write 的操作（例如批量删除）底座一律不提供。
- **群发确认**：向群发消息、@3 人以上、写非本作品的表，需要先 `core.review` 通过；没通过返回 `CONFIRMATION_REQUIRED` 和 `review_id`。演示时可以在 `feishu.yaml` 里给测试群设 `auto_approve: true`，但会写审计。
- **超时**：写操作超时返回 `FEISHU_AMBIGUOUS`，不重试；消息类调用必须带 `idempotency_key`（lark-cli 原生支持，≤ 50 字符），调用方用同一个 key 重发是安全的。
- **日志**：不打印消息正文、token、AppSecret（沿用 feishu-towechat 的不变量），审计里只记目标、消息类型、字数、message_id。

**验收**：在测试租户里，send / mention / reply / base_upsert / doc_create 各成功 1 次；`im.message.receive_v1` 从群里发消息到作品收到 SSE ≤ 3 s；向非白名单群发送返回 403。

### core-R8 人工复核与审计

模式来自 XFusion-Agent：`backend/app/models/entities.py` 的 `Approval`（`status`、`requester_id`、`approver_id`、`decision_reason`、`action_payload`、`decided_at`）和 `AuditLog`；`services/orchestrator.py` 的 `_request_approval`（任务挂起为 `waiting_approval` 并写审计）和 `resume_after_approval`（决定后恢复执行）。底座把它从「主机运维动作」泛化成「任意待确认条目」。

**`core.review` 签名**

```python
core.review(item: ReviewItem) -> Review          # 立即返回，status = "pending"
core.reviews.get(review_id) -> Review
core.reviews.decide(review_id, decision: "approved" | "rejected", reason: str | None = None,
                    edits: dict | None = None) -> Review     # 由外壳调用，作品一般不调
core.reviews.wait(review_id, timeout_s: int = 0) -> Review    # 0 = 不等，直接返回当前状态
```

```ts
core.review(item: ReviewItem): Promise<Review>
core.reviews.wait(reviewId: string, opts?: { timeoutS?: number }): Promise<Review>
```

`ReviewItem`（请求体）：

```json
{"item_type": "quote_result",
 "item_ref": {"type": "quote_result", "id": "qr_01JC41B2C3D4E5F6G7H8J9K0M1"},
 "title": "QD 20/5t-22.5m 技术协议：5 处非标、2 处高风险条款待确认",
 "summary": "非标：变频调速、进口减速机……；风险：逾期罚则 0.5%/天，上限 20%",
 "payload": {"non_standard_items": ["ns_01", "ns_02"]},
 "risk_level": "high",
 "assignee": {"roles": ["quoter"], "user_ids": [], "feishu_open_ids": ["ou_demo_quoter01"]},
 "editable_fields": ["/non_standard_items/0/label", "/non_standard_items/0/price_impact"],
 "notify": {"feishu": true},
 "callback": {"url": "http://localhost:8702/internal/review-callback"},
 "due_at": "2026-11-20T18:00:00+08:00"}
```

返回 `Review`：

```json
{"review_id": "rv_01JC41C3D4E5F6G7H8J9K0M1N2", "status": "pending", "app": "quote",
 "item_type": "quote_result", "item_ref": {"type": "quote_result", "id": "qr_01JC41B2C3D4E5F6G7H8J9K0M1"},
 "title": "…", "risk_level": "high", "created_at": "2026-11-20T10:15:00+08:00",
 "decided_at": null, "decided_by": null, "decision_reason": null, "edits": null,
 "link": "/reviews/rv_01JC41C3D4E5F6G7H8J9K0M1N2"}
```

- **只有三种状态**：`pending` / `approved` / `rejected`（与 `_约定.md` 一致）。「改了再通过」= `approved` + `edits`（JSON Patch 数组，只允许改 `editable_fields` 里列出的路径），这正是 B「报价员改一条判断 → 生成知识条目」需要的数据。
- 决定后：写审计 → 调 `callback.url`（POST `Review`，失败重试 3 次）→ 同时推 SSE `GET /v1/reviews/stream?app=quote`。作品用回调或 SSE 恢复流程（XFusion 的 `resume_after_approval` 模式）。
- 权限：只有 `assignee.roles` 里的角色或 `user_ids` 里的人能决定；决定后不可再改（`REVIEW_STATE_CONFLICT`）。
- 飞书通知（P0）：`notify.feishu = true` 时给 `feishu_open_ids` 发一条 markdown 消息，带「去工作台处理」链接。P1 换成交互卡片直接审批。

**审计日志**

```text
GET /v1/audit?app=&object_id=&chain_id=&event_type=&since=&limit=   查询
GET /v1/audit/verify                                               校验哈希链 → {ok: true, count: 1832}
```

每条审计：`{audit_id, ts, actor: {type: user|app|system, id}, app, event_type, object_ref?, chain_id?, session_id?, payload, prev_hash, hash}`，`hash = sha256(prev_hash + 规范化 JSON(本条不含 hash))`。只追加，不提供修改和删除接口。

| event_type | 何时写 |
|---|---|
| `object_created` / `object_updated` | 对象新建、修改 |
| `handoff_created` / `handoff_accepted` | 交接 |
| `review_requested` / `review_approved` / `review_rejected` | 复核 |
| `model_call` | 每次模型调用（模式、模型、token 数、脱敏数量；**不含正文**） |
| `model_mode_changed` | 切换模式 |
| `redaction_applied` / `redaction_overridden` | 脱敏（只记类型和数量）/ 用户手动取消某个误判 |
| `egress_blocked` | 二次扫描拦截 |
| `feishu_write` | 飞书写操作（目标、类型、message_id） |
| `export_created` | 导出 |
| `document_ingested` / `document_deleted` | 知识库变更 |

**验收**：B 的一次完整流程能在审计页按 `chain_id` 看到从「A 交接」到「C 建节点」的全部事件；手工改数据库任一行后 `/v1/audit/verify` 返回 `ok: false` 并指出第几条。

### core-R9 文件导出

```python
core.export(format: "docx" | "xlsx" | "pdf" | "feishu_doc", template: str, data: dict, *,
            filename: str, masked: bool = False, evidence_appendix: bool = True,
            watermark: str | None = "内部资料") -> ExportResult
```

`POST /v1/exports` → `{export_id, format, file: FileRef | null, feishu: {doc_token, url} | null, warnings: []}`；`GET /v1/exports/{id}/download`。

| format | 实现 | 模板 |
|---|---|---|
| `docx` | docxtpl（Jinja2 写在 Word 模板里） | `core/weihua_core/export/templates/*.docx`：`generic_report`、`authorization_letter`（授权书）、`commitment_letter`（承诺书）、`due_diligence_report`（背调报告）、`deviation_table`（技术偏离表）、`sop` |
| `xlsx` | openpyxl | `generic_table`、`deviation_table`、`monthly_report` |
| `pdf` | 先出 docx，再 `soffice --headless --convert-to pdf`；机器上没有 LibreOffice 时返回 `EXPORT_FAILED`（`detail.stage = "pdf_convert"`），界面提示改下 Word | 同 docx |
| `feishu_doc` | 渲染成 Markdown → `core.feishu.doc_create` | `*.md.j2` |

- `evidence_appendix = true`：自动在文末加「出处附录」，列出 `data` 里所有 `Claim` 的文字、出处文档、页码 / 定位符和引文；`verification.status = no_evidence` 的结论不能导出，会出现在 `warnings` 里，需人工确认后再导出。
- `masked = true`：导出脱敏版（占位符不还原），用于发给外部或评委；默认 `false`（导出原文，带水印）。
- 所有导出写审计 `export_created`。

**验收**：5 个模板各导出 1 份，Word 能正常打开、中文不乱码；带 10 条 Claim 的报告自动生成出处附录。

### core-R10 编排器与规则引擎

多 Agent 作品（A、B、E）用同一个编排器串联，模式来自医晓 `02_工作流节点设计.md`：LLM 节点和代码节点交替，代码节点是「唯一事实来源」，LLM 只能提交升级线索回传复评。**编排器只负责把节点按顺序串起来**，每个 LLM 节点内部的 Agent 循环仍然交给 Claude Agent SDK（Loomi 的边界：不自研 Agent 循环）。

**Python（`weihua_core_client.orchestrator`，P0）**

```python
from weihua_core_client import Core
from weihua_core_client.orchestrator import Pipeline, AgentStep, CodeStep, ReviewStep

pipeline = Pipeline(
    name="quote.analyze",
    steps=[
        AgentStep("parse",  system=PARSE_PROMPT, output_schema=ClauseList,
                  skills=["clause-split"], mcp_tools=["core_search"], timeout_s=120,
                  fallback=lambda inp: ClauseList(clauses=[], needs_review=True)),
        CodeStep("rules",   fn=standard_rules.assess, locks=["/items/*/label", "/items/*/rule_id"]),
        AgentStep("risk",   system=RISK_PROMPT, output_schema=RiskList, may_escalate=["/items/*/label"]),
        ReviewStep("confirm", item_builder=build_review_item, assignee_roles=["quoter"]),
    ],
)
run = await pipeline.run(input_obj, core=Core(app="quote"), chain_id=tp.chain_id)
```

| 语义 | 规则 |
|---|---|
| 输出校验 | `AgentStep` 的输出必须通过 `output_schema`（pydantic 或 JSON Schema）；不通过把错误回给模型修 1 次，仍失败走 `fallback` |
| 保守回退 | 超时或异常时用 `fallback` 的结果，并且 `fallback` 必须是**保守**的（例如标为「需人工确认」，绝不能是「标配」）——照搬医晓 `_fallback`「超时 / 异常按 high 处理，绝不返回 low」 |
| 字段锁 | `CodeStep.locks` 列出的 JSON Pointer 一旦写入，后续 `AgentStep` 的输出如果改了这些字段 → 改动被丢弃，记一条 `escalation`；如果该路径在 `may_escalate` 里且方向是「更严」（由作品提供 `severity_order`），则把线索交回该 `CodeStep` 重新评估一次，以第二次结果为准 |
| 人工节点 | `ReviewStep` 调 `core.review`，运行状态变 `waiting_review` 并挂起；收到决定后恢复；`edits` 合并进对象，字段锁对人工无效（人可以改判） |
| 留痕 | 每步写 `/v1/runs/{id}/steps`（输入哈希、输出引用、模型、模式、耗时、是否回退），外壳 `RunTrace` 实时展示 |

**TS（`@weihua/core` 的 `orchestrator-lite`，P0，给 E 用）**：只实现 `AgentStep`（输出用 zod 校验 + 1 次修复 + fallback）、`CodeStep`、`ReviewStep` 和留痕，不实现字段锁回环（E 的质检门禁本身就是代码节点，出问题直接打回）。

**规则引擎（`weihua_core_client.rules`，P0）**：把医晓 `rule_engine/rule_engine.py` 泛化。

```python
engine = RuleEngine.from_json("apps/quote/rules/standard_rules.json")
result = engine.assess(payload)  # -> RuleResult
```

| 医晓的做法（源码确认） | 底座的通用版 |
|---|---|
| `rules_definition.json` 是规则单一事实源，前端 JS 由脚本生成，禁止手改 | 同样：规则 JSON 是唯一来源，带 `version`、`date` |
| 规则按严重度降序排列，首个命中定级，全部命中留痕 | 同样；`RuleResult.hits` 全部保留 |
| `validate_input` 非法输入安全降级并记录 `input_errors`，绝不抛异常 | 同样 |
| 真超时控制，超时走保守回退 `R98-FB-97` | 同样；回退结果由规则文件的 `fallback` 字段定义 |
| `_validate_output` 检查输出契约（例如「回退绝不能是 low」） | 规则文件的 `invariants` 字段声明，引擎启动时和每次输出时检查 |
| 每次结果带 `audit_id`、`rules_version` | 同样，并写入 `Claim.rule_id` |

`RuleResult`：`{verdict, hits: [{rule_id, rule_name, evidence}], rules_version, fallback_used, input_errors, audit_id, latency_ms}`。

**验收**：用 B 的 20 条标配判定样例跑编排器：故意让 LLM 节点把一条「非标」改成「标配」，结果仍是「非标」，运行轨迹里出现一条 escalation 记录；把 LLM 节点超时设成 1 ms，结果全部是「需人工确认」。

### core-R11 MCP 服务

`/mcp`（streamable HTTP），服务名 `weihua-core`。作品在 Agent SDK 里这样挂：

```python
# Python Agent SDK
options = ClaudeAgentOptions(
    mcp_servers={"weihua-core": {"type": "http", "url": "http://localhost:8700/mcp",
                                 "headers": {"Authorization": f"Bearer {APP_TOKEN}", "X-Weihua-Session": session_id}}},
    allowed_tools=["mcp__weihua-core__core_search", "mcp__weihua-core__core_get_source", ...],
)
```

| 工具名（Agent 里显示为 `mcp__weihua-core__<名>`） | 参数 | 返回 | 备注 |
|---|---|---|---|
| `core_search` | `query, collection, filters?, limit?` | `SearchHit[]` | 会抬高会话敏感度水位 |
| `core_get_source` | `doc_id, page?, locator?` | 原文片段 | — |
| `core_claim_verify` | `claims: Claim[]` | `Claim[]` | — |
| `core_object_get` | `type, id` | 对象 | — |
| `core_object_put` | `type, object` | 对象 | 受写权限表约束 |
| `core_handoff` | `object_type, object_id, to_app, note?` | 交接 | — |
| `core_review_request` | `ReviewItem` | `Review` | — |
| `core_feishu_send` / `core_feishu_reply` | 同 REST | `{message_id}` | 受白名单和群发确认约束 |
| `core_feishu_base_query` / `core_feishu_base_upsert` | 同 REST | 记录 | — |
| `core_feishu_doc_fetch` | `url_or_token` | `{title, markdown}` | — |
| `core_export` | 同 REST | `ExportResult` | — |

**故意不暴露**：`restore`、读映射原文、改模型模式、删除文档、查审计原始载荷。理由：Agent 的输出会进入模型上下文，如果 Agent 能调 `restore`，原文就会被带到云端。

**验收**：Python 和 Node 各一个最小 Agent，挂上 MCP 后能调用 `core_search` 并返回带出处的结果；调用不存在的 `core_restore` 报工具不存在。

### core-R12 品牌外壳

详见 5.12 节和第 8 节页面。

**验收**：5 个入口都能进入（作品未完成的显示「建设中」占位页）；切换演示账号 ≤ 2 次点击；模式开关、脱敏徽标、交接红点、大卫小华助手在 5 个作品页面里都可见且行为一致。

### 5.4 脱敏网关（core-R4 详细设计，答辩卖点）

#### 5.4.1 目标

1. 发往云端模型的内容里**不出现**客户名、人名、金额、电话、合同号等敏感信息；
2. 不影响业务判断：起重量、跨度、工作级别、配套件品牌、罚则比例等**技术和条款信息一律保留**；
3. 结果回到本地后**自动还原**，用户看到的是原文；
4. 界面上随时能看到「脱敏了什么」「云端看到了什么」；
5. 一键切到「仅本地模型」，数据不出本机或内网。

#### 5.4.2 接口（`_约定.md` 的落地版）

```python
core.redact(text: str | list[str], *, session_id: str | None = None,
            types: list[EntityType] | None = None,      # 默认见 5.4.3「默认开启」列
            dictionaries: list[str] | None = None,      # 额外词典名，默认 customers、staff
            keep: list[str] = (),                        # 本次不脱敏的字面量
            style: "placeholder" | "partial" = "placeholder") -> RedactResult   # .masked / .mapping
core.restore(masked: str | list[str], mapping: Mapping | str) -> str | list[str]   # mapping 可传对象或 mapping_id
```

```ts
core.redact(text: string | string[], opts?: RedactOptions): Promise<RedactResult>   // {masked, mapping}
core.restore(masked: string | string[], mapping: Mapping | string): Promise<string | string[]>
```

REST：`POST /v1/redact`、`POST /v1/restore`、`GET /v1/redact/sessions/{session_id}/summary`、`DELETE /v1/redact/sessions/{session_id}`、`POST /v1/redact/sessions/{session_id}/overrides`（用户标记误判）。

错误：`REDACTION_FAILED`（检测器异常，**不降级为明文发出**，直接失败）、`INVALID_ARGUMENT`（`types` 含未知类型）、`PERMISSION_DENIED`（`mapping_id` 不属于调用方）、`NOT_FOUND`（映射已过期）。

`POST /v1/redact` 响应：

```json
{"masked": "【客户_01】要求起升电机采用变频调速，联系人【人名_01】（【电话_01】），合同编号【合同号_01】，总价【金额_01】，逾期每天罚合同总价 0.5%。",
 "mapping": {
   "mapping_id": "map_01JDWHMP0000000000000000A1",
   "session_id": "ses_01JDWHSE0000000000000000A1",
   "entities": [
     {"placeholder": "【客户_01】", "type": "CUSTOMER", "start": 0, "end": 7, "rule": "dict:customers", "confidence": 0.95},
     {"placeholder": "【人名_01】", "type": "PERSON", "start": 22, "end": 25, "rule": "ctx:title+surname", "confidence": 0.75},
     {"placeholder": "【电话_01】", "type": "PHONE", "start": 26, "end": 37, "rule": "re:mobile_cn", "confidence": 0.99},
     {"placeholder": "【合同号_01】", "type": "CONTRACT_NO", "start": 43, "end": 54, "rule": "re:contract_ctx", "confidence": 0.9},
     {"placeholder": "【金额_01】", "type": "AMOUNT", "start": 57, "end": 66, "rule": "re:amount_cny", "confidence": 0.97}
   ],
   "counts": {"CUSTOMER": 1, "PERSON": 1, "PHONE": 1, "CONTRACT_NO": 1, "AMOUNT": 1}
 }}
```

- **映射对象里不含原文**。原文只在底座里；`restore` 按 `mapping_id` 查表还原。外壳要展示原文时用登录用户会话调 `GET /v1/redact/mappings/{mapping_id}?reveal=true`；作品 token 调用一律 403。
- `start` / `end` 是**原文**中的字符位置（示例中数值为示意），供外壳画下划线。
- 同一会话里，同一个原文（规范化后：去空白、全角转半角、大小写统一）永远得到同一个占位符；不同会话编号独立。
- `style = "partial"` 只用于界面展示（例如 `138****5678`），不能用于出域。

#### 5.4.3 字段与规则（正则 + 词典 + NER 三层）

**占位符格式**：`【<类型中文名>_<两位序号>】`，例如 `【客户_01】`。选全角方括号是因为大模型基本会原样保留，而且技术协议正文里很少出现这种写法。网关在 `cloud_redacted` 模式下自动给 system 加一句：「文本中形如【客户_01】的内容是脱敏占位符，请原样保留，不要猜测、翻译或改写。」

| 类型 `EntityType` | 中文名 | 默认 | 规则（按优先级） | 置信度 | 典型误判及排除 |
|---|---|---|---|---|---|
| `CUSTOMER` | 客户 | ✅ | ① 词典 `customers`（模拟客户主数据 + 当前 `TenderPackage.buyer.name` / `Opportunity.customer.name` 自动加入），Aho-Corasick 匹配；② 中文公司后缀启发式 `[一-龥（）()A-Za-z]{2,30}?(股份有限公司\|有限责任公司\|有限公司\|集团\|研究院\|设计院\|港务局)`；③ 英文 `[A-Z][\w&.\- ]{2,40}\s(Co\.,?\s?Ltd\.?\|LLC\|Inc\.?\|GmbH\|S\.A\.)`；④ jieba 词性 `nt` | ①0.95 ②0.8 ③0.8 ④0.6 | **白名单** `brand_whitelist`：卫华自身及子公司、配套件品牌（ABB、SEW、西门子、施耐德、南高齿等，见调研报告 C12）——配套件品牌是非标判断的关键信息，不能脱 |
| `PERSON` | 人名 | ✅ | ① 词典 `staff`（模拟员工名册）+ 对象里的 `Person.name`；② 「联系人 / 负责人 / 经理 / 总 / 工 / 先生 / 女士」前后 4 字内、以常见姓氏开头的 2–3 字；③ jieba 词性 `nr` | ①0.95 ②0.75 ③0.6 | 白名单：大卫、小华（IP 名）及常见误判词表 |
| `AMOUNT` | 金额 | ✅ | ① 带币种：`(?:[¥￥$€]\|人民币\|RMB\|CNY\|USD\|EUR\|美元\|欧元)\s?\d[\d,，]*(?:\.\d+)?\s?(?:元\|万元\|亿元\|万\|亿)?`；② 带金额单位：`\d[\d,，]*(?:\.\d+)?\s?(?:元\|万元\|亿元\|万美元)`；③ 中文大写：`[零壹贰叁肆伍陆柒捌玖拾佰仟万亿]+[元圆](?:[零壹贰叁肆伍陆柒捌玖]角)?(?:[零壹贰叁肆伍陆柒捌玖]分)?整?` | 0.97 | **不匹配**百分比（罚则 0.5%/天要保留）、技术单位（t、m、kW、mm、r/min、m/min）、日期、型号里的数字（QD 20/5t） |
| `PHONE` | 电话 | ✅ | 手机 `(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)`；座机 `(?<!\d)0\d{2,3}-?\d{7,8}(?!\d)`；国际 `\+\d{1,3}[\s-]?\d{6,12}(?!\d)`（海外标常见 +966、+971） | 0.99 | 前后 6 字内有「型号 / 编号 / 规格 / 图号」时降到 0.5，不脱 |
| `CONTRACT_NO` | 合同号 | ✅ | ① 上下文：`(合同\|协议\|订单)(编号\|号\|No\.?)[:：\s]*([A-Za-z0-9][A-Za-z0-9\-_/]{3,39})`；② 词典 `contract_patterns`（演示用 `WH-\d{4}-\d{3,6}`） | 0.9 | **招标编号默认不脱**：公开平台的招标编号本来就公开，A 和 B 需要用它对齐；可在 `redact.yaml` 打开 |
| `EMAIL` | 邮箱 | ✅ | 标准邮箱正则 | 0.99 | — |
| `ID_CARD` | 证件号 | ✅ | 18 位身份证 + 校验位 | 0.99 | 校验位不对则不算 |
| `BANK_ACCOUNT` | 账号 | ✅ | `(?<!\d)\d{16,19}(?!\d)` + Luhn 校验 + 前 12 字内有「账号 / 开户 / 银行 / 卡号」 | 0.95 | 无上下文的长数字不算 |
| `CREDIT_CODE` | 信用代码 | ✅ | 统一社会信用代码 18 位 + 校验位 | 0.99 | — |
| `ADDRESS` | 地址 | P1 | 省市区 + 路 / 街 / 号 | — | — |
| `PROJECT` | 项目名 | P1 | 词典（「XX 钢厂二期」这类能反推客户的项目名） | — | — |

**合并规则**：重叠时取最长的那一段；一样长取置信度高的；来源优先级 词典 > 正则 > NER。默认阈值 `0.6`：宁可多脱——多脱只影响一点可读性，漏脱会出事。用户在界面上把误判标成「不需要脱敏」后，写入本会话 `keep` 列表并记审计 `redaction_overridden`。

**为什么 P0 的 NER 用 jieba 词性而不是大模型**：jieba 纯 Python、毫秒级、离线，1.5 天内能接上；本地大模型 NER 准但慢（一页几秒），放 P1 作为第二道补检。

**对象字段级脱敏**：Schema 里用注解 `"x-redact": "<EntityType>"` 标出敏感字段（`Party.name` → `CUSTOMER`、`Person.phone` → `PHONE`、`Money.amount` → `AMOUNT` 等，见 7.3）。作品用 `core.redact_object(obj)` 把对象 JSON 塞进提示词时，这些字段**按字段整体替换**，不依赖文本检测，所以不会漏。

#### 5.4.4 映射怎么存

| 项 | 设计 |
|---|---|
| 位置 | `core.db` 表 `redaction_entries(session_id, placeholder, type, original_hmac, original_cipher, rule, created_at, expires_at)` 和 `redaction_mappings(mapping_id, session_id, app, placeholders_json, created_at)` |
| 加密 | 原文用 AES-GCM（`cryptography` 库 `AESGCM`）加密存 `original_cipher`；密钥来自环境变量 `WEIHUA_REDACT_KEY`，Windows 上可改为 DPAPI 保护的密钥文件 |
| 查找 | `original_hmac = HMAC-SHA256(key, 规范化原文)`，实现「同原文同占位符」，不需要解密 |
| 范围 | 按 `session_id` 隔离；还原时 `mapping_id` 必须属于调用方作品和会话，否则 403 |
| 期限 | 默认 7 天自动删除；`DELETE /v1/redact/sessions/{id}` 立即删除（演示结束一键清空） |
| 不出现的地方 | 原文不进审计日志、不进出域日志、不进 `masked=true` 的导出文件、不进 MCP 工具、不打印到控制台 |

#### 5.4.5 出域二次扫描

网关在发出前对**脱敏后的文本**（含 system、所有消息、工具参数 JSON）再跑一遍检测器（阈值 0.8，只看高置信），命中任何实体 → `EGRESS_BLOCKED`，请求不发出，审计记 `egress_blocked`（只记类型和位置）。防的是作品把敏感信息放在网关没覆盖的地方（图片 alt、工具参数字符串）。

#### 5.4.6 流式还原

云端流式返回时占位符可能被切在两个分片之间。还原器维护小缓冲区：遇到 `【` 开始缓存，直到 `】` 或缓存超过 16 字符，再整体查表输出。容错：模型把 `【客户_01】` 写成 `【客户01】` 或 `客户_01` 时，按 `【?(客户|人名|金额|电话|合同号|邮箱|证件号|账号|信用代码)_?(\d{2})】?` 匹配，**仅当该编号在本会话映射中存在**才还原；模型编出的不存在编号原样保留，并在响应头 `X-Weihua-Unrestored: 1` 提示。

#### 5.4.7 界面上怎么提示「已脱敏」

| 位置 | 样子 | 行为 |
|---|---|---|
| 顶栏模式开关 | `☁ 云端` / `☁🛡 云端·已脱敏` / `🔒 仅本地` 三段式，当前模式高亮；本地模式时顶栏底色变深灰 | 点击切换（演示者或管理员账号）；切换时大卫说「已切换为仅本地模型，接下来的数据不会离开这台电脑」 |
| AI 输出区右上角 `RedactionBadge` | `🛡 已脱敏 12 项 · 客户 2 · 人名 3 · 金额 5 · 电话 2` | 点开右侧抽屉「云端看到了什么」：左栏本地原文（敏感词黄底），右栏出域日志里的脱敏文本（占位符红框），一一对应；本地模式下徽标变成 `🔒 本地处理，未出域` |
| 正文中的敏感词 | 已还原的敏感词加虚线下划线 | 悬停提示「发往云端时显示为【客户_01】」；右键「这不是敏感信息」→ 加入本会话白名单 |
| 导出对话框 | 「原文版（内部）/ 脱敏版（可外发）」二选一 | 脱敏版文件名带 `_脱敏` 后缀 |
| 设置页「脱敏」 | 类型开关、词典管理（上传客户名单 CSV）、白名单、清空本会话映射 | 改动写审计 |

#### 5.4.8 「仅本地模型」怎么切换

1. **入口**：顶栏开关（全局）；设置页可以给单个作品设得更严；集合配置 `force_local: true`（如 `price_rules` 加价标准）会把用到它的会话自动锁成本地。
2. **生效**：`PUT /v1/settings/model-mode {mode}` 写入后，网关下一次请求即按新模式路由；进行中的流式请求跑完为止。外壳通过 SSE `GET /v1/settings/stream` 收到变更，所有页面徽标同时刷新。
3. **执行**：`local_only` 下 `/llm/*` 全部路由到 `local.primary`；出站 HTTP 客户端只放行私有地址（复用 Loomi `isPrivateAddress`，逻辑取反）；embedding 本来就在本地。模型密钥只在底座，作品没有办法自己连云端。
4. **检查**：设置页显示本地模型名、地址、最近延迟和 tokens/s；本地模型没起来时仍可切，但提示「本地模型不可用，AI 功能将暂停」，**不会**回退到云端（`allow_cloud_fallback_in_local_only: false`）。
5. **答辩演示**：切到本地 → 断开网络 → 在 B 里上传协议照样出结果 → 打开出域日志显示本会话 0 条出域记录。

#### 5.4.9 验收

| 指标 | 目标 | 测试集 |
|---|---|---|
| 正则类（电话、邮箱、证件号、账号、信用代码、带币种金额）召回 | ≥ 99% | `data/mock/redaction_cases.jsonl` 中 60 条 |
| 客户名召回 | 有词典 ≥ 98%；仅靠后缀和 jieba ≥ 85% | 40 条 |
| 人名召回 | ≥ 90% | 30 条 |
| 技术信息误脱率（型号、起重量、跨度、工作级别、百分比、配套件品牌） | ≤ 2% | 50 条对抗样例，如「QD 20/5t-22.5m A5」「电机采用 ABB 品牌」「逾期罚 0.5%/天」 |
| 出域二次扫描命中（`cloud_redacted` 下跑完全部测试集） | 0 | 同上 |
| 还原正确率（含流式切片、模型改写占位符格式） | 100% | 30 条 |
| 性能 | 5,000 字 ≤ 50 ms（不含 jieba 首次加载） | — |

### 5.12 品牌外壳与共用前端组件（core-R12 详细设计）

**统一导航**：顶栏左侧「卫华 AI 工作台」文字标识（官方 Logo 文件是否可用**待主办方确认**，确认前不使用）；中间 5 个入口按两条链路分组：

```text
营销获客链：  A 招投标助手  →  B 报价智能体  →  C 飞书跟进助手
内容创作链：  D 起重机内容工厂  →  E 视频生产线
```

每个入口显示交接红点（收到但未接收的交接数）。右侧：模式开关、复核中心（待我复核数）、账号切换。

**主题**：CSS 变量，暂用红色（**待确认**：调研未查到官方 VI 色值，见调研报告 B7），拿到 VI 手册后只改这一处。

```css
:root {
  --wh-red: #D7000F;        /* 暂定，待 VI 手册替换 */
  --wh-red-dark: #A3000B;
  --wh-ink: #1F2329;  --wh-gray: #8F959E;  --wh-bg: #F5F6F7;
  --wh-blue: #2B7DE9;       /* 呼应 IP 海报护目镜蓝，用于「本地 / 安全」提示 */
  --wh-yellow: #F5B800;     /* 用于「待复核」 */
  --wh-ok: #2EA121;  --wh-warn: #F5B800;  --wh-danger: #D7000F;
}
```

**登录**：演示态不设密码，登录页直接选账号（`POST /v1/auth/login {account}`），顶栏可随时切换，方便一次演示里从「业务员」切到「报价员」点复核。

| 账号 | 显示名（虚构） | 角色 | 用在 |
|---|---|---|---|
| `sales01` | 业务员·演示 A | `sales` | A、C |
| `quoter01` | 报价员·演示 B | `quoter` | B 的复核 |
| `manager01` | 销售经理·演示 C | `manager` | C 的风险清单、A 的材料包复核 |
| `brand01` | 品牌专员·演示 D | `brand` | D、E 的发布复核 |
| `admin` | 演示者 | `admin` | 切换模型模式、管理知识库 |

**大卫小华助手**（`AssistantDock`，右下角常驻）

依据调研报告 B6：大卫代表制造根基、沉稳有力；小华代表数智方向、灵动创新；官方海报为 3D Q 版红白机甲风（[发布报道](https://www.cranewh.com/detail/5700.html)）。

| 分工 | 小华（默认出场） | 大卫 |
|---|---|---|
| 性格对应 | 数智、灵动 | 稳重、守规矩 |
| 负责说什么 | AI 生成类：「帮你找到 3 条历史报价」「成片生成好了」 | 安全和规则类：「已脱敏 12 项」「这条是规则判定，AI 不能改」「需要报价员复核」「已切换为仅本地模型」 |
| 触发 | 作品调用 `core.assistant.say(...)` | 底座事件自动触发（脱敏、拦截、复核、模式切换、交接到达） |

- **P0 形象**：CSS / SVG 扁平占位头像（红白配色 + 蓝色护目镜 / 面罩，只呼应配色，不复刻海报造型），设置页注明「官方形象授权后替换」。拿到授权后换官方图或 E 生成的版本。
- **P0 能力**：① 事件播报（订阅底座 SSE，确定性文案，不调模型）；② 「问小华」：单轮问答，走模型网关，system 放平台说明和当前页面上下文，回答「这一页在做什么」「我的数据去哪了」；不挂工具。
- 接口：`POST /v1/assistant/say {character: "david"|"hanna", text, level: "info"|"warn", link?}`。

**共用前端组件**（`web/src/ui/`，5 个作品用同一套）

| 组件 | 作用 | 数据来源 |
|---|---|---|
| `ClaimCard` | 一条结论：文字、置信度、校验状态色标（core-R6 的五种）、出处列表；点出处打开 `SourceViewer` | `Claim` |
| `SourceViewer` | 右侧抽屉：原文整页、引文高亮、页码 / 定位符、「在知识库中打开」 | `GET /v1/sources/...` |
| `RedactionBadge` | 「已脱敏 N 项」+「云端看到了什么」对比抽屉 | `/v1/redact/sessions/{id}/summary`、`/v1/egress` |
| `ReviewPanel` | 复核卡片：标题、摘要、可编辑字段、通过 / 驳回 / 修改后通过、意见 | `Review` |
| `RunTrace` | 多 Agent 运行轨迹：节点时间线，每步类型（AI / 规则 / 人工）、耗时、模型、模式、是否回退、升级记录 | `/v1/runs/{id}` |
| `HandoffButton` / `HandoffInbox` | 「发送到 B 报价智能体」按钮；收件箱 | `/v1/handoffs` |
| `AssistantDock` | 大卫小华 | SSE |
| `DemoDataTag` | 对象 `demo_data: true` 时角标「模拟数据」 | 对象 Envelope |

**iframe 嵌入协议**（自带前端的作品用）：外壳 → iframe `postMessage({type: "weihua:context", user, roles, session_id, mode, theme, chain_id})`；iframe → 外壳 `{type: "weihua:assistant", character, text}` 或 `{type: "weihua:open-source", doc, page, locator}`（外壳打开共用抽屉）。外壳只接受同源 `localhost` 来源的消息。

---

## 6. Agent / Skill 设计

底座**没有自己的业务 Agent**，它提供各作品 Agent 的运行环境、工具和兜底机制。

### 6.1 Agent Runtime 约定（各作品必须遵守）

沿用 Loomi `ARCHITECTURE.md` 的边界：Claude Agent SDK 管 Agent 怎么想、怎么做；底座和作品管 Agent 知道什么、能做什么、允许说什么。

| 约定 | 内容 | 来源 |
|---|---|---|
| 模型入口 | 只能走底座 `/llm/anthropic`（Agent SDK 设 `ANTHROPIC_BASE_URL=http://127.0.0.1:8700/llm/anthropic`，`ANTHROPIC_API_KEY=<app_token>`）；OpenAI 兼容客户端走 `/llm/openai`；作品里不放任何模型 Key | 本文 core-R3 |
| 工具 | 业务工具由作品注册为 SDK 进程内 MCP；底座能力通过 `weihua-core` MCP 挂载；`allowed_tools` 显式白名单，不开放文件系统和 shell 工具 | Loomi `server/claudeAgent.js` |
| Skills | 放在作品 `.claude/skills/<名>/SKILL.md`，用 SDK 的 Skill 发现机制加载，不做自定义注册表 | Loomi `ARCHITECTURE.md` |
| 会话 | 每个对话一个 SDK session，`session_id` 与 `X-Weihua-Session` 相同，脱敏映射和敏感度水位跟着会话走 | Loomi 会话恢复 |
| 工具调用上限、空闲超时 | 单轮工具调用 ≤ 12 次；空闲 180 s 无进展中止，已完成步骤保留 | Loomi `claudeAgent.js` |
| 写操作去重 | 有副作用的工具执行前打标记，会话恢复时不重放 | Loomi `claudeAgent.js` |
| 结构化输出 | 多 Agent 节点输出一律 JSON，由编排器按 Schema 校验 | 医晓工作流设计 |

### 6.2 底座提供的共享 Skills

由 `scripts/stage-skills.ps1` 复制到各作品 `.claude/skills/`。

| Skill | 内容 | 来源 |
|---|---|---|
| `weihua-glossary` | 型号命名（QD / QC / MG / RTG……）、规格写法、起升高度和整机高度的区别、报价用语 | `research/glossary.md` |
| `claim-format` | 怎样输出 `Claim`：每条结论给 `evidence`；`quote` 必须逐字摘自 `core_search` 返回的原文；查不到就 `evidence: []` 并降低 `confidence`，不许编出处 | 7.3.7 + Loomi `claimEvidence.js` |
| `placeholder-rules` | 【客户_01】类占位符原样保留，不猜真实值 | 5.4.3 |
| `weihua-brand-voice` | 官方文风、口号、高频词、「相当于 X 层楼」类比写法 | 调研报告 B7、B8 |

### 6.3 兜底机制（多 Agent 作品通用）

| 风险 | 兜底 | 实现位置 |
|---|---|---|
| 大模型把规则判定改轻 | 字段锁 + 只升不降 | 编排器 core-R10 |
| 大模型输出格式错 | Schema 校验 → 修 1 次 → 保守 fallback | 编排器 |
| 大模型编出处 | `claims.verify` 判 `quote_mismatch` → 自动发起复核 | core-R6 |
| 无出处结论进正式文件 | 导出时拦截 `no_evidence`（`EVIDENCE_NOT_FOUND`） | core-R9 |
| 敏感数据出域 | 字段级脱敏 + 文本脱敏 + 出域二次扫描 + 本地模式 | core-R3、5.4 |
| 误发飞书 | 白名单 + 群发需复核 + 幂等 key + 结果不明不重试 | core-R7 |
| 关键结论没人看就生效 | `ReviewStep`；`risk_level = high` 的复核不能自动通过 | core-R8 |

---

## 7. 数据与接口

### 7.1 数据来源与样例数据方案

| 数据 | 来源 | 处理 | 放哪 |
|---|---|---|---|
| 客户主数据（词典） | **模拟**：30 家虚构客户，名字统一「XX（模拟）有限公司」，行业按调研报告 C11 的常见客户行业分布 | CSV | `data/mock/dict/customers.csv` |
| 员工名册（词典） | **模拟**：20 个虚构姓名 + 岗位 | CSV | `data/mock/dict/staff.csv` |
| 配套件品牌白名单 | **公开**：调研报告 C12 | CSV | `data/mock/dict/brand_whitelist.csv` |
| 标配库、加价标准、历史报价 | **模拟**（内部数据），内容由 B 的 PRD 定义，底座只负责入库 | Excel | `data/mock/collections/<集合名>/` |
| 品牌口径 | **公开**：官网新闻（如 [5679](https://www.cranewh.com/detail/5679.html)）、社会责任报告 | 只入库摘要和链接 | `brand_corpus` |
| 脱敏测试集 | **自造**：180 条，含 50 条对抗样例 | JSONL：`{text, expected: [{type, start, end}]}` | `data/mock/redaction_cases.jsonl` |
| 链路演示种子 | **自造**：一条完整 A→B→C 链和一条 D→E 链的全部对象 | `scripts/seed.ps1` 写入；`scripts/replay-chain.ps1` 一键回放 | `data/mock/chains/` |

所有模拟对象带 `demo_data: true`，界面显示「模拟数据」角标。

### 7.2 作品与底座、作品之间的接口总表

| 作品 | 产出（写） | 消费（读） | 主要用到的底座能力 |
|---|---|---|---|
| A `bid` | `TenderPackage`、`Opportunity` | — | search（company_materials、tender_docs）、claims、feishu（base_upsert、send）、review（材料包）、export（授权书、承诺书、背调报告）、RuleEngine（背调评分）、orchestrator |
| B `quote` | `QuoteResult` | `TenderPackage` | redact / local_only（主打）、search（standard_config、price_rules、quote_history、notices、tender_docs）、claims、RuleEngine（标配判定）、review（带 edits）、export（偏离表、SOP）、orchestrator |
| C `follow` | `Opportunity` 的进度字段 | `Opportunity`、`QuoteResult` | feishu（subscribe、list_messages、mention、base_list / upsert）、redact（聊天摘要）、review（风险清单群发）、export（月报） |
| D `studio` | `MediaAsset` | — | claims（参数出处）、search（brand_corpus）、assistant |
| E `video` | `MediaAsset`（成片）、`Article` | `MediaAsset` | search（brand_corpus）、claims、review（发布前）、export（feishu_doc）、orchestrator-lite（TS） |

**链路串联时谁调什么**

```text
A: objects.put(TenderPackage) → handoff(tp → quote) → handoff(opp → follow)     ┐ 同一个 chain_id
B: 收件箱 → objects.get(tp) → 分析 → objects.put(QuoteResult)                   │
   → review(...) 通过 → handoff(qr → follow)                                     │
C: 收件箱 → 读 qr.milestones / qr.confirmer → feishu.base_upsert(项目节点)       │
   → feishu.mention(确认人)                                                       ┘
D: objects.put(MediaAsset × N) → handoff(ma → video)                             ┐ 另一个 chain_id
E: 收件箱 → 成片 objects.put(MediaAsset kind=video_clip) → objects.put(Article)  │
   → review → export(feishu_doc) → feishu-towechat 生成公众号草稿                 ┘
```

### 7.3 数据对象 JSON Schema（权威定义，可直接照着实现）

- 规范：JSON Schema Draft 2020-12。落地时拆成 `schemas/*.schema.json` 七个文件，`$id` 为 `https://weihua-ai.local/schemas/<文件名>`，跨文件用相对 `$ref`。
- **存储形态**：下面描述存进底座、作品之间交接时的完整形态。**创建请求**可省略 `id`、`schema_version`、`version`、`chain_id`、`created_by`、`created_at`、`updated_at`，由底座填写（`created_by` 取自 app token）；其余必填字段创建时就必须有。
- 每个对象 Schema 用 `allOf: [Envelope]` + `unevaluatedProperties: false`，所以信封字段和业务字段都受控，未声明字段一律拒收（`SCHEMA_VALIDATION_FAILED`）。
- `x-redact` 是自定义注解，标出敏感字段的脱敏类型；`x-label` 是枚举值的界面中文。校验器需开启「忽略未知关键字」（Python `jsonschema`、TS `ajv` 设 `strict: false`）。
- 金额一律用 `Money`，时间一律 RFC 3339 带时区，ID 一律 `<前缀>_<ULID>`。

#### 7.3.1 `common.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/common.schema.json",
  "title": "卫华 AI 工作台 · 公共定义",
  "$defs": {
    "DateTime": { "type": "string", "format": "date-time" },
    "AppCode": {
      "type": "string", "enum": ["core", "bid", "quote", "follow", "studio", "video"],
      "x-label": {"core": "底座", "bid": "A 招投标助手", "quote": "B 报价智能体", "follow": "C 飞书跟进助手", "studio": "D 起重机内容工厂", "video": "E 视频生产线"}
    },
    "ObjectType": {
      "type": "string", "enum": ["tender_package", "opportunity", "quote_result", "media_asset", "article", "claim"]
    },
    "ObjectRef": {
      "type": "object", "additionalProperties": false, "required": ["type", "id"],
      "properties": {
        "type": { "$ref": "#/$defs/ObjectType" },
        "id": { "type": "string", "pattern": "^(tp|opp|qr|ma|art|clm)_[0-9A-HJKMNP-TV-Z]{26}$" }
      }
    },
    "Sensitivity": {
      "type": "string", "enum": ["public", "internal", "confidential"],
      "x-label": {"public": "公开", "internal": "内部", "confidential": "机密"}
    },
    "EntityType": {
      "type": "string",
      "enum": ["CUSTOMER", "PERSON", "AMOUNT", "PHONE", "CONTRACT_NO", "EMAIL", "ID_CARD", "BANK_ACCOUNT", "CREDIT_CODE", "ADDRESS", "PROJECT"],
      "x-label": {"CUSTOMER": "客户", "PERSON": "人名", "AMOUNT": "金额", "PHONE": "电话", "CONTRACT_NO": "合同号", "EMAIL": "邮箱", "ID_CARD": "证件号", "BANK_ACCOUNT": "账号", "CREDIT_CODE": "信用代码", "ADDRESS": "地址", "PROJECT": "项目名"}
    },
    "CreatedBy": {
      "type": "object", "additionalProperties": false, "required": ["app"],
      "properties": {
        "app": { "$ref": "#/$defs/AppCode" },
        "user_id": { "type": "string" },
        "run_id": { "type": "string", "pattern": "^run_[0-9A-HJKMNP-TV-Z]{26}$" }
      }
    },
    "RedactionInfo": {
      "type": "object", "additionalProperties": false, "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["none", "masked", "restored"], "x-label": {"none": "无需脱敏", "masked": "当前为脱敏版", "restored": "已还原"} },
        "session_id": { "type": "string", "pattern": "^ses_[0-9A-HJKMNP-TV-Z]{26}$" },
        "count": { "type": "integer", "minimum": 0 },
        "types": { "type": "array", "items": { "$ref": "#/$defs/EntityType" }, "uniqueItems": true }
      }
    },
    "Envelope": {
      "type": "object",
      "required": ["id", "schema_version", "version", "created_by", "created_at", "updated_at", "sensitivity", "demo_data"],
      "properties": {
        "id": { "type": "string" },
        "schema_version": { "const": "1.0" },
        "version": { "type": "integer", "minimum": 1, "description": "乐观锁版本，底座每次修改 +1，写入时用 If-Match" },
        "chain_id": { "type": ["string", "null"], "pattern": "^chain_[0-9A-HJKMNP-TV-Z]{26}$" },
        "created_by": { "$ref": "#/$defs/CreatedBy" },
        "created_at": { "$ref": "#/$defs/DateTime" },
        "updated_at": { "$ref": "#/$defs/DateTime" },
        "sensitivity": { "$ref": "#/$defs/Sensitivity" },
        "demo_data": { "type": "boolean", "description": "true = 模拟数据，界面显示「模拟数据」角标" },
        "lineage": { "type": "array", "items": { "$ref": "#/$defs/ObjectRef" }, "description": "上游对象，如 QuoteResult 的上游是 TenderPackage" },
        "redaction": { "$ref": "#/$defs/RedactionInfo" },
        "tags": { "type": "array", "items": { "type": "string", "maxLength": 40 }, "maxItems": 30 }
      }
    },
    "FileRef": {
      "type": "object", "additionalProperties": false, "required": ["file_id", "name", "mime", "path"],
      "properties": {
        "file_id": { "type": "string", "pattern": "^f_[0-9A-HJKMNP-TV-Z]{26}$" },
        "name": { "type": "string", "maxLength": 255 },
        "mime": { "type": "string", "examples": ["application/pdf", "image/png", "video/mp4", "model/gltf-binary", "text/html"] },
        "size_bytes": { "type": "integer", "minimum": 0 },
        "sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "path": { "type": "string", "description": "相对 data/storage/ 的路径，禁止绝对路径和 ..", "pattern": "^(?![/\\\\])(?!.*\\.\\.)[^:]+$" },
        "url": { "type": "string", "description": "底座下载地址，例如 /v1/files/f_xxx" }
      }
    },
    "Person": {
      "type": "object", "additionalProperties": false, "required": ["name"],
      "properties": {
        "user_id": { "type": "string", "description": "工作台账号，如 quoter01" },
        "name": { "type": "string", "maxLength": 50, "x-redact": "PERSON" },
        "role": { "type": "string", "examples": ["sales", "quoter", "manager", "brand", "客户采购", "客户技术"] },
        "feishu_open_id": { "type": "string", "pattern": "^ou_[A-Za-z0-9_]+$" },
        "email": { "type": "string", "format": "email", "x-redact": "EMAIL" },
        "phone": { "type": "string", "x-redact": "PHONE" }
      }
    },
    "Party": {
      "type": "object", "additionalProperties": false, "required": ["name"],
      "properties": {
        "name": { "type": "string", "maxLength": 200, "x-redact": "CUSTOMER" },
        "name_en": { "type": "string", "maxLength": 200, "x-redact": "CUSTOMER" },
        "country": { "type": "string", "pattern": "^[A-Z]{2}$", "description": "ISO 3166-1 alpha-2" },
        "industry": { "type": "string", "examples": ["港口", "风电海工", "钢铁冶金", "造船", "核电", "石化", "有色"] },
        "credit_code": { "type": "string", "x-redact": "CREDIT_CODE" },
        "contact": { "$ref": "#/$defs/Person" }
      }
    },
    "Money": {
      "type": "object", "additionalProperties": false, "required": ["amount", "currency"],
      "properties": {
        "amount": { "type": "number", "minimum": 0, "x-redact": "AMOUNT" },
        "currency": { "type": "string", "pattern": "^[A-Z]{3}$", "examples": ["CNY", "USD", "EUR", "SAR"] },
        "approx": { "type": "boolean", "default": false, "description": "true = 估算值" }
      }
    },
    "ProductSpec": {
      "type": "object", "additionalProperties": false, "required": ["category"],
      "properties": {
        "category": {
          "type": "string", "enum": ["overhead_crane", "gantry_crane", "port_crane", "hoist", "jib_crane", "special_crane", "component", "other"],
          "x-label": {"overhead_crane": "桥式起重机", "gantry_crane": "门式起重机", "port_crane": "港口起重机", "hoist": "电动葫芦", "jib_crane": "悬臂起重机", "special_crane": "特种起重机", "component": "零部件", "other": "其他"}
        },
        "series": { "type": "string", "description": "型号前缀，见 research/glossary.md", "examples": ["QD", "QC", "LD", "MG", "ME", "RTG", "RMG"] },
        "model": { "type": "string", "examples": ["QD 20/5t-22.5m A5", "MG 3800t-107m"] },
        "name": { "type": "string" },
        "capacity_t": { "type": "number", "exclusiveMinimum": 0, "description": "主钩额定起重量，t" },
        "aux_capacity_t": { "type": "number", "exclusiveMinimum": 0, "description": "副钩起重量，t" },
        "span_m": { "type": "number", "exclusiveMinimum": 0 },
        "lifting_height_m": { "type": "number", "exclusiveMinimum": 0, "description": "起升高度，不是整机高度" },
        "overall_height_m": { "type": "number", "exclusiveMinimum": 0, "description": "整机高度" },
        "work_class": { "type": "string", "pattern": "^A[1-8]$" },
        "quantity": { "type": "integer", "minimum": 1 },
        "notes": { "type": "string", "maxLength": 500 }
      }
    },
    "Milestone": {
      "type": "object", "additionalProperties": false, "required": ["key", "name", "due_at", "status", "source"],
      "properties": {
        "key": {
          "type": "string",
          "enum": ["registration_deadline", "document_purchase", "clarification_deadline", "site_visit", "bid_submission", "bid_opening", "technical_clarification", "quote_confirmation", "contract_signing", "delivery", "custom"],
          "x-label": {"registration_deadline": "报名截止", "document_purchase": "标书购买截止", "clarification_deadline": "澄清截止", "site_visit": "现场踏勘", "bid_submission": "投标截止", "bid_opening": "开标", "technical_clarification": "技术澄清", "quote_confirmation": "报价确认", "contract_signing": "合同签订", "delivery": "交货", "custom": "自定义"}
        },
        "name": { "type": "string", "maxLength": 60 },
        "due_at": { "$ref": "#/$defs/DateTime" },
        "owner": { "$ref": "#/$defs/Person" },
        "status": {
          "type": "string", "enum": ["pending", "done", "at_risk", "overdue", "cancelled"],
          "x-label": {"pending": "未到期", "done": "已完成", "at_risk": "临期", "overdue": "已逾期", "cancelled": "已取消"}
        },
        "done_at": { "$ref": "#/$defs/DateTime" },
        "remind_before_hours": { "type": "integer", "minimum": 0, "default": 48 },
        "source": {
          "type": "string", "enum": ["tender_package", "quote_result", "manual", "feishu"],
          "x-label": {"tender_package": "来自招标包", "quote_result": "来自报价结果", "manual": "手工录入", "feishu": "来自飞书"}
        },
        "source_ref": { "$ref": "#/$defs/ObjectRef" }
      }
    },
    "Locator": {
      "type": "object", "additionalProperties": false, "required": ["kind", "value"],
      "properties": {
        "kind": {
          "type": "string", "enum": ["page", "clause", "char_range", "bbox", "table_row", "timecode", "url", "record"],
          "x-label": {"page": "整页", "clause": "条款号", "char_range": "字符区间", "bbox": "页面区域", "table_row": "表格行", "timecode": "时间码", "url": "网页", "record": "飞书记录"}
        },
        "value": {
          "type": "string", "maxLength": 300,
          "examples": ["12", "3.2.1", "120-188", "72,410,300,48", "QD标配!A37", "00:01:12.500", "https://www.cranewh.com/detail/5679.html", "feishu:bascnXXXX:tblXXXX:recXXXX"]
        }
      }
    },
    "Source": {
      "type": "object", "additionalProperties": false, "required": ["doc", "page", "locator"],
      "properties": {
        "doc": { "type": "string", "pattern": "^(doc_[0-9A-HJKMNP-TV-Z]{26}|ext)$", "description": "底座文档 ID；未入库的外部网页填 ext 并给 url" },
        "doc_title": { "type": "string", "maxLength": 200 },
        "collection": { "type": "string" },
        "page": { "type": ["integer", "null"], "minimum": 1, "description": "1 起计；网页、飞书记录等填 null" },
        "locator": { "$ref": "#/$defs/Locator" },
        "quote": { "type": "string", "maxLength": 500, "description": "逐字摘自原文的引文，用于校验和高亮" },
        "url": { "type": "string", "format": "uri" },
        "score": { "type": "number" }
      },
      "if": { "properties": { "doc": { "const": "ext" } }, "required": ["doc"] },
      "then": { "required": ["url"] }
    }
  }
}
```

#### 7.3.2 `tender-package.schema.json`（A → B、C）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/tender-package.schema.json",
  "title": "TenderPackage 招标包",
  "description": "A 招投标助手产出，B 报价智能体消费。一个招标项目一个对象。",
  "type": "object",
  "allOf": [{ "$ref": "common.schema.json#/$defs/Envelope" }],
  "required": ["tender_no", "title", "buyer", "source", "deadlines", "products", "qualification_requirements", "required_documents", "technical_docs", "status"],
  "properties": {
    "id": { "type": "string", "pattern": "^tp_[0-9A-HJKMNP-TV-Z]{26}$" },
    "tender_no": { "type": "string", "minLength": 1, "maxLength": 100, "description": "招标编号（公开信息，默认不脱敏）" },
    "title": { "type": "string", "maxLength": 300 },
    "buyer": { "$ref": "common.schema.json#/$defs/Party", "description": "甲方 / 招标人" },
    "agency": { "$ref": "common.schema.json#/$defs/Party", "description": "招标代理机构" },
    "market": {
      "type": "object", "additionalProperties": false, "required": ["country"],
      "properties": {
        "country": { "type": "string", "pattern": "^[A-Z]{2}$" },
        "region": { "type": "string", "description": "如 中东、东南亚" },
        "war_zone": { "type": "string", "description": "卫华海外战区名（具体名称待确认）" }
      }
    },
    "source": {
      "type": "object", "additionalProperties": false, "required": ["platform", "url", "published_at", "fetched_at"],
      "properties": {
        "platform": { "type": "string", "examples": ["UNGM", "World Bank", "ADB", "中国招标投标公共服务平台"] },
        "url": { "type": "string", "format": "uri" },
        "published_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "fetched_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "language": { "type": "string", "enum": ["zh", "en", "ar", "ru", "es", "fr", "pt", "other"] },
        "cached": { "type": "boolean", "default": false, "description": "true = 演示用缓存样例" }
      }
    },
    "deadlines": {
      "type": "object", "additionalProperties": false, "required": ["bid_submission_at", "timezone"],
      "properties": {
        "registration_until": { "$ref": "common.schema.json#/$defs/DateTime" },
        "document_purchase_until": { "$ref": "common.schema.json#/$defs/DateTime" },
        "clarification_until": { "$ref": "common.schema.json#/$defs/DateTime" },
        "site_visit_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "bid_submission_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "bid_opening_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "timezone": { "type": "string", "description": "IANA 时区", "examples": ["Asia/Shanghai", "Asia/Riyadh"] }
      }
    },
    "budget": { "$ref": "common.schema.json#/$defs/Money" },
    "bid_bond": { "$ref": "common.schema.json#/$defs/Money", "description": "投标保证金" },
    "products": { "type": "array", "minItems": 1, "items": { "$ref": "common.schema.json#/$defs/ProductSpec" } },
    "qualification_requirements": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false, "required": ["req_id", "text", "category", "mandatory", "status"],
        "properties": {
          "req_id": { "type": "string", "pattern": "^q_\\d{2,4}$" },
          "text": { "type": "string", "maxLength": 1000 },
          "category": {
            "type": "string", "enum": ["license", "performance", "financial", "personnel", "certification", "other"],
            "x-label": {"license": "资质证照", "performance": "业绩", "financial": "财务", "personnel": "人员", "certification": "认证", "other": "其他"}
          },
          "mandatory": { "type": "boolean" },
          "status": {
            "type": "string", "enum": ["met", "missing", "expired", "unknown"],
            "x-label": {"met": "已满足", "missing": "缺材料", "expired": "已过期", "unknown": "待确认"}
          },
          "matched_materials": {
            "type": "array",
            "items": {
              "type": "object", "additionalProperties": false, "required": ["name"],
              "properties": {
                "name": { "type": "string" },
                "file": { "$ref": "common.schema.json#/$defs/FileRef" },
                "valid_until": { "type": "string", "format": "date" }
              }
            }
          },
          "claim": { "$ref": "claim.schema.json" }
        }
      }
    },
    "required_documents": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false, "required": ["doc_key", "name", "status"],
        "properties": {
          "doc_key": { "type": "string", "examples": ["authorization_letter", "commitment_letter", "business_license", "performance_list"] },
          "name": { "type": "string", "examples": ["法定代表人授权书", "投标承诺书"] },
          "template_source": { "type": "string", "enum": ["buyer_template", "company_template", "none"] },
          "status": { "type": "string", "enum": ["ready", "drafted", "missing"], "x-label": {"ready": "已齐备", "drafted": "已生成待确认", "missing": "缺失"} },
          "file": { "$ref": "common.schema.json#/$defs/FileRef" }
        }
      }
    },
    "technical_docs": {
      "type": "array", "description": "B 主要消费 kind = technical_agreement / technical_spec；doc_id 已入 tender_docs 集合，可直接 core.search",
      "items": {
        "type": "object", "additionalProperties": false, "required": ["kind", "file"],
        "properties": {
          "kind": {
            "type": "string", "enum": ["tender_document", "technical_agreement", "technical_spec", "drawing", "other"],
            "x-label": {"tender_document": "招标文件", "technical_agreement": "技术协议", "technical_spec": "技术规格书", "drawing": "图纸", "other": "其他"}
          },
          "file": { "$ref": "common.schema.json#/$defs/FileRef" },
          "doc_id": { "type": "string", "pattern": "^doc_[0-9A-HJKMNP-TV-Z]{26}$" }
        }
      }
    },
    "due_diligence": {
      "type": "object", "additionalProperties": false, "required": ["risk_level", "risk_score", "rules_version"],
      "properties": {
        "report_file": { "$ref": "common.schema.json#/$defs/FileRef" },
        "risk_score": { "type": "integer", "minimum": 0, "maximum": 100, "description": "确定性规则计算，不由大模型给分" },
        "risk_level": { "type": "string", "enum": ["low", "medium", "high"], "x-label": {"low": "低", "medium": "中", "high": "高"} },
        "rules_version": { "type": "string" },
        "claims": { "type": "array", "items": { "$ref": "claim.schema.json" } }
      }
    },
    "owner": { "$ref": "common.schema.json#/$defs/Person" },
    "opportunity_id": { "type": "string", "pattern": "^opp_[0-9A-HJKMNP-TV-Z]{26}$" },
    "status": {
      "type": "string", "enum": ["discovered", "qualified", "preparing", "submitted", "abandoned"],
      "x-label": {"discovered": "新发现", "qualified": "已研判", "preparing": "准备材料", "submitted": "已投标", "abandoned": "放弃"}
    },
    "review_id": { "type": "string", "pattern": "^rv_[0-9A-HJKMNP-TV-Z]{26}$" }
  },
  "unevaluatedProperties": false
}
```

示例：

```json
{
  "id": "tp_01JDWHTP0000000000000000A1", "schema_version": "1.0", "version": 3,
  "chain_id": "chain_01JDWHCH0000000000000000A1",
  "created_by": {"app": "bid", "user_id": "sales01", "run_id": "run_01JDWHRN0000000000000000A1"},
  "created_at": "2026-11-20T09:40:00+08:00", "updated_at": "2026-11-20T10:01:30+08:00",
  "sensitivity": "internal", "demo_data": true, "lineage": [], "tags": ["中东", "港口"],
  "tender_no": "DEMO-SA-2026-0117",
  "title": "（模拟）某港务公司 2 台 40t 轨道式集装箱门式起重机采购",
  "buyer": {"name": "海湾港务（模拟）有限公司", "country": "SA", "industry": "港口",
            "contact": {"name": "Ahmed（模拟）", "role": "客户采购", "email": "buyer@example.com"}},
  "market": {"country": "SA", "region": "中东"},
  "source": {"platform": "UNGM", "url": "https://www.ungm.org/Public/Notice/000000",
             "published_at": "2026-11-12T08:00:00+03:00", "fetched_at": "2026-11-20T09:35:12+08:00",
             "language": "en", "cached": true},
  "deadlines": {"clarification_until": "2026-12-01T17:00:00+03:00",
                "bid_submission_at": "2026-12-15T12:00:00+03:00", "timezone": "Asia/Riyadh"},
  "products": [{"category": "port_crane", "series": "RMG", "capacity_t": 40, "span_m": 30,
                "lifting_height_m": 18.2, "work_class": "A7", "quantity": 2}],
  "qualification_requirements": [
    {"req_id": "q_01", "text": "Manufacturer shall provide ISO 9001 certificate valid at bid date.",
     "category": "certification", "mandatory": true, "status": "met",
     "matched_materials": [{"name": "ISO 9001 证书（模拟）", "valid_until": "2027-06-30"}]}
  ],
  "required_documents": [
    {"doc_key": "authorization_letter", "name": "法定代表人授权书", "template_source": "buyer_template", "status": "drafted"}
  ],
  "technical_docs": [
    {"kind": "technical_agreement",
     "file": {"file_id": "f_01JDWHFE0000000000000000A1", "name": "Technical_Specification_RMG.pdf",
              "mime": "application/pdf", "path": "objects/tp_01JDWHTP0000000000000000A1/Technical_Specification_RMG.pdf"},
     "doc_id": "doc_01JDWHDC0000000000000000A1"}
  ],
  "due_diligence": {"risk_score": 28, "risk_level": "low", "rules_version": "BID-DD v1.0", "claims": []},
  "owner": {"user_id": "sales01", "name": "业务员·演示 A", "role": "sales", "feishu_open_id": "ou_demo_sales01"},
  "opportunity_id": "opp_01JDWHPP0000000000000000A1",
  "status": "preparing"
}
```

#### 7.3.3 `opportunity.schema.json`（A → C）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/opportunity.schema.json",
  "title": "Opportunity 商机",
  "description": "A 创建，C 跟进（C 只能改 stage、milestones[*].status / done_at、risks、next_action、loss_reason、feishu）。",
  "type": "object",
  "allOf": [{ "$ref": "common.schema.json#/$defs/Envelope" }],
  "required": ["name", "customer", "region", "owner", "stage", "milestones"],
  "properties": {
    "id": { "type": "string", "pattern": "^opp_[0-9A-HJKMNP-TV-Z]{26}$" },
    "name": { "type": "string", "maxLength": 200, "description": "建议「客户简称 + 产品 + 数量」" },
    "customer": { "$ref": "common.schema.json#/$defs/Party" },
    "region": {
      "type": "object", "additionalProperties": false, "required": ["country"],
      "properties": {
        "country": { "type": "string", "pattern": "^[A-Z]{2}$" },
        "province": { "type": "string" },
        "city": { "type": "string" },
        "war_zone": { "type": "string" }
      }
    },
    "owner": { "$ref": "common.schema.json#/$defs/Person", "description": "负责人，有 feishu_open_id 才能被 C @" },
    "team": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Person" } },
    "stage": {
      "type": "string", "enum": ["lead", "registering", "bidding", "negotiating", "won", "lost", "signed"],
      "x-label": {"lead": "线索", "registering": "报名", "bidding": "投标", "negotiating": "议标", "won": "中标", "lost": "丢单", "signed": "签约"}
    },
    "milestones": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Milestone" } },
    "products": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/ProductSpec" } },
    "estimated_amount": { "$ref": "common.schema.json#/$defs/Money" },
    "tender_package_id": { "type": "string", "pattern": "^tp_[0-9A-HJKMNP-TV-Z]{26}$" },
    "quote_result_ids": { "type": "array", "items": { "type": "string", "pattern": "^qr_[0-9A-HJKMNP-TV-Z]{26}$" } },
    "risks": { "type": "array", "items": { "$ref": "claim.schema.json" } },
    "next_action": {
      "type": "object", "additionalProperties": false, "required": ["text"],
      "properties": {
        "text": { "type": "string", "maxLength": 300 },
        "due_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "owner": { "$ref": "common.schema.json#/$defs/Person" }
      }
    },
    "loss_reason": {
      "type": "object", "additionalProperties": false, "required": ["category"],
      "properties": {
        "category": {
          "type": "string", "enum": ["price", "technical", "delivery", "relationship", "qualification", "other"],
          "x-label": {"price": "价格", "technical": "技术", "delivery": "交期", "relationship": "客户关系", "qualification": "资质", "other": "其他"}
        },
        "text": { "type": "string", "maxLength": 1000 }
      }
    },
    "feishu": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "base_app_token": { "type": "string" },
        "table_id": { "type": "string" },
        "record_id": { "type": "string" },
        "chat_id": { "type": "string", "pattern": "^oc_[A-Za-z0-9_]+$" }
      }
    }
  },
  "if": { "properties": { "stage": { "const": "lost" } }, "required": ["stage"] },
  "then": { "required": ["loss_reason"] },
  "unevaluatedProperties": false
}
```

示例：

```json
{
  "id": "opp_01JDWHPP0000000000000000A1", "schema_version": "1.0", "version": 2,
  "chain_id": "chain_01JDWHCH0000000000000000A1",
  "created_by": {"app": "bid", "user_id": "sales01"},
  "created_at": "2026-11-20T09:41:00+08:00", "updated_at": "2026-11-20T11:20:00+08:00",
  "sensitivity": "internal", "demo_data": true,
  "lineage": [{"type": "tender_package", "id": "tp_01JDWHTP0000000000000000A1"}],
  "name": "海湾港务 RMG 40t × 2",
  "customer": {"name": "海湾港务（模拟）有限公司", "country": "SA", "industry": "港口"},
  "region": {"country": "SA", "city": "Dammam"},
  "owner": {"user_id": "sales01", "name": "业务员·演示 A", "role": "sales", "feishu_open_id": "ou_demo_sales01"},
  "stage": "bidding",
  "milestones": [
    {"key": "clarification_deadline", "name": "澄清截止", "due_at": "2026-12-01T17:00:00+03:00",
     "status": "pending", "source": "tender_package", "remind_before_hours": 48,
     "source_ref": {"type": "tender_package", "id": "tp_01JDWHTP0000000000000000A1"}},
    {"key": "bid_submission", "name": "投标截止", "due_at": "2026-12-15T12:00:00+03:00",
     "status": "pending", "source": "tender_package"}
  ],
  "tender_package_id": "tp_01JDWHTP0000000000000000A1",
  "quote_result_ids": ["qr_01JDWHQR0000000000000000A1"],
  "next_action": {"text": "确认报价单里的 2 处高风险条款", "due_at": "2026-11-22T18:00:00+08:00"},
  "feishu": {"base_app_token": "bascnDEMO", "table_id": "tblDEMO", "record_id": "recDEMO01", "chat_id": "oc_demo_project"}
}
```

#### 7.3.4 `quote-result.schema.json`（B → C）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/quote-result.schema.json",
  "title": "QuoteResult 报价结果",
  "description": "B 报价智能体产出。只放 C 和下游需要的结论；B 内部逐条款完整分析不在这里。",
  "type": "object",
  "allOf": [
    { "$ref": "common.schema.json#/$defs/Envelope" },
    { "if": { "properties": { "status": { "const": "confirmed" } }, "required": ["status"] },
      "then": { "required": ["confirmer", "confirmed_at", "review_id"] } }
  ],
  "required": ["quote_no", "customer", "product", "agreement", "summary", "non_standard_items", "risk_items", "status", "milestones"],
  "properties": {
    "id": { "type": "string", "pattern": "^qr_[0-9A-HJKMNP-TV-Z]{26}$" },
    "quote_no": { "type": "string", "maxLength": 60, "examples": ["BJ-DEMO-20261120-001"] },
    "tender_package_id": { "type": "string", "pattern": "^tp_[0-9A-HJKMNP-TV-Z]{26}$" },
    "opportunity_id": { "type": "string", "pattern": "^opp_[0-9A-HJKMNP-TV-Z]{26}$" },
    "customer": { "$ref": "common.schema.json#/$defs/Party" },
    "product": { "$ref": "common.schema.json#/$defs/ProductSpec" },
    "agreement": {
      "type": "object", "additionalProperties": false, "required": ["file", "doc_id"],
      "properties": {
        "title": { "type": "string" },
        "file": { "$ref": "common.schema.json#/$defs/FileRef" },
        "doc_id": { "type": "string", "pattern": "^doc_[0-9A-HJKMNP-TV-Z]{26}$" },
        "received_at": { "$ref": "common.schema.json#/$defs/DateTime" }
      }
    },
    "summary": {
      "type": "object", "additionalProperties": false,
      "required": ["clause_count", "standard_count", "non_standard_count", "ambiguous_count", "unsatisfied_count", "deviable_count", "high_risk_count"],
      "properties": {
        "clause_count": { "type": "integer", "minimum": 0 },
        "standard_count": { "type": "integer", "minimum": 0 },
        "non_standard_count": { "type": "integer", "minimum": 0 },
        "ambiguous_count": { "type": "integer", "minimum": 0 },
        "unsatisfied_count": { "type": "integer", "minimum": 0 },
        "deviable_count": { "type": "integer", "minimum": 0 },
        "high_risk_count": { "type": "integer", "minimum": 0 }
      }
    },
    "non_standard_items": {
      "type": "array", "description": "label ≠ 标配 的条款（标配条款只计数，不列出）",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["item_id", "clause_ref", "category", "label", "requirement_text", "decided_by", "claim", "price_impact", "handling"],
        "properties": {
          "item_id": { "type": "string", "pattern": "^ns_\\d{2,4}$" },
          "clause_ref": {
            "type": "object", "additionalProperties": false, "required": ["clause_no"],
            "properties": {
              "clause_no": { "type": "string", "examples": ["3.2.1"] },
              "page": { "type": "integer", "minimum": 1 },
              "locator": { "$ref": "common.schema.json#/$defs/Locator" }
            }
          },
          "category": {
            "type": "string",
            "enum": ["steel_plate", "paint", "motor", "reducer", "electrical", "structure", "safety_device", "wheel_rail", "hook_rope", "control_system", "other"],
            "x-label": {"steel_plate": "板材", "paint": "油漆", "motor": "电机", "reducer": "减速机", "electrical": "电器", "structure": "钢结构", "safety_device": "安全装置", "wheel_rail": "车轮轨道", "hook_rope": "吊钩钢丝绳", "control_system": "控制系统", "other": "其他"}
          },
          "label": {
            "type": "string", "enum": ["non_standard", "ambiguous", "unsatisfied", "deviable"],
            "x-label": {"non_standard": "非标", "ambiguous": "模糊", "unsatisfied": "不满足", "deviable": "可偏离"},
            "description": "五类判定去掉「标配 standard」后的四类"
          },
          "requirement_text": { "type": "string", "maxLength": 2000, "description": "客户协议原文要求" },
          "standard_spec": { "type": "string", "maxLength": 1000, "description": "卫华标配是什么（来自标配库）" },
          "decided_by": { "type": "string", "enum": ["rule", "llm", "human"], "x-label": {"rule": "规则判定", "llm": "AI 判定", "human": "人工判定"} },
          "rule_id": { "type": "string" },
          "claim": { "$ref": "claim.schema.json" },
          "price_impact": {
            "type": "object", "additionalProperties": false, "required": ["type"],
            "properties": {
              "type": { "type": "string", "enum": ["add", "reduce", "none", "unknown"], "x-label": {"add": "需加价", "reduce": "可降价", "none": "不影响", "unknown": "待核算"} },
              "basis": { "type": "string", "maxLength": 500, "description": "加价依据，如「加价标准 3.2 条」" },
              "amount": { "$ref": "common.schema.json#/$defs/Money" }
            }
          },
          "handling": {
            "type": "string", "enum": ["accept_with_addon", "propose_deviation", "clarify_with_customer", "reject"],
            "x-label": {"accept_with_addon": "接受并加价", "propose_deviation": "提出偏离", "clarify_with_customer": "需与客户澄清", "reject": "不接受"}
          },
          "confirmed": { "type": "boolean", "default": false }
        },
        "if": { "properties": { "decided_by": { "const": "rule" } } },
        "then": { "required": ["rule_id"] }
      }
    },
    "risk_items": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false, "required": ["risk_id", "type", "level", "text", "claim"],
        "properties": {
          "risk_id": { "type": "string", "pattern": "^rk_\\d{2,4}$" },
          "type": {
            "type": "string", "enum": ["penalty", "warranty", "acceptance", "payment", "delivery", "liability", "ip", "other"],
            "x-label": {"penalty": "罚则", "warranty": "质保", "acceptance": "验收", "payment": "付款", "delivery": "交期", "liability": "责任", "ip": "知识产权", "other": "其他"}
          },
          "level": { "type": "string", "enum": ["high", "medium", "low"], "x-label": {"high": "高", "medium": "中", "low": "低"} },
          "clause_ref": {
            "type": "object", "additionalProperties": false, "required": ["clause_no"],
            "properties": { "clause_no": { "type": "string" }, "page": { "type": "integer", "minimum": 1 } }
          },
          "text": { "type": "string", "maxLength": 1000 },
          "suggestion": { "type": "string", "maxLength": 1000 },
          "claim": { "$ref": "claim.schema.json" }
        }
      }
    },
    "deviation_table": { "$ref": "common.schema.json#/$defs/FileRef", "description": "《协议风险提示及技术偏离表》" },
    "price": {
      "type": "object", "additionalProperties": false, "required": ["total"],
      "description": "可选；演示用模拟价；字段级脱敏 AMOUNT",
      "properties": {
        "total": { "$ref": "common.schema.json#/$defs/Money" },
        "standard_part": { "$ref": "common.schema.json#/$defs/Money" },
        "non_standard_addon": { "$ref": "common.schema.json#/$defs/Money" }
      }
    },
    "confirmer": { "$ref": "common.schema.json#/$defs/Person", "description": "确认人（报价员），C 会 @ 他" },
    "confirmed_at": { "$ref": "common.schema.json#/$defs/DateTime" },
    "review_id": { "type": "string", "pattern": "^rv_[0-9A-HJKMNP-TV-Z]{26}$" },
    "status": {
      "type": "string", "enum": ["draft", "pending_review", "confirmed", "rejected"],
      "x-label": {"draft": "草稿", "pending_review": "待确认", "confirmed": "已确认", "rejected": "已驳回"}
    },
    "milestones": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/Milestone" }, "description": "如技术澄清回复截止、报价提交截止" },
    "knowledge_entry_ids": { "type": "array", "items": { "type": "string" }, "description": "本次沉淀的知识条目（B 内部 ID）" }
  },
  "unevaluatedProperties": false
}
```

示例：

```json
{
  "id": "qr_01JDWHQR0000000000000000A1", "schema_version": "1.0", "version": 4,
  "chain_id": "chain_01JDWHCH0000000000000000A1",
  "created_by": {"app": "quote", "user_id": "quoter01", "run_id": "run_01JDWHRN0000000000000000A2"},
  "created_at": "2026-11-20T10:10:00+08:00", "updated_at": "2026-11-20T10:31:00+08:00",
  "sensitivity": "confidential", "demo_data": true,
  "lineage": [{"type": "tender_package", "id": "tp_01JDWHTP0000000000000000A1"}],
  "redaction": {"status": "restored", "session_id": "ses_01JDWHSE0000000000000000A1", "count": 9, "types": ["CUSTOMER", "PERSON", "AMOUNT"]},
  "quote_no": "BJ-DEMO-20261120-001",
  "tender_package_id": "tp_01JDWHTP0000000000000000A1",
  "opportunity_id": "opp_01JDWHPP0000000000000000A1",
  "customer": {"name": "海湾港务（模拟）有限公司", "country": "SA"},
  "product": {"category": "port_crane", "series": "RMG", "capacity_t": 40, "span_m": 30, "work_class": "A7", "quantity": 2},
  "agreement": {"title": "Technical Specification RMG", "doc_id": "doc_01JDWHDC0000000000000000A1",
                "file": {"file_id": "f_01JDWHFE0000000000000000A1", "name": "Technical_Specification_RMG.pdf", "mime": "application/pdf",
                         "path": "objects/tp_01JDWHTP0000000000000000A1/Technical_Specification_RMG.pdf"}},
  "summary": {"clause_count": 86, "standard_count": 74, "non_standard_count": 6, "ambiguous_count": 3,
              "unsatisfied_count": 1, "deviable_count": 2, "high_risk_count": 2},
  "non_standard_items": [
    {"item_id": "ns_01", "clause_ref": {"clause_no": "5.3.2", "page": 14, "locator": {"kind": "clause", "value": "5.3.2"}},
     "category": "motor", "label": "non_standard",
     "requirement_text": "Hoist motor shall be variable frequency controlled with IP55 protection.",
     "standard_spec": "标配：起升电机绕线电机 + 转子串电阻调速（模拟标配库）",
     "decided_by": "rule", "rule_id": "STD-MOTOR-003",
     "claim": {"text": "起升机构要求变频调速，超出标配", "kind": "judgement",
               "evidence": [{"doc": "doc_01JDWHDC0000000000000000A1", "doc_title": "Technical Specification RMG", "page": 14,
                             "locator": {"kind": "clause", "value": "5.3.2"},
                             "quote": "Hoist motor shall be variable frequency controlled"}],
               "confidence": 1.0, "decided_by": "rule", "rule_id": "STD-MOTOR-003",
               "verification": {"status": "rule_decided", "method": "rule", "checked_at": "2026-11-20T10:12:00+08:00"}},
     "price_impact": {"type": "add", "basis": "加价标准（模拟）第 3.2 条：变频调速按起升功率加价"},
     "handling": "accept_with_addon", "confirmed": true}
  ],
  "risk_items": [
    {"risk_id": "rk_01", "type": "penalty", "level": "high", "clause_ref": {"clause_no": "12.4", "page": 31},
     "text": "逾期交货每天罚合同总价 0.5%，上限 20%", "suggestion": "建议争取 0.1%/天、上限 5%",
     "claim": {"text": "逾期罚则比例高于常见水平", "kind": "risk",
               "evidence": [{"doc": "doc_01JDWHDC0000000000000000A1", "page": 31, "locator": {"kind": "clause", "value": "12.4"},
                             "quote": "0.5% of the contract price per day"}],
               "confidence": 0.82, "decided_by": "llm",
               "verification": {"status": "verified", "method": "quote_match", "checked_at": "2026-11-20T10:13:00+08:00"}}}
  ],
  "confirmer": {"user_id": "quoter01", "name": "报价员·演示 B", "role": "quoter", "feishu_open_id": "ou_demo_quoter01"},
  "confirmed_at": "2026-11-20T10:30:00+08:00",
  "review_id": "rv_01JDWHRV0000000000000000A1",
  "status": "confirmed",
  "milestones": [
    {"key": "technical_clarification", "name": "向客户提交技术澄清", "due_at": "2026-11-28T18:00:00+08:00",
     "owner": {"user_id": "quoter01", "name": "报价员·演示 B", "feishu_open_id": "ou_demo_quoter01"},
     "status": "pending", "source": "quote_result", "source_ref": {"type": "quote_result", "id": "qr_01JDWHQR0000000000000000A1"}}
  ]
}
```

#### 7.3.5 `media-asset.schema.json`（D → E）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/media-asset.schema.json",
  "title": "MediaAsset 媒体素材",
  "description": "D 产出（交互页、录屏、效果图、3D 模型），E 消费；E 的成片也用它（kind = video_clip）。",
  "type": "object",
  "allOf": [
    { "$ref": "common.schema.json#/$defs/Envelope" },
    { "if": { "properties": { "kind": { "const": "interactive_page" } }, "required": ["kind"] }, "then": { "required": ["url"] } },
    { "if": { "properties": { "kind": { "const": "site_composite" } }, "required": ["kind"] }, "then": { "required": ["site"] } }
  ],
  "required": ["kind", "title", "product", "file", "media", "rights"],
  "properties": {
    "id": { "type": "string", "pattern": "^ma_[0-9A-HJKMNP-TV-Z]{26}$" },
    "kind": {
      "type": "string",
      "enum": ["interactive_page", "interactive_page_recording", "rendered_image", "site_composite", "model_3d", "photo", "video_clip", "ip_character", "audio"],
      "x-label": {"interactive_page": "交互页", "interactive_page_recording": "交互页录屏", "rendered_image": "效果图", "site_composite": "现场合成图", "model_3d": "3D 模型", "photo": "实拍照片", "video_clip": "视频片段 / 成片", "ip_character": "IP 形象", "audio": "音频"}
    },
    "title": { "type": "string", "maxLength": 120 },
    "caption": { "type": "string", "maxLength": 500 },
    "product": { "$ref": "common.schema.json#/$defs/ProductSpec", "description": "与产品无关的素材填 category = other" },
    "selling_points": {
      "type": "array", "maxItems": 10,
      "items": {
        "type": "object", "additionalProperties": false, "required": ["text"],
        "properties": {
          "text": { "type": "string", "maxLength": 120, "examples": ["整机高 166.5 米"] },
          "claim": { "$ref": "claim.schema.json", "description": "参数类卖点必须带出处（官方报道）" }
        }
      }
    },
    "file": { "$ref": "common.schema.json#/$defs/FileRef", "description": "interactive_page 时为打包后的 HTML 入口文件" },
    "url": { "type": "string", "description": "interactive_page 的访问地址，如 /apps/studio/pages/3800t" },
    "preview": { "$ref": "common.schema.json#/$defs/FileRef", "description": "缩略图" },
    "media": {
      "type": "object", "additionalProperties": false, "required": ["format"],
      "properties": {
        "format": { "type": "string", "enum": ["mp4", "webm", "mov", "png", "jpg", "webp", "glb", "gltf", "html", "mp3", "wav"] },
        "width": { "type": "integer", "minimum": 1 },
        "height": { "type": "integer", "minimum": 1 },
        "duration_s": { "type": "number", "minimum": 0 },
        "fps": { "type": "number", "minimum": 1 },
        "has_alpha": { "type": "boolean" }
      }
    },
    "rights": {
      "type": "object", "additionalProperties": false, "required": ["source", "authorized"],
      "properties": {
        "source": {
          "type": "string", "enum": ["self_shot", "official_public", "ai_generated", "customer_provided", "stock", "internal_provided"],
          "x-label": {"self_shot": "自己拍摄", "official_public": "官方公开", "ai_generated": "AI 生成", "customer_provided": "客户提供", "stock": "素材库", "internal_provided": "主办方提供"}
        },
        "authorized": { "type": "boolean", "description": "false 时 E 不得用于对外发布" },
        "license": { "type": "string" },
        "attribution": { "type": "string" },
        "note": { "type": "string" }
      }
    },
    "generation": {
      "type": "object", "additionalProperties": false, "required": ["tool"],
      "properties": {
        "tool": { "type": "string", "enum": ["anatomy", "tripo", "nano_banana", "threejs", "remotion", "chatcut", "other"] },
        "prompt": { "type": "string", "maxLength": 4000 },
        "reference_files": { "type": "array", "items": { "$ref": "common.schema.json#/$defs/FileRef" } }
      }
    },
    "site": {
      "type": "object", "additionalProperties": false, "required": ["photo_source", "contains_customer_info"],
      "description": "仅 site_composite：现场照片来源与隐私",
      "properties": {
        "photo_source": { "type": "string", "enum": ["self_shot", "public", "customer"] },
        "contains_customer_info": { "type": "boolean" }
      }
    },
    "storyboard_hint": {
      "type": "object", "additionalProperties": false,
      "description": "给 E 选镜头用",
      "properties": {
        "scene": {
          "type": "string", "enum": ["opening", "process_detail", "lifting", "spec_highlight", "brand_closing"],
          "x-label": {"opening": "开场大场面", "process_detail": "工艺细节", "lifting": "吊装作业", "spec_highlight": "参数卖点", "brand_closing": "品牌收尾"}
        },
        "suggested_duration_s": { "type": "number", "minimum": 0 }
      }
    }
  },
  "unevaluatedProperties": false
}
```

示例：

```json
{
  "id": "ma_01JDWHMA0000000000000000A1", "schema_version": "1.0", "version": 1,
  "chain_id": "chain_01JDWHCH0000000000000000B1",
  "created_by": {"app": "studio", "user_id": "brand01"},
  "created_at": "2026-11-20T14:00:00+08:00", "updated_at": "2026-11-20T14:00:00+08:00",
  "sensitivity": "public", "demo_data": false,
  "kind": "interactive_page_recording",
  "title": "3800t-107m 门机拆解科普（录屏）",
  "product": {"category": "gantry_crane", "series": "MG", "model": "MG 3800t-107m", "name": "3800t-107m 双主梁门式起重机",
              "capacity_t": 3800, "span_m": 107, "lifting_height_m": 130, "overall_height_m": 166.5},
  "selling_points": [
    {"text": "整机高 166.5 米，起升高度 130 米",
     "claim": {"text": "3800t-107m 门机整机高 166.5 m，起升高度 130 m", "kind": "fact",
               "evidence": [{"doc": "ext", "page": null, "url": "https://www.cranewh.com/detail/5679.html",
                             "locator": {"kind": "url", "value": "https://www.cranewh.com/detail/5679.html"}}],
               "confidence": 0.95, "decided_by": "human",
               "verification": {"status": "human_confirmed", "method": "human", "checked_at": "2026-11-20T13:50:00+08:00"}}}
  ],
  "file": {"file_id": "f_01JDWHFE0000000000000000B1", "name": "3800t_anatomy.mp4", "mime": "video/mp4",
           "path": "objects/ma_01JDWHMA0000000000000000A1/3800t_anatomy.mp4"},
  "media": {"format": "mp4", "width": 1920, "height": 1080, "duration_s": 24.0, "fps": 30},
  "rights": {"source": "ai_generated", "authorized": true, "note": "交互页由 anatomy 改造生成，保留其开源许可"},
  "generation": {"tool": "anatomy"},
  "storyboard_hint": {"scene": "spec_highlight", "suggested_duration_s": 6}
}
```

> 参数（166.5 m、130 m）以调研报告引用的官网报道为准，D 的 PRD 落地前再核对一次原文。

#### 7.3.6 `article.schema.json`（E → 公众号）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/article.schema.json",
  "title": "Article 推文",
  "description": "E 产出。长度限制沿用 feishu-towechat 的公众号草稿不变量：标题 32 字、作者 16 字、摘要 120 字、正文 < 20000 字。",
  "type": "object",
  "allOf": [
    { "$ref": "common.schema.json#/$defs/Envelope" },
    { "if": { "properties": { "status": { "enum": ["approved", "draft_synced", "published"] } }, "required": ["status"] }, "then": { "required": ["review_id"] } },
    { "if": { "properties": { "status": { "enum": ["draft_synced", "published"] } }, "required": ["status"] }, "then": { "required": ["wechat"] } }
  ],
  "required": ["title", "author", "digest", "content_markdown", "cover", "channel", "status"],
  "properties": {
    "id": { "type": "string", "pattern": "^art_[0-9A-HJKMNP-TV-Z]{26}$" },
    "title": { "type": "string", "minLength": 1, "maxLength": 32 },
    "author": { "type": "string", "minLength": 1, "maxLength": 16 },
    "digest": { "type": "string", "maxLength": 120 },
    "content_markdown": { "type": "string", "minLength": 1, "maxLength": 19999 },
    "content_html": { "type": "string", "description": "渲染后 HTML（可选，由 feishu-towechat 生成）" },
    "cover": { "$ref": "common.schema.json#/$defs/FileRef", "description": "封面：PNG / JPEG，≤ 10 MB" },
    "images": {
      "type": "array", "maxItems": 30,
      "items": {
        "type": "object", "additionalProperties": false, "required": ["file"],
        "properties": {
          "file": { "$ref": "common.schema.json#/$defs/FileRef", "description": "正文图：JPG / PNG，< 1 MB" },
          "caption": { "type": "string", "maxLength": 100 },
          "alt": { "type": "string", "maxLength": 100 },
          "media_asset_id": { "type": "string", "pattern": "^ma_[0-9A-HJKMNP-TV-Z]{26}$" }
        }
      }
    },
    "video_asset_id": { "type": "string", "pattern": "^ma_[0-9A-HJKMNP-TV-Z]{26}$", "description": "配套成片" },
    "source_asset_ids": { "type": "array", "items": { "type": "string", "pattern": "^ma_[0-9A-HJKMNP-TV-Z]{26}$" } },
    "claims": { "type": "array", "items": { "$ref": "claim.schema.json" }, "description": "正文里的事实性表述（参数、荣誉、数据）及出处" },
    "channel": { "type": "string", "enum": ["wechat_mp", "feishu_doc"], "x-label": {"wechat_mp": "微信公众号", "feishu_doc": "飞书文档"} },
    "status": {
      "type": "string", "enum": ["draft", "pending_review", "approved", "draft_synced", "published"],
      "x-label": {"draft": "草稿", "pending_review": "待审核", "approved": "已审核", "draft_synced": "已同步到公众号草稿箱", "published": "已人工发布"}
    },
    "review_id": { "type": "string", "pattern": "^rv_[0-9A-HJKMNP-TV-Z]{26}$" },
    "feishu_doc": {
      "type": "object", "additionalProperties": false, "required": ["doc_token", "url"],
      "properties": { "doc_token": { "type": "string" }, "url": { "type": "string", "format": "uri" } }
    },
    "wechat": {
      "type": "object", "additionalProperties": false, "required": ["draft_media_id", "verified"],
      "properties": {
        "draft_media_id": { "type": "string" },
        "verified": { "type": "boolean", "description": "只有草稿回读校验一致才为 true" },
        "synced_at": { "$ref": "common.schema.json#/$defs/DateTime" }
      }
    }
  },
  "unevaluatedProperties": false
}
```

示例：

```json
{
  "id": "art_01JDWHAR0000000000000000A1", "schema_version": "1.0", "version": 2,
  "chain_id": "chain_01JDWHCH0000000000000000B1",
  "created_by": {"app": "video", "user_id": "brand01"},
  "created_at": "2026-11-20T15:20:00+08:00", "updated_at": "2026-11-20T15:40:00+08:00",
  "sensitivity": "public", "demo_data": true,
  "lineage": [{"type": "media_asset", "id": "ma_01JDWHMA0000000000000000A1"}],
  "title": "166.5 米高的「钢铁巨人」是怎么立起来的",
  "author": "卫华 AI 工作台",
  "digest": "3800t-107m 双主梁门式起重机，大卫小华带你看懂它的结构。",
  "content_markdown": "## 一台门机有多高\n\n整机高 166.5 米……",
  "cover": {"file_id": "f_01JDWHFE0000000000000000C1", "name": "cover.png", "mime": "image/png",
            "path": "objects/art_01JDWHAR0000000000000000A1/cover.png"},
  "video_asset_id": "ma_01JDWHMA0000000000000000A2",
  "source_asset_ids": ["ma_01JDWHMA0000000000000000A1"],
  "claims": [],
  "channel": "wechat_mp",
  "status": "approved",
  "review_id": "rv_01JDWHRV0000000000000000B1",
  "feishu_doc": {"doc_token": "doxcnDEMO", "url": "https://example.feishu.cn/docx/doxcnDEMO"}
}
```

#### 7.3.7 `claim.schema.json`（所有作品）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://weihua-ai.local/schemas/claim.schema.json",
  "title": "Claim 结论及出处",
  "description": "所有 AI 结论的统一结构：{text, evidence:[Source], confidence} + 判定来源和校验状态。可嵌在其他对象里（不带 Envelope），也可单独存（POST /v1/objects/claim，底座补齐 Envelope 并存在 objects 表）。",
  "type": "object",
  "required": ["text", "evidence", "confidence"],
  "properties": {
    "id": { "type": "string", "pattern": "^clm_[0-9A-HJKMNP-TV-Z]{26}$" },
    "text": { "type": "string", "minLength": 1, "maxLength": 2000 },
    "evidence": {
      "type": "array", "maxItems": 10,
      "items": { "$ref": "common.schema.json#/$defs/Source" },
      "description": "可为空数组，此时 verification.status 只能是 no_evidence / human_confirmed / rule_decided"
    },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1, "description": "规则判定固定 1.0；界面：≥0.8 高、0.5–0.8 中、<0.5 低" },
    "kind": {
      "type": "string", "enum": ["fact", "judgement", "risk", "recommendation"],
      "x-label": {"fact": "事实", "judgement": "判断", "risk": "风险", "recommendation": "建议"}
    },
    "decided_by": { "type": "string", "enum": ["llm", "rule", "human"], "default": "llm" },
    "rule_id": { "type": "string" },
    "rules_version": { "type": "string" },
    "verification": {
      "type": "object", "additionalProperties": false, "required": ["status"],
      "properties": {
        "status": {
          "type": "string", "enum": ["verified", "no_evidence", "quote_mismatch", "human_confirmed", "rule_decided"],
          "x-label": {"verified": "有出处", "no_evidence": "无出处", "quote_mismatch": "出处不符", "human_confirmed": "人工确认", "rule_decided": "规则判定"}
        },
        "method": { "type": "string", "enum": ["quote_match", "rule", "human"] },
        "checked_at": { "$ref": "common.schema.json#/$defs/DateTime" },
        "detail": { "type": "string", "maxLength": 500 }
      }
    },
    "review_id": { "type": "string", "pattern": "^rv_[0-9A-HJKMNP-TV-Z]{26}$" },
    "subject_ref": { "$ref": "common.schema.json#/$defs/ObjectRef", "description": "单独存储时，这条结论属于哪个对象" }
  },
  "allOf": [
    { "if": { "properties": { "decided_by": { "const": "rule" } }, "required": ["decided_by"] }, "then": { "required": ["rule_id"] } },
    { "if": { "properties": { "evidence": { "maxItems": 0 } }, "required": ["evidence", "verification"] },
      "then": { "properties": { "verification": { "properties": { "status": { "enum": ["no_evidence", "human_confirmed", "rule_decided"] } } } } } }
  ],
  "additionalProperties": false
}
```

> 单独存储时底座用一个包装 Schema `claim-object = allOf[Envelope, claim]` 校验；嵌入时直接用 `claim.schema.json`，所以这里用 `additionalProperties: false`（嵌入形态不允许信封字段）。

示例（最小形态，正是 `_约定.md` 的三个字段）：

```json
{"text": "该协议要求的工作级别 A7 与所选型号 RMG 40t 一致",
 "evidence": [{"doc": "doc_01JDWHDC0000000000000000A1", "doc_title": "Technical Specification RMG", "page": 6,
               "locator": {"kind": "clause", "value": "2.1"}, "quote": "Classification of the crane: A7"}],
 "confidence": 0.9}
```

### 7.4 底座存储（SQLite `data/core.db`）

| 表 | 主要字段 | 说明 |
|---|---|---|
| `objects` | `id, type, version, chain_id, created_by_app, sensitivity, status, demo_data, body_json, created_at, updated_at, deleted_at` | 6 种对象共表，`body_json` 存完整 JSON，常用字段冗余成列建索引；软删除 |
| `handoffs` | `id, object_type, object_id, from_app, to_app, chain_id, status, note, created_at, accepted_at` | — |
| `runs` / `run_steps` | `run_id, app, pipeline, chain_id, status` / `run_id, step_id, kind, status, model, mode, input_hash, output_ref, locked_fields, escalation_json, error, started_at, ended_at` | — |
| `reviews` | `id, app, item_type, item_ref, title, summary, payload_json, risk_level, assignee_json, editable_fields, status, decided_by, decision_reason, edits_json, created_at, decided_at` | 泛化自 XFusion `Approval` |
| `audit_log` | `audit_id, ts, actor_type, actor_id, app, event_type, object_ref, chain_id, session_id, payload_json, prev_hash, hash` | 只追加，哈希链 |
| `redaction_entries` / `redaction_mappings` | 见 5.4.4 | 原文 AES-GCM 加密 |
| `egress_log` | `id, session_id, app, target_host, model, mode, masked_payload, token_in, token_out, ts` | 7 天滚动删除 |
| `collections` + PPTSight 的 `documents / pages / chunks / facts / pages_fts / chunks_fts` + `chunk_vectors` | — | 检索 |
| `feishu_events` | `event_id, key, chat_id, payload_json, received_at` | 7 天，用于回放 |
| `files` | `file_id, name, mime, size, sha256, path, created_by_app` | 文件在 `data/storage/` |
| `settings` | `key, value_json, updated_by, updated_at` | 模型模式、作品级覆盖等 |

---

## 8. 页面与交互

底座自己的页面只有 6 个；5 个作品的页面在各自 PRD 里定义，都套在同一个外壳里。

| 页面 | 路由 | P0/P1 | 谁用 |
|---|---|---|---|
| 首页（工作台） | `/` | P0 | 所有人 |
| 复核中心 | `/reviews` | P0 | 报价员、经理、品牌专员 |
| 链路视图 | `/chains/{chain_id}` | P0 | 演示者、评委 |
| 知识库 | `/kb` | P0（只读 + 上传） | 管理员 |
| 出域日志抽屉 | 任意页右侧抽屉 | P0 | 所有人 |
| 设置 | `/settings` | P0（模式、脱敏）/ P1（其余） | 管理员 |

### 8.1 首页

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ 卫华 AI 工作台 │ A招投标● B报价●2 C跟进 │ D内容 E视频 │ [☁|☁🛡|🔒] 复核(3) 业务员▾ │
├───────────────────────────────────────────────────────────────────────────────┤
│  营销获客链                                    内容创作链                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     ┌──────────┐  ┌──────────┐       │
│  │A 招投标  │→ │B 报价    │→ │C 飞书跟进│     │D 内容工厂│→ │E 视频    │       │
│  │新标讯 4  │  │待处理 2  │  │临期 1    │     │素材 12   │  │待审 1    │       │
│  └──────────┘  └──────────┘  └──────────┘     └──────────┘  └──────────┘       │
│                                                                               │
│  我的待办（交接 + 复核）                         最近链路                        │
│  · [B] 收到招标包「海湾港务 RMG」  接收 →         chain_…A1  A→B→C  进行中  查看 │
│  · [复核] 报价结果 BJ-DEMO-001   去复核 →         chain_…B1  D→E    已完成  查看 │
│                                                                               │
│  本周数据安全：出域 38 次 · 脱敏 412 项 · 拦截 0 次 · 本地处理 21 次              │
│                                                              (小华) 有什么要帮忙？│
└───────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 复核中心

```text
┌ 复核中心 ──────────────────────────────────────────────────────────────────────┐
│ [待我复核 3] [我发起的] [已处理]          筛选：作品▾ 风险▾                       │
├──────────────────────────────┬────────────────────────────────────────────────┤
│ ● 高 B 报价结果 BJ-DEMO-001  │ 报价结果 BJ-DEMO-001 · 来自 B 报价智能体         │
│   非标 6 · 高风险 2 · 10:31  │ 摘要：86 条，标配 74，非标 6，模糊 3 ……          │
│ ○ 中 A 投标材料包 DEMO-0117  │ ┌ 非标项 ns_01 电机 · 规则判定 🔒 ─────────────┐ │
│ ○ 低 E 推文「166.5 米……」     │ │ 要求：变频调速 IP55  标配：绕线 + 串电阻       │ │
│                              │ │ 处理：[接受并加价 ▾]  出处：第 14 页 5.3.2 ↗  │ │
│                              │ └──────────────────────────────────────────────┘ │
│                              │ 意见：[____________________]                      │
│                              │ [通过] [修改后通过] [驳回]       大卫：高风险项    │
│                              │                                  不能自动通过      │
└──────────────────────────────┴────────────────────────────────────────────────┘
```

- 只有 `editable_fields` 里的字段可改，其余灰显；规则判定字段显示 🔒，人工修改时要求填理由（审计 `lock_overridden`）。
- 「修改后通过」把改动作为 JSON Patch 写入 `edits`，作品回调里拿到。

### 8.3 链路视图（30 秒串联演示的主画面）

```text
┌ 链路 chain_01JDWHCH…A1 · 海湾港务 RMG 40t × 2 ──────────────── [回放] [导出审计] ┐
│                                                                               │
│  A 招投标助手            B 报价智能体             C 飞书跟进助手                  │
│  ┌──────────────┐ 交接  ┌──────────────┐ 交接   ┌──────────────┐               │
│  │TenderPackage │──────▶│QuoteResult   │───────▶│Opportunity   │               │
│  │v3 · 09:40    │ 09:42 │v4 · 已确认✔  │ 10:31  │投标中 · 节点2│               │
│  └──────────────┘       └──────────────┘        └──────────────┘               │
│   背调 低风险            非标 6 · 高风险 2         飞书已 @ 报价员                 │
│   🛡 脱敏 4 项            🔒 本地处理              🛡 脱敏 7 项                    │
│                                                                               │
│  时间线（审计，按 chain_id）                                                    │
│  09:40 bid  object_created   TenderPackage                                     │
│  09:42 bid  handoff_created  → quote                                           │
│  10:12 quote rule_decided    STD-MOTOR-003                                     │
│  10:30 quoter01 review_approved                                                │
│  10:31 follow feishu_sent    @报价员·演示 B                                     │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 8.4 知识库

集合列表（8 个预置集合，显示文档数、敏感度、是否 `force_local`）→ 文档列表 → 页面预览；支持上传 PDF / PPTX / DOCX / XLSX，上传后后台建索引，完成后大卫提示「已入库，可检索」。顶部搜索框直接调 `core.search`，用于答辩时现场演示「能查到、有出处」。

### 8.5 出域日志抽屉

```text
┌ 云端看到了什么 · 本会话 ───────────────────────── ✕ ┐
│ 模式：☁🛡 云端·已脱敏    出域 3 次    脱敏 12 项     │
│ ─────────────────────────────────────────────────── │
│ 10:11:02  → api.anthropic.com  claude-sonnet-5-5     │
│ 本地原文                     │ 云端收到              │
│ 海湾港务（模拟）有限公司 要求…│ 【客户_01】要求…      │
│ 联系人 Ahmed（模拟）…          │ 联系人【人名_01】…    │
│ ─────────────────────────────────────────────────── │
│ [清空本会话映射]                    [导出出域记录]   │
└──────────────────────────────────────────────────────┘
```

本地原文一栏只在外壳登录态下通过 `reveal=true` 获取；本地模式下抽屉显示「🔒 本会话 0 次出域」。

### 8.6 设置

| 分区 | 内容 | P0/P1 |
|---|---|---|
| 模型 | 当前模式、作品级覆盖、云端 / 本地模型名与连通性测试 | P0 |
| 脱敏 | 类型开关、词典上传、白名单、清空映射 | P0 |
| 飞书 | lark-cli 登录状态、白名单群 / 表、`auto_approve` 测试群 | P0（只读状态）/ P1（编辑） |
| 审计 | 哈希链校验按钮（调 `/v1/audit/verify`） | P0 |
| 外观 | 主题色、大卫小华形象替换 | P1 |

---

## 9. 演示脚本

底座不单独参赛，所以没有自己的 3 分钟脚本。这一节写两件事：底座在每个作品演示里怎么露面；最后 30 秒串联由底座负责什么。

### 9.1 底座在各作品演示里的露面点

每个作品**最多花 10–15 秒**讲底座能力，只讲和本作品最相关的一项，其余一笔带过，避免五个作品重复讲同一件事。

| 作品 | 露面点（建议时长） | 画面 | 台词要点 |
|---|---|---|---|
| A 招投标助手 | 出处（10 s） | 点资格要求旁的 `ClaimCard` → `SourceViewer` 打开招标文件第 N 页高亮 | 「每条判断都能点回原文」 |
| B 报价智能体 | **脱敏 + 仅本地（15 s，重点）** | 点 `RedactionBadge` 打开「云端看到了什么」→ 切 🔒 仅本地 → 再跑一次照样出结果，出域 0 次 | 「客户名、金额不会出公司；最敏感的加价标准只在本地模型里用」 |
| C 飞书跟进助手 | 复核 + 审计（10 s） | 群发风险清单前弹出 `ReviewPanel`，经理点通过后才发出 | 「AI 不会自己往群里乱发消息，每次发送都有记录」 |
| D 起重机内容工厂 | 出处（5 s） | 卖点「整机高 166.5 米」旁的出处链接指向官网报道 | 「参数都来自官方报道」 |
| E 视频生产线 | 复核（5 s） | 推文进入复核中心，品牌专员通过后才同步到公众号草稿 | 「发布前必须人工审核」 |

所有作品画面里都能看到同一个顶栏、同一套徽标和大卫小华，评委自然能看出「这是一个平台」，不需要专门讲。

### 9.2 最后 30 秒串联演示（底座负责）

| 时间 | 画面 | 底座负责的事 | 台词 |
|---|---|---|---|
| 0–5 s | 首页，营销获客链三张卡片 | 首页聚合各作品计数 | 「刚才的三个作品，其实是一条链」 |
| 5–15 s | A 点「发送到 B」→ 切到 B，收件箱红点 +1 → B 已确认的报价结果点「发送到 C」 | `handoffs` + 交接红点 + 同一 `chain_id` | 「招标包自动交给报价，报价结果自动交给跟进」 |
| 15–22 s | 飞书客户端：项目群收到 @报价员 的节点提醒卡片 | `core.feishu.mention` | 「节点提醒直接到飞书」 |
| 22–30 s | 链路视图：三段对象、三个徽标（🛡 / 🔒 / 🛡）、审计时间线 | `/chains/{id}` + 按 `chain_id` 查审计 | 「从标讯到报价到跟进，每一步谁做的、AI 看到了什么，全部可查」 |

**兜底**：现场网络或飞书出问题时，运行 `scripts/replay-chain.ps1 -Chain demo-sales`，用种子数据在 10 秒内重建整条链（对象、交接、审计），链路视图照常展示；飞书那一步改放提前录好的 5 秒录屏。内容创作链（D→E）只在链路视图里展示，不单独占 30 秒。

---

## 10. 评估指标

| 指标 | 目标 | 测法 |
|---|---|---|
| 一键启动 | `dev.ps1` 从冷启动到 `/v1/health` 全绿 ≤ 60 s | 计时 3 次取最大 |
| 对象契约 | 7 个 Schema 的示例全部通过校验；6 个反例（缺必填、错枚举、多字段、写权限越界、版本冲突、`confirmed` 缺确认人）全部被拒 | `pytest core/tests/test_schemas.py` |
| 脱敏 | 见 5.4.9（正则类召回 ≥ 99%、客户 ≥ 98%、人名 ≥ 90%、技术信息误脱 ≤ 2%、出域扫描命中 0、还原 100%） | `redaction_cases.jsonl` |
| 仅本地模式 | 切换后完整跑一次 B 的流程，出站连接只有私有地址 | 出域日志 + 系统网络连接列表 |
| 检索 | 30 个标注问题 top-5 命中 ≥ 85%；每条结果都带 `doc + page + locator` | `data/mock/search_eval.jsonl` |
| 出处校验 | 20 条构造样例（10 条正确、5 条改过引文、5 条无出处）全部判对 | `test_claims.py` |
| 复核 | 待复核项在审批前不会生效；回调失败可重试 3 次；SSE 断线重连后状态一致 | 手工 + 自动测试 |
| 审计 | 篡改任意一行后 `/v1/audit/verify` 能定位到该行 | 测试脚本 |
| 网关开销 | 网关（含脱敏和还原）额外延迟 p95 ≤ 150 ms | 100 次请求 |
| 串联演示 | 30 秒脚本连续彩排 5 次成功；回放脚本 10 秒内完成 | 彩排记录 |

---

## 11. 复用清单

| 复用来源 | 拿什么（已读源码确认） | 改什么 | 用在 |
|---|---|---|---|
| Loomi（`D:\Loomi-Desktop`） | `ARCHITECTURE.md` 的 SDK / 领域边界；`server/claudeAgent.js` 的会话恢复、Skill 暂存、空闲超时、工具调用上限、写操作去重；`server/claimEvidence.js` 的 `canonical()`、`factSupports`（子串 + 前 12 字否定检查）、`buildClaimEvidence`、`verifyClaimEvidence`；`server/modelClient.js` 的私有地址判断；FTS5 + 汉字二元组回退 | 从 Node 移植到 Python；否定检查加入「不 / 未 / 无 / 非 / 不得 / 不应」；私有地址判断反过来用作本地模式出站白名单 | core-R3、R5、R6、第 6 节 |
| 医晓（zip，解压在 scratchpad 阅读） | `rule_engine.py`：规则 JSON 单一事实源、按严重度排序首个命中决定、记录全部命中、输入校验安全降级、超时走保守 fallback、输出不变量校验、结果带 `audit_id` + `rules_version`；工作流六节点 + 只升不降回环；证据审核 Agent 的否决权 | 规则领域从医疗换成通用（`RuleEngine(rules_json)`）；结果结构改成 `RuleResult`；前端 JS 生成保留 | core-R10、B 的标配判定、A 的背调评分 |
| PPTSight（GitHub，`master` 分支） | `schema.sql` 的 documents / pages / chunks / facts + FTS 表；`rag_index.py` 的分块（420 字、重叠 60）和数字事实抽取；`workspace.py` 的检索结果结构（docId、page、quote、score） | 加集合维度和敏感度；加 bge-m3 向量（原项目 `semantic.py` 只有同义词组打分，没有向量）；RRF 融合；结果统一成 `Source` | core-R5 |
| XFusion-Agent（`E:\XFusion-Agent`） | `models/entities.py` 的 `Approval`、`AuditLog`；`orchestrator.py` 的 `_request_approval` → `waiting_approval` → `resume_after_approval`；`platform.py` 的 `upsert_audit`；`llm_router.py` 的 OpenAI 兼容插件（DeepSeek / Qwen / Ollama） | `Approval` 泛化为 `Review`（加 `editable_fields`、`edits`、回调）；审计加哈希链；路由加三种模式和脱敏 | core-R3、R8 |
| feishu-towechat（`~/.claude/skills/feishu-towechat`） | `lark_cli.py` 的无 shell argv 拼装；`docs +fetch` 用法；「结果不明的写操作不重试」「不打印密钥和正文」两条不变量；公众号字段长度限制 | 包成 `core.feishu.*`；加白名单、复核和幂等 key | core-R7、Article Schema、E |
| 超聚变 Q1（A 的底子） | Python FastAPI 结构 | 由 A 的 PRD 决定；底座只要求它用 `weihua-core-client` | A |
| 凉感 Montage（E 的底子） | Node + Remotion | 由 E 的 PRD 决定；底座提供 `@weihua/core` | E |

---

## 12. 开发计划（1.5 天，P0）

按 3 个半天排，第 4 个半天是缓冲 + 联调，作品开发可以从 D1 下午开始用 mock 客户端并行。

| 时段 | 交付 | 完成标志 |
|---|---|---|
| D1 上午 | 仓库骨架（uv + pnpm workspace）、`dev.ps1`、7 个 Schema 文件 + codegen、对象 CRUD + 写权限 + 版本、交接、审计哈希链、模型网关（cloud 直通）、外壳导航 + 账号切换 + 5 个占位页 | 作品能用客户端读写对象并交接；外壳能进 5 个入口 |
| D1 下午 | 脱敏（正则 + 词典 + jieba）、`cloud_redacted` 流程（含流式还原和二次扫描）、`local_only` 路由、检索（PPTSight 移植 + 集合 + 向量 + RRF）、出处校验、`RedactionBadge` / `ClaimCard` / `SourceViewer` | 5.4.9 正则类和还原测试通过；30 问检索评测跑通 |
| D2 上午 | 飞书封装（send / mention / base / docs / subscribe）、复核（含回调和 SSE）、导出（docx / xlsx / pdf / 飞书文档）、MCP 服务、Python / TS 客户端发布、编排器 + RuleEngine、`ReviewPanel` / `RunTrace` / `HandoffInbox` / `AssistantDock`、复核中心和链路视图页、种子数据 + `replay-chain.ps1` | 冒烟测试：Python 和 Node 各一个最小 Agent 走通 search → claim → review → export |
| D2 下午（缓冲） | 与 5 个作品联调、修 bug、30 秒串联彩排 | 第 10 节指标全部达标 |

**依赖顺序**：Schema → 对象 / 审计 → 网关 → 脱敏 → 检索 / 出处 → 复核 → 飞书 / 导出 → MCP / 客户端。作品方在 D1 上午结束时就能拿到 Schema 和客户端桩（接口不变、返回 mock），不用等底座全部完成。

---

## 13. 风险与待确认

| # | 风险 / 问题 | 影响 | 应对 | 状态 |
|---|---|---|---|---|
| 1 | 本地模型（Qwen 系列）工具调用能力不稳 | `local_only` 下多 Agent 流程可能出错 | 本地模式下编排器把需要工具调用的节点改成「先检索、再一次性生成」；演示只在 B 的结构化抽取上用本地模式 | 待验证 |
| 2 | Ollama 是否原生提供 Anthropic 兼容接口 | Agent SDK 直连本地模型的方式 | 底座 `/llm/anthropic` 自己做 Anthropic → OpenAI 协议转换，不依赖 Ollama 支持 | **待确认** |
| 3 | 大模型改写或编造占位符 | 还原失败或错还原 | system 提示 + 宽松匹配 + 只还原存在的编号 + `X-Weihua-Unrestored` 提示 | 已设计 |
| 4 | 公司是否用飞书、能否提供测试租户 | C 和飞书相关演示 | 调研未发现卫华使用飞书的公开证据；先用个人测试租户；问主办方 | **待确认**（选题方案问题清单） |
| 5 | 大卫小华 IP 形象授权 | 外壳形象 | P0 用占位头像，只呼应配色 | **待确认** |
| 6 | 官方 VI 色值、Logo 使用 | 主题 | CSS 变量占位 | **待确认** |
| 7 | 是否允许以「平台 + 作品」形式参赛、作品是否必须独立运行 | 代码组织 | 每个作品都能在底座之上单独启动演示；外壳只是统一入口 | **待确认** |
| 8 | 评审环境是否允许连外网、是否有 GPU | 云端 / 本地模型选择 | 三种模式都准备；本地模型选能在 CPU 或消费级显卡上跑的尺寸 | **待确认** |
| 9 | LibreOffice 安装体积和 Windows 兼容 | PDF 导出 | PDF 为 P0 中最低优先级，失败时只给 docx 并提示 | 已设计 |
| 10 | SQLite 并发写 | 6 个进程同时写 | 只有底座进程写 `core.db`（作品经 HTTP），WAL 模式 | 已设计 |
| 11 | 1.5 天工期 | 底座拖慢作品 | D1 上午先交 Schema + 客户端桩；P1 一律不做 | 已设计 |
| 12 | 内部数据不能用 | 演示真实度 | 全部模拟 + `demo_data` 角标；真实数据只在主办方允许后、在本地模式下使用 | 已设计 |

---

## 附：其他 5 份 PRD 必须对齐的地方

| # | 对齐项 | 具体要求 | 位置 |
|---|---|---|---|
| 1 | 数据对象 | 字段名、枚举值、必填项以 7.3 为准；需要新字段先提给底座加进 Schema，不在作品里私加（`unevaluatedProperties: false` 会拒收） | 7.3 |
| 2 | 写权限 | A 写 TenderPackage / Opportunity；B 写 QuoteResult；C 只改 Opportunity 的进度字段；D、E 写 MediaAsset；E 写 Article；Claim 都可写 | core-R2 |
| 3 | 模型调用 | 只走 `ANTHROPIC_BASE_URL=http://127.0.0.1:8700/llm/anthropic`（或 `/llm/openai`），用 app token；作品里不放模型 Key | core-R3、6.1 |
| 4 | 目录和端口 | 后端 `apps/<code>/`，前端 `web/src/modules/<code>/`；端口 bid 8701、quote 8702、follow 8703、studio 8704、video 8705 | core-R1 |
| 5 | 错误码 | 统一错误信封和错误码表，作品自定义错误码加 `<CODE>_` 前缀 | 5.1 |
| 6 | MCP 工具名 | 用 `core_search`、`core_claim_verify`、`core_review_request` 等，不要另起同功能工具 | core-R11 |
| 7 | 复核 | 关键结论用 `core.review`，写清 `editable_fields`；高风险不能自动通过 | core-R8 |
| 8 | 交接和链路 | 跨作品传递用 `core.handoff`，沿用上游 `chain_id` | core-R2 |
| 9 | 模拟数据 | 所有模拟对象 `demo_data: true`；客户名用「（模拟）」后缀 | 7.1 |
| 10 | 检索集合 | 使用 8 个预置集合名；新增集合在作品 PRD 里写明并标敏感度 | core-R5 |
| 11 | 共用组件 | 结论、出处、脱敏、复核、交接、运行轨迹一律用 `web/src/ui/` 组件 | 5.12 |
| 12 | 规则 | 作品自己的确定性规则（B 标配判定、A 背调评分）写成 RuleEngine JSON，结果用 `RuleResult`，大模型只能升级不能降级 | core-R10 |
| 13 | 演示 | 每个作品只用 10–15 秒讲第 9.1 节分配给它的那一项底座能力 | 9.1 |
