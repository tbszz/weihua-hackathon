# 卫华黑客松

五个作品采用单仓库管理，各自独立运行；共用 PRD、研究资料、工作台和 IP 设计一起归档。

GitHub 私密仓库：[tbszz/weihua-hackathon](https://github.com/tbszz/weihua-hackathon)。

**阶段成果与本次验证：[完成情况总结.md](完成情况总结.md)**（2026-11-08）。目前五个作品均有本地可运行实现，完整平台服务、跨项目联调和生产部署仍待完成。

| 路径 | 内容 |
|---|---|
| [选题方案.md](选题方案.md) | 选题方案 v0.3：平台底座 + 2 条链路 + 5 个作品 |
| [PRD约定.md](PRD约定.md) | 6 份 PRD 共用的模板、底座能力和数据对象约定 |
| [research/](research/) | 卫华集团公开信息调研（报告、出处、术语表） |
| [00-平台底座/](00-平台底座/docs/PRD.md) | 卫华 AI 工作台底座（`core`，不单独参赛） |
| [A-招投标助手/](A-招投标助手/docs/PRD.md) | 作品 A（`bid`），主报 #80 |
| [B-报价智能体/](B-报价智能体/docs/PRD.md) | 作品 B（`quote`，主打），主报 #8 |
| [C-飞书跟进助手/](C-飞书跟进助手/docs/PRD.md) | 作品 C（`follow`），主报 #74 |
| [D-起重机内容工厂/](D-起重机内容工厂/docs/PRD.md) | 作品 D（`studio`），主报 #10 |
| [E-视频生产线/](E-视频生产线/docs/PRD.md) | 作品 E（`video`），主报 #19 |
| [inventory-forecasting/](inventory-forecasting/README.md) | 安全库存动态预测算法验证（根据样例出入库数据做滚动回测） |

每个项目文件夹下有 4 个子文件夹：

- `docs/`：PRD 和设计文档
- `data/`：样例和模拟数据、评测集
- `src/`：代码
- `demo/`：演示脚本、录屏、答辩材料

## 获取完整工程

视频、音频和 GLB 使用 Git LFS 保存，包含现有穿越短片素材及多个版本成片。克隆机器需要 Git LFS：

```powershell
git lfs install
git clone https://github.com/tbszz/weihua-hackathon.git
cd weihua-hackathon
git lfs pull
```

通过 GitHub 的 Download ZIP 获取源码时，不应假定已包含完整 LFS 素材。项目启动、依赖和外部凭证见各项目 README；密钥、本机运行状态、依赖目录与构建缓存不进入仓库。

## 独立运行入口

| 作品 | 安装与启动（在对应目录执行） | 验证 |
|---|---|---|
| [A 招投标助手](A-招投标助手/README.md) | `python -m pip install -r requirements.txt`；`python -m uvicorn src.server.main:app --host 127.0.0.1 --port 8011` | `python -m pytest -q` |
| [B 报价智能体](B-报价智能体/README.md) | `npm ci`；`npm start` | `npm test` |
| [C 飞书跟进助手](C-飞书跟进助手/README.md) | `npm ci`；`npm start` | `npm test` |
| [D 起重机内容工厂](D-起重机内容工厂/README.md) | `npm ci`；`npm run dev` | `npm test`；`npm run build` |
| [E 视频生产线](E-视频生产线/README.md) | `npm ci`；`npm run api`，另开终端 `npm run dev -- --host 127.0.0.1` | `npm run check` |

Node.js 项目建议统一使用 22 或以上版本。E 的真实配音/渲染还需要 FFmpeg、FFprobe、Chromium 和本地 MiniMax 脚本，详见其 README。
