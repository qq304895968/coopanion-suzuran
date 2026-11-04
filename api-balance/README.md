# API 余额 World

Cortico World API 6 扩展，按用户请求查询 DeepSeek、Kimi（国内/国际）、硅基流动或 OpenRouter 账户余额。查询结果来自服务商，不让模型猜金额。

## 开发与安装

工作区根目录：

```sh
pnpm install --frozen-lockfile
pnpm --filter cortico-world-api-balance typecheck
pnpm --filter cortico-world-api-balance test
pnpm --filter cortico-world-api-balance build
pnpm --filter cortico-world-api-balance check
```

`build` 输出 `dist/webui.js` 并生成 manifest 声明的 `describe.json`。安装源码前先构建。默认导出为 `WorldDefinition`，配置空间是 `worlds.api-balance`。

## 密钥与行为

- 在宿主的“API 余额”页选择服务商，把密钥保存到**部署密钥库**，不要提交到 Git。
- 工具 `api_balance` / `api_balance_settings` 不接受密钥参数，不把真实 key 放进提示词。
- 请求有超时与缓存；默认缓存 60 秒、超时 10 秒。
- 认证、网络和接口形状错误会明确报告；已知完整密钥和常见 `sk-` token 会脱敏。
- 负余额按 `-$1,234.50` 显示，不伪装成正余额；金额不代表剩余 token 数。
- 自动测试使用模拟 HTTP 响应，没有查询你的实际账户。真实服务商连通性、权限和计费需自行验收。

本地 `check` 是 SDK manifest/入口/工具/配置/元数据检查的子集，不等于官方发布认证。工作区说明见 [根 README](../README.md)。
