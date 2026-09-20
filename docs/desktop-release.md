# 桌面端正式发布

桌面端保持薄壳：Web 仍是独立静态应用，daemon 仍是独立本地进程。发布阶段只复制两者的产物以及 Node 和 Computer Use 原生 helper，不把桌面逻辑写入 Web 或 daemon，也不把用户数据、Provider 凭据或 `.env` 放进安装包。

## 产物范围

- 安装包格式：macOS DMG。
- 最低系统版本：macOS 14。
- 每次构建生成当前构建机架构的安装包；Apple Silicon 与 Intel 分别构建。
- 安装包包含 Web 静态资源、daemon 生产依赖、Node 24 运行时和 Computer Use helper；目标机器不需要 Node、pnpm、Rust 或单独部署 Web/daemon。
- Provider API Key、用户 OAuth Token 和 macOS 辅助功能/屏幕录制权限继续由最终用户在安装后配置或授权。
- GitHub OAuth Client ID 会从发布环境或仓库根 `.env` 写入桌面包；桌面登录使用 Device Flow，不打包 Client Secret。

## 发布凭据

正式发布必须配置 `APPLE_SIGNING_IDENTITY`，并选择一种 Apple 公证凭据：

- Apple ID：`APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID`。
- App Store Connect API：`APPLE_API_ISSUER`、`APPLE_API_KEY`、`APPLE_API_KEY_PATH`。

证书和公证凭据只通过发布环境提供，不写入仓库或安装包。

桌面包还必须配置 `PI_HARNESS_GITHUB_CLIENT_ID`。构建优先读取当前进程环境，缺失时读取仓库根 `.env`；对应 GitHub OAuth App 必须启用 Device Flow。

## 生成安装包

使用 Node.js 24 和 pnpm 10，在仓库根目录执行：

```sh
pnpm release:desktop
```

发布命令会构建 Web、部署 daemon、构建并嵌入原生 helper、生成签名并公证的 App 与 DMG，随后校验 App 签名、Gatekeeper 结果、公证票据和 DMG 完整性。任一发布凭据缺失或验证失败时，产物不视为可交付。
