# 小华·跟进助手：竞品与差异化分析

> 版本：v0.1（2026-11-07）  
> 对应 PRD：`docs/PRD.md`  
> 结论先行：**不要把小华讲成“又一个 AI CRM”或“通用会议纪要工具”**。竞品在会话智能、CRM 自动化、销售方法论上都很强；小华的差异化应压在「卫华项目型销售 + 飞书沟通现场 + 节点风险规则 + 丢单归因闭环」这四件事上。

---

## 1. 竞争格局总览

| 类别 | 代表产品 | 它们最强的点 | 对小华的挤压 | 小华不应卷的方向 |
|---|---|---|---|---|
| 飞书原生 AI | 飞书妙记、多维表格 AI、Aily、智能伙伴 | 会议转写、智能纪要、待办、多维表格工作流、企业内闭环 | 评委会认为“飞书自己就能做” | 通用转写、通用摘要、通用工作流搭建 |
| 国内 AI CRM / SCRM | 销售易 NeoAgent、卫瓴协同 CRM、销帮帮 + 钉钉、金现代 AI CRM | 客户 360、商机评分、企微会话沉淀、私有化、销售流程方法 | 评委会认为“CRM 厂商更完整” | 完整 CRM、线索分配、商机阶段、客户公海 |
| 国际 CRM 内嵌 AI | Salesforce ECI / Agentforce、Microsoft Copilot Sales、SAP Sales Cloud | CRM 数据原生、会议摘要、下一步行动、CRM 回写、生态成熟 | 海外大厂能力标杆 | 多语言会话智能、销售辅导、预测评分 |
| Revenue Intelligence | Gong、HubSpot Conversation Intelligence | 会话洞察、竞争对手提及、异议/价格识别、教练分析 | 单点摘要能力远超小华 | 团队会话分析、销售培训、通话质量评分 |

**判断**：如果只演示“把聊天总结成摘要”，小华没有胜算。小华必须演示「一条线索到报价、节点、风险、丢单复盘」的项目链路闭环，并且强调这是从卫华场景表里长出来的，不是通用能力拼装。

---

## 2. 重点竞品分析

### 2.1 飞书原生：妙记 + 多维表格 AI + Aily

**定位**：飞书内做会议转写、智能纪要、待办提取、多维表格自动化和企业智能体。

**优势**

- 妙记已覆盖音频/视频转写、智能会议纪要、章节化记录和待办识别，交互成熟，零学习成本。
- 多维表格已支持 AI 字段捷径、AI 公式、仪表盘 AI 分析、工作流 AI Agent 节点，可直接把非结构化内容变成结构化数据。
- 飞书 CRM 场景演示中已有“AI 创建跟进记录”“对话更新商机字段”“销售日报/周报”“赢单策略推荐”等场景，说明官方生态正在覆盖销售跟进。
- 飞书生态优势是权限、消息卡片、多维表格、文档、日历、任务和机器人天然联动。

**局限**

- 官方能力偏平台化和通用化：企业仍需自己设计表结构、提示词、工作流和业务规则。
- 通用会议/消息摘要不等于卫华的报价截止、投标截止、生产、发货、采购到货等节点规则。
- 未见开箱即用的“丢单原因分类 + 月度成交/丢单报告 + 项目风险分级”闭环。
- 权限与数据边界需要企业自己治理，尤其是群消息和海外 WhatsApp/邮件文本进入系统后的脱敏与确认。

**对小华的启示**

- 小华不能宣称比飞书更懂 AI 或更懂协同，而要宣称把飞书底座“行业场景化”。
- 演示中要明确：飞书提供消息、卡片、多维表格、文档能力；小华提供卫华业务对象、规则、评测和闭环。

