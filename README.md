# PI Harness

PI Harness 是本地优先的 Agent Harness：React Web 或 Tauri 桌面薄壳提供交互界面，本机 Fastify daemon 负责模型调用、Agent Loop、工具、审批和持久化。底层使用 `@earendil-works/pi-agent-core` 与 `@earendil-works/pi-ai`。

## 当前实现

仓库已包含：

- 内置与自定义 Provider、API Key / OAuth、会话模型和响应偏好。
- Workspace、会话搜索与归档、结构化附件与文件引用、HTTP/SSE 流式对话、follow-up / steer。
- 文件与文档读取、公开网页读取、本机 SearXNG 搜索、文件修改和受监管命令。
- 统一审批、独立审批模型、SRT 沙箱、人工问答和 Markdown 计划确认。
- Skills、插件市场、MCP Host、工具检索与按需加载、可选 macOS Computer Use。
- Context checkpoint 压缩与恢复、长期记忆混合检索、Sub Agent 执行树和任务看板。
- 主/子 Agent Trace、用量统计、Context 评估入口与 Tauri 打包发布脚本。

各能力的范围和限制见对应文档。

## 文档导航

| 文档 | 内容 |
|---|---|
| [架构设计](docs/架构设计.md) | 当前模块边界、事件协议、Context、审批和持久化 |
| [Runtime Setup](docs/runtime-setup.md) | 启动配置、能力清单、数据路径和验证入口 |
| [Packages 功能划分](packages/包功能划分.md) | 各 workspace 包及浏览器安全出口 |
| [Sub Agent 核心设计](docs/Sub-Agent核心设计.md) | 委派、协作、模型、权限、预算和恢复 |
| [对话中的 Sub Agent](docs/对话Sub-Agent设计.md) | 思考链、侧边面板、独立轨迹和输入交互 |
| [任务看板](docs/任务看板与Sub-Agent设计.md) | 状态投影、执行绑定和用户确认 |
| [MCP 使用说明](docs/mcp-usage.md) | 连接、鉴权、工具加载及协议支持范围 |
| [Sandbox](packages/sandbox/README.md) | 命令隔离、网络规则和运行前提 |
| [Computer Use](packages/computer-use/README.md) | 原生 helper、macOS 权限、观察和输入边界 |
| [桌面端正式发布](docs/desktop-release.md) | 安装包、运行时、签名与公证 |
| [.env 加密备份](docs/env-encryption.md) | 本地配置的加密、解密和密钥管理 |
| [开发约定](AGENTS.md) | 工程、依赖、UI、安全与协作规范 |

## 本地运行

需要 Node.js 24+ 和 pnpm；仓库固定 `pnpm@10.33.2`。环境变量与 OAuth 配置先参照 [Runtime Setup](docs/runtime-setup.md)。以下命令由开发者按需执行：

```bash
pnpm install
pnpm dev
```

开发 Web 默认为 `http://127.0.0.1:5173`，daemon 默认为 `http://127.0.0.1:4310`。`pnpm dev` 使用项目 `.pi-harness`；daemon 默认及 `pnpm start` 使用 `~/.pi-harness`，`PI_HARNESS_DATABASE_PATH` 可以覆盖数据根。桌面开发与发布的命令及前提见专门文档。

## 文档维护

修改功能时同步其所属文档；模块边界、事件、持久化或权限变化同时更新架构设计。当前状态应附代码入口，待实现能力单列。内置插件的第三方 Skill 和参考资料按各自来源维护。
