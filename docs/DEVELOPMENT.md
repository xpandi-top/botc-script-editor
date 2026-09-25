# 开发、构建与部署

[产品介绍](../README.md) · [操作手册](USER-GUIDE.md) · [测试说明](TESTING.md)

## 本地运行

```bash
npm ci
npm run dev          # http://localhost:5173
```

## 验证与构建

```bash
npm run verify       # 翻译、类型、单元测试、生产构建与体积检查
npm run test:e2e     # 桌面与手机浏览器测试
npm run build
npm run preview
```

生产构建使用 `/botc-script-editor/` 路径。GitHub Pages 部署配置见[工作流](../.github/workflows/deploy-pages.yml)，桌面与 Android 构建命令见 [package.json](../package.json)。

## 可选在线服务

- 在线入座、领取身份和消息使用 Firebase。配置及 Firestore 规则见 [DealSession.ts](../src/lib/DealSession.ts) 文件头部说明。
- Google Drive 同步依赖 Google 授权配置；相关数据范围见[存储说明](STORAGE.md)。
- 可选 API、MCP 与在线 AI 服务见 [Worker 文档](../worker/README.md)。AI 聊天助手仍为实验功能，产品文案和使用说明需保留试用状态。

## 文档与演示维护

README 介绍产品价值和少量重点功能；具体操作写在[操作手册](USER-GUIDE.md)，开发配置留在技术文档。未确定的功能不承诺上线时间；已可试用但仍在调整的功能标为「实验功能」。

固定演示数据、产品截图与玩家操作图解，以及 `npm run demo:screenshots`、`npm run demo:players` 的用法见[产品演示说明](PRODUCT-DEMO.md)。功能变化时，同时检查 README、操作手册与[更新日志](CHANGELOG.md)。