**主要依据**：[飞书妙记](https://www.feishu.cn/product/minutes)、[飞书多维表格](https://www.feishu.cn/product/base)、[飞书智能 CRM 场景演示](https://www.feishu.cn/content/crm-ai-scenario-demonstration)

### 2.2 销售易 NeoAgent 2.0

**定位**：AI 原生 CRM，覆盖营销、销售、服务、渠道和分析 Agent。

**优势**

- 销售 Agent 支持自然语言查询 CRM 与知识库、智能录入活动记录、商机查重、客户洞察、商机健康度评估和行动建议。
- 活动记录可整合拜访录音、语音录入、腾讯会议、企微会话等多渠道数据，AI 自动整理并由销售确认。
- 有成熟的商机评分模型（如 CCS、BANT）、跟进缺失提醒、行动优先级、专家资源与案例推荐。
- 与腾讯生态和企业微信结合较深，入口离销售日常工作近。

**局限**

- 主要价值发生在 CRM 数据模型和销售流程内，要求企业把客户、商机、活动等数据沉淀到销售易。
- 对卫华这类已有 SAP、PLM、CRM、MES、SRM、OA 的企业，替换或同步主数据成本高。
- 更偏销售方法论和商机管理，不天然理解报价截止、投标、生产、发货、采购到货延迟等项目交付链路。

**对小华的启示**

- 小华应承认“不替代 CRM”，定位为沟通现场和多维表格上的轻量跟进层，P1 再考虑回写 CRM/SAP。
- 可借鉴销售易的“AI 建议 + 销售确认”模式，小华所有回填动作必须走 Human Gate。

**主要依据**：[销售易 NeoAI](https://www.xiaoshouyi.com/neoai)、[销售易智能会议纪要案例](https://www.xiaoshouyi.com/about-us/newnew/90863.html)

### 2.3 卫瓴·协同 CRM 3.0 / 小微 AI

**定位**：面向营销与销售协同的中国 CRM，强调企微私域、线索培育和一线销售提效。

**优势**

- 小微 AI 可从电话外呼、微信聊天、线上会议等生成跟进记录，并提供下一步跟进建议。
- 覆盖内容生成、AI 找企业、客户分层、自动化培育、沉默客户激活等营销销售链路。
- 对中国企业微信、微信生态适配强，贴近国内销售沟通习惯。

**局限**

- 核心优势在营销获客、线索培育和企微私域，不是卫华这种重型装备项目交付节点管理。
- 群聊记录生成通常依赖会话存档等企业配置，跨系统主数据仍需打通。
- 不内置卫华需要的采购到货 3 天 / 3–7 天 / 超 7 天分级和丢单归因体系。

**对小华的启示**

- 小华要突出“从线索到交付”的后半段链路，而不是前端获客。
- 语音、群消息、转发文本这些低门槛输入方式值得坚持，但必须加确认卡片和审计记录。

**主要依据**：[卫瓴 V2.3 小微 GPT](https://www.weiling.cn/cpdt/504.html)、[卫瓴接入 DeepSeek](https://www.weiling.cn/newsinfo51)

### 2.4 钉钉生态：钉钉 AI 助理 + 销帮帮 CRM

**定位**：钉钉提供沟通、会议、待办、AI 助理和低代码生态，销帮帮提供 CRM 应用和销售助手。

**优势**

- 钉钉 AI 助理支持消息总结、智能问答、会议纪要、工作任务与日程提醒。
- 销帮帮与钉钉联合发布过客户录入小助手、客户会议小助手、客户跟进小助手。
- 钉钉 AI 听记/A1 硬件生态可把录音纪要、关键词、待办同步到氚云等业务表单。
- 对已用钉钉的企业，入口和硬件生态有天然优势。

**局限**

- 能力分散在平台、ISV、硬件和低代码表单之间，需要集成配置。
- 销售助手偏通用 CRM 动作，不默认包含项目节点风险规则和丢单分析。

**对小华的启示**

- 演示中要避免讲“消息总结”这个单点，应展示消息 → 摘要 → 回填 → 节点 → 风险 → 月报的全链路。
- 如果评委熟悉钉钉，可主动对比：小华选飞书是因为场景表 #12 明确提到“飞书群自动抓取”，且多维表格适合两天内搭出可演示数据闭环。

**主要依据**：[钉钉 AI 助理概述](https://open.dingtalk.com/document/ai-dev/introduction-to-ai-assistant.md)、[销帮帮 AI 销售助理发布](https://www.xbongbong.com/gongsidongtai/807)

### 2.5 Salesforce Einstein Conversation Intelligence / Agentforce

**定位**：Salesforce 内的会话智能与 AI 销售执行，连接 CRM 数据和自动化。

**优势**

- 自动转录、摘要、行动项、异议、价格、竞品、客户问题等关键信号识别。
- 可将行动项转成 CRM Task，并结合 Flow/Apex/Agentforce 更新机会、触发提醒和后续动作。
- Opportunity Insights、Pipeline Management、Deal Guidance 能把会话信号转成商机推进建议。
- 对 Salesforce 客户数据原生，报表和自动化能力强。

**局限**

- 强依赖 Salesforce 数据模型和许可体系；引入与治理成本高。
- 对中文企业微信/飞书/WhatsApp 等混合沟通场景，需要额外连接器和数据治理。
- 不内置卫华的项目交付节点与采购分级规则。

**对小华的启示**

- 小华可以学习“会话信号 → 结构化对象 → 自动化动作”的设计，但不要做大而全会话智能。
- 摘要卡片必须直接给出可点确认的回填字段，而不是只给一段文本。

**主要依据**：[Salesforce Conversation Intelligence](https://www.salesforce.com/sales/conversation-intelligence/?bc=HA)

### 2.6 Microsoft Copilot / Sales Agent

**定位**：把销售洞察放进 Teams、Outlook 和 Microsoft 365 工作流，同时回写 Dynamics 365 或 Salesforce。

**优势**

- Teams 会议 Recap 可查看销售洞察、问题、关键词、情绪、发言人洞察。
- 支持从会议 Recap 创建 CRM Task、生成会后跟进邮件、保存 AI 会议笔记到 CRM。
- 优势在于 Microsoft 365 办公现场 + CRM 数据双向连接。

**局限**

- 核心会议和邮件场景围绕 Teams/Outlook/Dynamics/Salesforce，对飞书群、WhatsApp 导出、国内业务表格场景不天然。
- 项目交付节点、采购延迟分级仍需企业定制。

**对小华的启示**

- “从会议洞察到 CRM 任务”是标杆体验，小华的对应体验应是“从飞书沟通到多维表格项目节点和客户档案”。
- 生成邮件不是小华 P0 主线，避免功能发散。

**主要依据**：[Microsoft Teams meeting recap 销售洞察](https://learn.microsoft.com/en-us/microsoft-sales-copilot/view-meeting-summary-recap)

### 2.7 Gong / HubSpot Conversation Intelligence

**定位**：Revenue Intelligence，用会话数据做销售洞察、辅导和收入预测。

**优势**

- Gong Call Spotlight 提供摘要、重点、下一步、大纲、Call Briefs 和 Ask Anything；可自动填充 CRM。
- HubSpot 支持 AI Call Summary、关键词、通话分析、教练洞察和工作流触发。
- 对异议、竞品、价格、客户情绪、销售行为模式的分析成熟。

**局限**

- 主要面向电话/会议/邮件会话资产化，价格和实施门槛较高。
- 解决“销售为什么赢单/丢单”的分析，不负责项目交付过程中的节点提醒。
- 对飞书群、中文制造业项目节点、采购到货延迟规则需要定制。

**对小华的启示**

- 小华不要卷“销售辅导”和“通话分析”。可以做一个小而准的切片：从沟通中提取客户诉求、顾虑、待办，并带原文证据。

**主要依据**：[Gong Call Spotlight](https://www.gong.io/press/gong-introduces-call-spotlight)、[HubSpot Conversation Intelligence](https://www.hubspot.com/products/conversation-intelligence)

### 2.8 SAP Sales Cloud / Business AI

**定位**：SAP 生态内的智能销售与 CRM，强调商机推进、报价到订单和业务流程集成。

**优势**

- 有销售 AI、Joule 上下文指导、商机评分、下一步行动、预会/会后简报。
- Business Interaction Intelligence 可从会议转录中提取摘要、情绪、参会人、关键词、产品、竞品和推荐动作。
- 与 SAP 商业数据、报价、订单、交付流程天然相关，适合已有 SAP 的企业考虑长线整合。

**局限**

- 深度价值依赖 SAP Sales Cloud v2 等系统承载销售过程；卫华已有系统不代表接口可开放。
- 黑客松两天内无法完成 SAP 集成，且公开资料未确认卫华销售侧系统形态。

**对小华的启示**

- 小华 P0 用多维表格承载演示数据，P1 再谈 SAP/CRM 回写，是最现实的路线。
- 可以把 SAP 定位为“未来系统事实源”，小华是飞书里的轻量行动层。

**主要依据**：[SAP Sales Cloud features](https://www.sap.com/products/crm/sales-cloud/features.html)、[SAP Interaction Insights](https://community.sap.com/t5/crm-and-cx-blog-posts-by-sap/accelerate-digital-selling-productivity-with-interaction-insights-in-sap/ba-p/13577570)

---

## 3. 能力矩阵：小华 vs 代表竞品

说明：★ 越多代表公开资料体现的能力越强；小华按 PRD P0 目标评估。

| 能力 | 飞书原生 AI | 销售易 | 卫瓴 | Salesforce | Microsoft | Gong/HubSpot | 小华 P0 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 会议/消息转写与摘要 | ★★★★★ | ★★★★ | ★★★★ | ★★★★ | ★★★★ | ★★★★★ | ★★★★ |
| 待办提取与回填 | ★★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★★ | ★★★★ | ★★★★ |
| CRM 客户/商机模型 | ★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★ | ★★★ | ★★ |
| 销售方法论/评分/辅导 | ★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★ |
| 项目节点临期/逾期分级 | ★★ | ★★ | ★★ | ★★ | ★★ | ★ | ★★★★★ |
| 采购到货延迟业务规则 | ★ | ★ | ★ | ★★ | ★ | ★ | ★★★★★ |
| 群消息顺手风险采集 | ★★★ | ★★★ | ★★★★ | ★★ | ★★ | ★★ | ★★★★★ |
| 丢单原因规则化归因 | ★★ | ★★★ | ★★ | ★★★★ | ★★★ | ★★★★ | ★★★★★ |
| 月度成交/丢单报告 | ★★★ | ★★★★ | ★★★ | ★★★★ | ★★★ | ★★★ | ★★★★★ |
| 飞书内使用成本 | ★★★★★ | ★★ | ★★ | ★ | ★ | ★ | ★★★★★ |
| 两天可演示闭环 | ★★★★ | ★★ | ★★ | ★ | ★ | ★ | ★★★★★ |

---

## 4. 小华的差异化定位

### 4.1 核心定位句

> **小华不是替代 CRM，而是长在飞书里的卫华项目跟进层：把群聊、邮件、WhatsApp 变成客户档案、项目节点和风险登记；用确定性规则盯报价、投标、生产、发货、采购到货；用丢单归因沉淀月度经营复盘。**

### 4.2 五个可防守的差异点

| 差异点 | 为什么竞品不容易直接覆盖 | P0 演示动作 |
|---|---|---|
| **项目型销售闭环** | 通用 CRM 关注线索/商机，小华把营销线索 A、报价结果 B、项目节点 C、风险和丢单串成链路 | 接收 A 的 `Opportunity` 和 B 的 `QuoteResult` 后自动建档、建节点、跑风险 |
| **飞书沟通现场** | 国际产品强在 Teams/Outlook/Salesforce，国内 CRM 强在企微/自建 CRM；小华贴场景表里的飞书群现场 | 在群里 @小华总结消息、上传 WhatsApp 导出、粘贴邮件 |
| **确定性节点规则** | AI 摘要竞品很多，但报价截止、投标截止、生产、发货、采购到货 3/3–7/7+ 天分级是业务规则，不是模型发挥 | 展示红/橙/黄风险清单并 @负责人 |
| **顺手风险采集** | 不要求销售额外填表，从群消息和语音中识别风险，再由提交人确认 | 群里正常聊天后弹出风险确认卡片 |
| **丢单归因与月报** | 单点摘要产品不做经营复盘；大 CRM 需要完整数据治理 | 新增丢单说明后自动打标签，一键生成月报 |

### 4.3 不做的三个方向

1. **不做完整 CRM**：不做线索分配、客户公海、商机阶段、合同回款、权限体系，避免被问“和现有 CRM 怎么共存”。
2. **不做销售教练**：不做通话时长、倾听比、异议处理评分，这些是 Gong/HubSpot 强项且不是卫华场景表主诉求。
3. **不做自动决策**：只提醒、不替代人决策。所有写回、派发、归因都可解释、可确认、可审计。

---

## 5. 路演中的竞品问答口径

### Q1：飞书妙记和 Aily 也能总结会议、提取待办，为什么需要小华？

小华不重复做转写和通用摘要，而是把这些能力封装成卫华业务闭环：客户档案、项目节点、风险登记、丢单记录四张表，加确定性节点规则和丢单分类体系。飞书是底座，小华是行业场景层。

### Q2：销售易、卫瓴这些 AI CRM 已经有跟进记录自动生成，小华差异是什么？

它们要求销售过程沉淀在自家 CRM 中；小华不迁移系统，先在飞书沟通发生地解决记录、节点和风险问题，P1 再回写 CRM/SAP。小华还覆盖项目交付节点和采购到货延迟，这是通用销售 CRM 不内置的规则。

### Q3：Salesforce、Microsoft、Gong 更强，小华凭什么有价值？

这些产品能力强但入口、数据模型和部署成本不同。小华的价值不是超过它们，而是在卫华真实场景中两天可落地：飞书群可进、多维表格可写、卡片可确认、规则可解释、月报可生成。

### Q4：会不会有数据合规风险？

设计上做四层保护：输入脱敏、风险确认卡片只发提交人、回填走 Human Gate、保留原文证据与运行日志。群消息不静默入库，语音转写后同样需确认。

---

## 6. 对 PRD 和演示的落地建议

### 6.1 P0 必须强化的点

1. **摘要卡片带证据**：每个诉求、顾虑、待办后附 `msg#` 或原文片段，避免被质疑幻觉。
2. **确认后回填**：摘要卡片不能只展示，必须一键写入客户档案和项目节点。
3. **风险规则可视化**：演示页展示 3/3–7/7+ 天采购分级和临期/逾期规则，让评委看到不是纯模型判断。
4. **丢单两级分类**：先规则命中，再模型补充，展示置信度和理由。
5. **链路收口**：最后 30 秒演示 A/B 输入自动建档，说明这是营销获客链的一环。

### 6.2 P1 可加分但不阻塞

- WhatsApp/邮件自动接入：先支持粘贴和导出文件，P1 再做邮箱/云盘监听。
- CRM/SAP 回写：说明接口边界和数据责任，不在 P0 假装实时打通。
- 历史风险检索：按行业、产品类型、区域找同类项目高频风险。
- 成交要素提取：沉淀成功案例，与丢单分析形成对照。

### 6.3 一页路演叙事

1. 卫华海外和项目沟通分散在飞书群、WhatsApp、邮件里，跟进靠人回忆。
2. 现有 CRM/SAP 是系统事实源，但不在沟通现场，业务员不愿回填。
3. 小华不新建重系统，在飞书里做四件事：摘要回填、节点盯防、顺手风险采集、丢单归因月报。
4. 竞品强在通用 AI/CRM，小华强在卫华项目链路、确定性规则、飞书零切换和两天可演示闭环。

---

## 7. 结论

小华的机会不是做“更会总结的 AI”，而是做一个**贴身、轻量、可解释、可回填的卫华项目跟进工作流**。对外表述应从：

> “AI 自动总结聊天记录”

升级为：

> “在飞书沟通现场，把客户沟通、项目节点、采购风险和丢单复盘连成闭环；AI 只做语言理解和归因辅助，规则和决策由业务确定性规则与人工确认保证。”

这个定位既避开飞书原生和 AI CRM 的正面竞争，也最能解释为什么该作品属于卫华营销获客与项目跟进链路。

---

## 8. 参考来源

### 飞书生态

- [飞书妙记产品页](https://www.feishu.cn/product/minutes)
- [飞书多维表格产品页](https://www.feishu.cn/product/base)
- [飞书智能 CRM 场景演示与实践](https://www.feishu.cn/content/crm-ai-scenario-demonstration)

### 国内 CRM / 钉钉生态

- [销售易 NeoAI](https://www.xiaoshouyi.com/neoai)
- [销售易智能邮件与会议纪要介绍](https://www.xiaoshouyi.com/about-us/newnew/90863.html)
- [卫瓴·协同 CRM V2.3 与小微 GPT](https://www.weiling.cn/cpdt/504.html)
- [卫瓴接入 DeepSeek 与销售提效](https://www.weiling.cn/newsinfo51)
- [钉钉 AI 助理概述](https://open.dingtalk.com/document/ai-dev/introduction-to-ai-assistant.md)
- [销帮帮与钉钉发布 AI 销售助理](https://www.xbongbong.com/gongsidongtai/807)
- [金现代 CRM](https://crm.jxdinfo.com/)

### 国际产品

- [Salesforce Conversation Intelligence](https://www.salesforce.com/sales/conversation-intelligence/?bc=HA)
- [Microsoft Sales Agent Teams meeting recap](https://learn.microsoft.com/en-us/microsoft-sales-copilot/view-meeting-summary-recap)
- [Gong Call Spotlight 发布稿](https://www.gong.io/press/gong-introduces-call-spotlight)
- [HubSpot Conversation Intelligence](https://www.hubspot.com/products/conversation-intelligence)
- [HubSpot call recordings, transcripts and summaries](https://knowledge.hubspot.com/calling/review-call-recordings-and-transcripts)
- [SAP Sales Cloud features](https://www.sap.com/products/crm/sales-cloud/features.html)
- [SAP Business Interaction Intelligence](https://community.sap.com/t5/crm-and-cx-blog-posts-by-sap/accelerate-digital-selling-productivity-with-interaction-insights-in-sap/ba-p/13577570)
