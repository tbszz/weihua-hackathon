# 卫华起重机内容工厂 · P0

React + Three.js 前端和 Node.js API，展示起重机参数、三维结构拆解、尺寸类比、现场效果候选及交付校验。

## 运行

需要 Node.js 22+。在本目录执行：

```powershell
npm ci
npm run dev
```

前端默认 http://localhost:5183，API 默认 http://localhost:8714。`npm run dev` 会生成本地示意 GLB，并同时启动两端。`npm start` 只启动 API；`npm run build` 生成前端构建。

```powershell
npm test
npm run build
```

## 已有能力

- 官方样例参数解析、缺失和修改字段提示、带公式的尺寸类比、卖点来源与人工确认门禁。
- 参数化三维结构示意、部件树、分层爆炸、三视图、剖视、PNG/GLB 导出、GLB 导入和浏览器导览录制入口。
- Tripo 参考图生成、任务查询、GLB 下载缓存与前端加载接口；运行时从环境变量读取 `TRIPO_API_KEY`，可用 `TRIPO_MODEL` 覆盖模型。
- 现场效果的两张缓存候选与本地 MediaAsset 模拟记录。

## 当前边界

三维模型用于宣传示意，不能作为工程 CAD；Tripo 外观结果不代表真实内部结构。本次归档只验证本地测试和构建，没有新建收费生成任务。现场图片合成仍是缓存演示，公众号写稿、排版、草稿同步、D/E 正式接口及生产发布尚未完成。正式应用需要另行配置密钥，不能依赖原开发机器上的共享配置文件。

完整规划见 [PRD](docs/PRD.md)，当前归档状态见仓库根目录 [完成情况总结](../完成情况总结.md)。
