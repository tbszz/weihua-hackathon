# follow 样例数据（格式示意）

全部为**虚构 / 脱敏**数据：客户名用「国家 + 行业 + 某公司」，人名为化名，金额为虚构值。
这里只放每类数据的几条样例，用来固定格式；完整数据集（20 段沟通、约 60 个节点、85 条成交 / 丢单、40 条群消息、5 段语音）在 D1 上午按 PRD 7.2 节生成。

| 文件 | 对应 | 说明 |
|---|---|---|
| `chat-sample-01.txt` | `chat-digest` | WhatsApp 导出格式（中英混杂） |
| `chat-sample-01.label.json` | `chat-digest` 评测 | 人工标注的诉求 / 顾虑 / 待办 / 关键数字 |
| `milestones-seed.csv` | `deadline-watch` | `offset_days` = 相对演示当天的天数，种子脚本换算成真实日期 |
| `losses-sample.csv` | `loss-analysis` | 含期望主因，用于评测 |
| `risk-messages-sample.csv` | `risk-capture` | 含正例和易混淆负例 |
| `eval-case-deadline.json` | Acemode 评测用例格式 | 沿用 `acemode-ai-org/evals/_template/case.json` |
