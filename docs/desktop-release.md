# 桌面端正式发布

Tauri 保持薄壳，负责窗口、动态端口、用户主目录、外部授权 URL 和 daemon sidecar 生命周期。Web 是 React 静态应用，业务 API、模型、文件操作与持久化仍由本地 daemon 执行。

## 产物与构建前提

- 当前正式目标是 macOS App 与 DMG，最低系统版本为 macOS 14；Apple Silicon 与 Intel 分别在匹配架构的构建机上生成。
- 构建机需要 Node.js 24 或更高版本、pnpm 10、Rust/Cargo 与 macOS 编译/签名工具链。脚本复制当前 Node 可执行文件，要求其架构与 `rustc --print host-tuple` 一致，不下载固定版本 Node。
- 安装包包含 Web `dist`、daemon 源码与生产依赖、Node sidecar、Computer Use helper，以及其签名 App 和 Swift overlay。目标机器不需要 Node、pnpm 或 Rust。
- daemon 通过内置 Node 的 `--import tsx --env-file=desktop-oauth.env src/bootstrap.ts` 启动，当前桌面打包不依赖 daemon 的 `dist`。
- 用户数据、Provider 凭据和仓库根 `.env` 不随包部署。仅从发布环境或根 `.env` 提取应用 GitHub OAuth Client ID，写入包内 `desktop-oauth.env`。

版本来自 [desktop package.json](../apps/desktop/package.json)，资源与最低系统配置见 [tauri.bundle.conf.json](../apps/desktop/src-tauri/tauri.bundle.conf.json)。

## 发布配置

正式发布在 macOS 上运行，要求 `APPLE_SIGNING_IDENTITY` 为真实签名身份，不能使用临时签名 `-`。公证凭据选择以下一组：

| 方式 | 环境变量 |
|---|---|
| Apple ID | `APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID` |
| App Store Connect API | `APPLE_API_ISSUER`、`APPLE_API_KEY`、`APPLE_API_KEY_PATH` |

证书和公证凭据由发布进程环境提供，不写入仓库或安装包。

必须提供 `PI_HARNESS_GITHUB_CLIENT_ID`，对应 GitHub OAuth App 需启用 Device Flow。打包时优先取进程环境，缺失时取仓库根 `.env`。桌面应用登录不打包 Client Secret，也不使用普通 Web 的固定端口授权码回调。

Provider API Key/OAuth、插件连接凭据，以及 macOS 辅助功能和屏幕录制权限由用户安装后配置。构建时的授权不代替目标机器的 TCC 权限。

## 命令与发布流程

在仓库根目录按需执行：

```sh
pnpm release:desktop
```

[release.mjs](../apps/desktop/scripts/release.mjs) 检查操作系统、Node 和发布凭据，设置发布标志及 App 版本，再调用 Tauri 生成 App/DMG。Tauri 的 `beforeBuildCommand` 执行 `prepare:bundle`，先构建 Web，再运行 [prepare-bundle.mjs](../apps/desktop/scripts/prepare-bundle.mjs)：

1. 使用 `pnpm deploy --prod --legacy` 和 hoisted linker 准备 daemon 部署目录。
2. 生成只含 GitHub Client ID 的 `desktop-oauth.env`。
3. 构建 Rust helper，生成 Computer Use App 与 Swift overlay，按正式身份签名。
4. 复制 Node/helper 到 Tauri 架构 sidecar 目录，校验源码、依赖、静态页面与二进制输入存在。

正式脚本随后检查 App 深层签名、Gatekeeper、App 公证票据和 DMG 完整性。

产物位置：

```text
apps/desktop/src-tauri/target/release/bundle/macos/PI Harness.app
apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg
```

`pnpm build:desktop` 使用相同 bundle 配置与准备脚本，但不执行 `release.mjs` 的正式凭据前检和发布后校验；生成产物仍需正式发布流程确认后再交付。当前没有额外上传或自动发布步骤。

## 安装后的运行与数据

[Tauri 入口](../apps/desktop/src-tauri/src/main.rs) 为每次启动选择 `127.0.0.1` 动态端口、生成随机令牌，启动内置 Node，等待最多 15 秒的 `/api/health`。WebView 先访问 `/__desktop/bootstrap#<token>`，daemon 将令牌换为本地 HttpOnly Cookie，再进入同源 Web。静态资源与 `/api` 由同一 daemon 端口提供。

运行数据写入 `~/.pi-harness`，包括 SQLite、JSONL、凭据、全局 Skill、Sandbox 设置与模型缓存。升级安装包不会重写该目录；旧版本使用其他数据目录时不自动合并，需关闭旧应用、备份完整目录后迁移。

退出时，壳调用受令牌保护的 `/__desktop/shutdown`，等待 daemon 最多 5 秒，未退出则终止 sidecar。正式交付仍需在目标机器验证启动、GitHub Device Flow、Provider 配置、运行恢复与 Computer Use 权限；签名/公证检查不覆盖这些产品流程。
