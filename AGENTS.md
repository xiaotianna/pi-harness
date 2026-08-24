# PI Harness 开发约定

## 项目目标

PI Harness 是一个本地优先的 Agent Harness：通过浏览器提供 Codex 风格的交互界面，由运行在用户本机的后端 daemon 执行模型调用、Agent Loop、本地文件操作和 Shell 命令。

完整架构说明见 `架构设计.md`。实现与文档发生冲突时，先更新设计并保持两者一致，不要静默引入另一套架构。

## 架构原则

- 采用 `React Web + Fastify Local Daemon + pi-agent-core + pi-ai + SQLite + Session JSONL`。
- 项目是 pnpm workspace 管理的 TypeScript Monorepo，但运行时保持模块化单体，不拆微服务。
- Web 仅负责页面呈现和用户交互；文件系统、Shell、模型凭据、Agent 状态与持久化只能存在于 daemon。
- daemon 默认只监听 `127.0.0.1`，不得默认绑定 `0.0.0.0`。
- Web 与 daemon 通过 HTTP API 和 SSE 通信。普通操作使用 HTTP，Agent 增量事件使用 SSE。
- 不直接使用 `pi-coding-agent`，不引入 Commander、TUI、Electron 或 Tauri。
- Agent Loop 使用 `@earendil-works/pi-agent-core` 的 `Agent`，模型与 Provider 使用 `@earendil-works/pi-ai`。
- 不将 Pi 原始事件直接暴露给 Web；必须转换为项目自己的 `HarnessEvent` 协议。
- 第一阶段不实现云端服务、多 Agent、MCP、Skill 市场、完整 IDE 或内嵌终端。

## 技术栈

- Node.js 24 LTS
- TypeScript strict + ESM
- pnpm workspace
- Fastify + TypeBox
- `@earendil-works/pi-agent-core`
- `@earendil-works/pi-ai`
- React + Vite
- TanStack Router
- TanStack Query
- Zustand
- Tailwind CSS v4
- HeroUI v3（`@heroui/react`）作为唯一基础组件库，HeroUI Pro 组件使用兼容包 `@agile-avocation/ui-pro`
- Motion，负责页面和业务状态动画
- Animate UI，仅用于少量动画组件补充
- Lucide React
- react-resizable-panels
- `@tanstack/react-virtual`
- SQLite，通过 `node:sqlite`
- Session JSONL，通过 `node:fs` 按会话顺序追加
- pino
- execa
- chokidar
- ripgrep
- Biome，用于格式化和静态检查

不要在同一职责上重复引入同类库。例如已经使用 TypeBox 时，不再为普通 API DTO 引入 Zod；已经使用 pino 时，不再引入另一套日志框架；已经使用 HeroUI 时，不再混用 shadcn/ui、Flowbite、daisyUI 或 Mantine 作为另一套基础组件库。

## 项目 Skill 引用

- 修改、生成或评审 Web UI 时，必须先阅读 `.agents/skills/heroui-pro-design-taste/SKILL.md`，遵循项目的 HeroUI 视觉与样式规范。
- 使用 `@heroui/react` 组件时，必须先阅读 `.agents/skills/heroui-react/SKILL.md`，并按其中的 HeroUI v3 API、复合组件和文档查询约定实现。
- Skill 规范与通用经验冲突时，以项目内 Skill 为准；不得套用 shadcn/ui 的视觉习惯或组件写法。

## 依赖管理规范

- 项目统一使用 pnpm，不使用 npm、Yarn 或 Bun 修改依赖和锁文件。
- `pnpm-workspace.yaml` 必须保持 `catalogMode: strict`，防止 workspace package 绕过 Catalog 使用其他版本。
- 所有第三方依赖版本统一定义在 `pnpm-workspace.yaml` 的默认 `catalog` 中。
- workspace 内各 `package.json` 引用第三方依赖时统一使用 `catalog:`，禁止直接写 `^1.2.3`、`latest`、URL 或其他版本范围。
- Monorepo 内部 package 依赖统一使用 `workspace:*`，禁止通过 npm registry 版本引用本仓库 package。
- 新增第三方依赖时，先把依赖和版本范围加入 Catalog，再在实际使用它的 package 中添加 `catalog:` 引用。
- 依赖只添加到实际使用它的 package。不要因为多个 package 可能使用就全部放到根目录。
- 运行时需要的包放入 `dependencies`，只参与类型检查、构建或开发工具链的包放入 `devDependencies`。
- 不手动编辑 `pnpm-lock.yaml`。依赖声明变化后由 pnpm 更新锁文件。
- 保持 `cleanupUnusedCatalogs: true`，让 pnpm 安装时清理已没有 package 引用的 Catalog 项。
- 升级共享依赖时只修改 Catalog，并检查所有引用它的 workspace package 是否仍然兼容。

## 目标目录结构

```text
apps/
├── daemon/                 # 本地后端进程、HTTP API、SSE、配置与持久化
│   └── src/
│       ├── config/         # daemon 运行时配置与环境变量校验
│       ├── routes/         # Fastify 路径与 schema 声明
│       ├── controllers/    # HTTP 请求、Cookie 与重定向处理
│       ├── dto/            # HTTP 请求参数模型与 TypeBox schema
│       ├── services/       # OAuth、会话等应用服务
│       ├── storage/        # 当前 daemon 私有的 SQLite、migrations 与 session JSONL
│       ├── utils/          # 小型无状态基础工具
│       ├── vo/             # HTTP 响应模型与 TypeBox schema
│       └── server/         # Fastify 实例装配
└── web/                    # React 页面
    └── src/
        ├── app/            # 应用入口、Provider、Router 和全局初始化
        ├── pages/          # 路由页面，只负责页面级组合
        ├── features/       # 按业务领域组织的组件、hooks、状态和 API
        ├── components/     # 无业务语义的通用 UI 组件
        ├── shared/         # Web 内跨 feature 的常量、参数、工具和类型
        └── api/            # HTTP/SSE 基础客户端

packages/
├── agent-runtime/          # AgentManager、Agent 创建、上下文和事件适配
├── providers/              # 创建 pi-ai Models、按需加载内置 Provider 和导出自定义 Provider 能力
├── tools/                  # tools：文件、Shell、Planner、Todos；skills：发现、加载与选择
└── policy/                 # 路径保护、命令策略和用户审批
```

新增代码应放入职责最接近的模块。不要把业务逻辑堆积在 Fastify route、React 页面或 `bootstrap.ts` 中。

## 模块依赖边界

- `apps/web` 只能依赖浏览器安全的包，不得导入 daemon 源码、Node API、`pi-ai`、`pi-agent-core`、daemon storage 或 tools。
- Fastify route 只负责声明路径、schema 和 controller；controller 映射 HTTP 请求与响应，service 处理业务流程。
- `agent-runtime` 负责编排，不直接实现文件读写或 SQL。
- `tools` 不直接操作 Web、SSE 或数据库事务；工具进度通过回调或领域事件上报。
- `apps/daemon/src/storage` 只负责当前 daemon 的持久化，不包含 OAuth 流程、Agent 调度、权限判断或 UI 逻辑；出现第二个真实消费者前不提前拆成 workspace package。
- `policy` 是所有副作用操作的统一入口。审批不能散落在 route 或具体页面中。
- 避免循环依赖；类型放在实际消费它的应用或领域中，出现明确的第二个运行时消费者前不提前提取 workspace package，也不创建无边界的 `utils` 大杂烩。

## TypeScript 规范

- 开启 `strict`、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`。
- 使用 ESM 和显式 `type` 导入：`import type { Foo } from "..."`。
- 禁止使用 `any`。外部输入先视为 `unknown`，验证后再进入业务层。
- 对外部输入、配置、HTTP 参数和工具参数使用 TypeBox schema 校验。
- 优先使用可辨识联合类型表达状态，不使用多个布尔值组合隐含状态。
- 领域 ID 使用清晰的类型名，例如 `SessionId`、`RunId`、`ToolCallId`，避免在核心逻辑里混用裸字符串。
- 函数保持单一职责；副作用集中在边界模块，领域判断尽量写成纯函数。
- 异步操作应支持 `AbortSignal`。Shell、模型流、审批等待和文件扫描都必须可取消或超时。
- 不忽略 Promise，不使用空的 `catch`，不把错误转换成看似成功的返回值。
- 优先使用具名导出。仅在框架约定或确有必要时使用默认导出。
- 不创建只做无意义转发的 wrapper，也不为假想需求提前抽象。

## 辅助函数与 Prompt 规范

- 与业务无关的对象、数组、字符串等通用判断与转换优先直接使用 `es-toolkit`，不得重复手写，也不得为单个库函数创建 `is-record.ts` 一类的本地转发文件；现有依赖不具备能力时，按依赖管理规范引入合适的第三方库。
- 业务相关的判断、解析和转换辅助函数必须放入所属 app 或 package 的 `utils`，不得混入事件协议、编排器、route、页面或组件文件，也不得为了复用而提前抽到独立 workspace package。
- 模型和 Agent 使用的 System Prompt、内部 Prompt、Prompt 片段及其协议标记统一放入所属模块的 `prompts` 目录；业务流程只负责组合或引用。

## 枚举、常量与参数规范

- 默认不使用 TypeScript `enum` 或 `const enum`。优先使用 `as const` 对象加联合类型，保证运行时值、类型推导和序列化结果一致。
- 枚举值使用稳定、可传输的英文字符串，不使用数字序号，也不依赖声明顺序。
- 枚举对象使用 `PascalCase`，枚举成员使用 `UPPER_SNAKE_CASE`，对应类型同样使用 `PascalCase`。
- 示例：

```ts
export const RunStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  ABORTED: "aborted",
} as const;

export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];
```

- 不在业务代码中散落字符串状态，例如 `status === "running"`。统一引用 `RunStatus.RUNNING`。
- daemon 在 API 边界使用 TypeBox schema；Web 对实际消费的响应进行最小校验。当前不为共享状态、错误码或 API 参数单独建立 protocol package。
- 仅 daemon 使用的常量放在其所属 package 内；仅 Web 使用且被多个 feature 或页面复用的常量放在 `apps/web/src/shared/constants`。
- 只在单个文件中使用、语义明确且不会变化的值可以保留为文件级常量，不要为了抽离而制造全局常量。
- 同一个常量被两个及以上页面或 feature 使用时必须抽离，不允许复制定义。
- 跨页面复用的分页参数、排序字段、筛选项、路由参数键、Query Key 和默认值必须集中定义。
- TanStack Query Key 使用集中式工厂，不在组件中直接拼接数组：

```ts
export const sessionQueryKeys = {
  all: ["sessions"] as const,
  list: (workspaceId: string) => [...sessionQueryKeys.all, "list", workspaceId] as const,
  detail: (sessionId: string) => [...sessionQueryKeys.all, "detail", sessionId] as const,
};
```

- URL search 参数必须由统一 schema 解析并提供默认值，页面和组件不得各自解析同一参数。
- 不把文案、样式类名、一次性布尔值或仅为缩短代码的字面量随意提升为全局常量。
- 常量名称表达业务含义，不使用 `VALUE`、`DATA`、`CONFIG`、`OPTIONS` 等缺少上下文的泛化名称。

## 命名规范

- 文件和目录使用 `kebab-case`。
- React 组件、类、类型和接口使用 `PascalCase`。
- 函数、变量和实例使用 `camelCase`。
- 全局常量使用 `UPPER_SNAKE_CASE`。
- 事件名称使用稳定的点分格式，例如 `run.started`、`message.delta`、`tool.completed`。
- HTTP 路径使用小写复数资源名，例如 `/api/sessions/:sessionId/runs`。
- 工具名称使用 `snake_case`，例如 `read_file`、`edit_file`、`run_command`。
- 布尔值使用 `is`、`has`、`can`、`should` 前缀，避免含义不清的 `flag`。

## Agent 与 Provider 规范

- 每个 session 对应一个 `Agent` 实例；一个 session 同时只能存在一个活动 run。
- 同一 workspace 默认只允许一个写入型 run，避免多个 Agent 同时覆盖本地文件。
- Provider 按需注册，优先使用 `@earendil-works/pi-ai/providers/<provider>`，不要默认导入所有 Provider。
- `pi-ai Models` 是唯一的 Provider/Model 运行时注册表，不创建只转发其方法的自定义 Registry 类。
- 用户自定义 Provider 由 daemon 校验配置后，通过 `pi-ai createProvider()` 和已有 lazy API 实现创建；`packages/providers` 不重复定义配置 DTO 或校验逻辑。
- 自定义 Provider 的非敏感配置保存在 SQLite，凭据通过 daemon 的独立 `CredentialStore` 保存，不得混入 `provider_settings`。
- Provider API Key 和 OAuth credential 只能保存在 daemon，禁止发送到 Web 或写入日志。
- Web 只能获得 Provider 是否已认证等脱敏状态。
- Agent 恢复时从 SQLite 读取 session 元数据，从该 session 的 JSONL 读取完整消息后注入 `Agent`。
- 通过 `Agent.subscribe()` 适配事件；完整消息、工具结果、审批、文件变化和 run 状态只追加到 session JSONL，不持久化每个 token delta。
- `message.delta` 只用于实时 SSE；重连后由 session 快照恢复完整消息。
- 使用 `beforeToolCall` 接入权限与审批，使用 `afterToolCall` 记录审计结果。
- 使用 `transformContext` 处理工具输出截断和上下文裁剪，不在 route 中修改消息上下文。
- Agent 运行中的停止、转向和追加分别使用 `abort()`、`steer()` 和 `followUp()`，不要另造不一致的队列机制。

## 工具与安全规范

- 初始工具范围限定为 `read_file`、`list_files`、`search_text`、`edit_file`、`write_file` 和 `run_command`。
- 只读工具可以并行；写入工具和 Shell 工具必须串行执行。
- 每个 session 必须绑定不可变的 `workspaceRoot`。工具不得接受调用方任意覆盖工作目录。
- 所有文件路径在审批前和实际执行前都要进行规范化与 workspace 边界检查。
- 使用真实路径检查符号链接，拒绝访问 workspace 外部路径以及 daemon 凭据目录。
- 第一阶段所有文件写入和 Shell 命令都需要用户审批；只读、目录列举和文本搜索可以自动执行。
- 审批请求必须包含工具名、规范化后的目标、参数摘要、风险说明、session ID 和 run ID。
- 审批等待必须支持拒绝、超时、Agent abort 和 daemon 关闭。
- `run_command` 必须设置 cwd、超时、输出上限并传递 `AbortSignal`，不得创建无法追踪的后台进程。
- 工具失败时抛出有上下文的错误，由 Agent 转换为 tool error；不要把错误文本伪装成成功结果。
- 写文件前记录 before，成功后记录 after。Diff 使用该记录生成，不依赖 git 状态。
- 日志和错误响应必须移除 API Key、Authorization、Cookie、环境变量值和敏感文件内容。

## API 与 SSE 规范

- 所有 `/api/*` 输入在 route 边界验证，业务层不得接收未经验证的对象。
- API 错误使用稳定的错误码和安全的用户消息，详细堆栈只进入 daemon 日志。
- 不在错误响应中暴露绝对路径、凭据、命令环境或内部堆栈。
- SSE 事件统一使用：`id`、`seq`、`sessionId`、可选 `runId`、`timestamp`、`type`、`data`。
- 同一 session 的 `seq` 必须单调递增。客户端依赖它进行去重和排序。
- SSE 连接断开不得取消 Agent；只有明确的 abort API 才能取消 run。
- 保持 HTTP route 薄层，不在 handler 内直接创建 Agent、执行 SQL 或读写文件。
- daemon 必须校验 Host 和 Origin，并限制为本地来源。涉及状态变更的请求应使用同源校验和自定义请求头防止跨站调用。

## 持久化规范

### Session JSONL

- 每个 session 对应一个 `<sessionId>.jsonl`，文件位于 SQLite 同级数据目录的 `sessions/` 下。
- JSONL 是对话、run、工具调用、审批和文件变更的唯一事实来源，SQLite 不存副本。
- 每行保存一个完整的 `HarnessEvent`；`message.completed.data` 保存完整 `AgentMessage`。
- `message.delta` 和 `tool.updated` 只通过 SSE 发送，不写入 JSONL。
- 同一 session 只允许串行追加，`seq` 必须严格递增；写入前必须校验 session ID 和目标路径。
- 恢复时逐行校验 JSON 和事件结构。只可丢弃崩溃留下的不完整末行；中间行损坏必须报错。

### SQLite

- 使用显式 migration，不在应用启动时根据 TypeScript 类型隐式修改表结构。
- SQL 访问集中在 repository，不允许 React、route 或工具直接执行 SQL。
- 表名和列名使用 `snake_case`，TypeScript 字段使用 `camelCase`，映射集中处理。
- SQLite 只保存认证、workspace、session 元数据、Provider 和应用设置等需要结构化查询的数据。
- `sessions` 表只保存轻量索引，不建立 `messages`、`runs`、`tool_calls`、`approvals` 或 `file_changes` 副本表。
- 会话写入先追加 JSONL，再更新 SQLite 索引；索引失败不得删除已持久化的会话记录。
- migration 必须向前兼容已有本地数据；破坏性迁移需要明确的数据转换步骤。
- 不在数据库中明文保存不必要的密钥。凭据存储与普通应用数据分离。

## React 规范

- 页面负责组合 feature，不直接发起底层 fetch；HTTP/SSE 客户端统一放在 API 层。
- HeroUI v3 是项目唯一的基础组件库，Button、Input、Select、Modal、Popover、Tooltip、Tabs、Accordion、Menu 和 Toast 等基础交互优先使用 HeroUI。
- 所有界面内容，包括交互控件、信息展示、状态反馈和常见布局，都必须优先使用现有业务组件、通用 UI 组件、HeroUI 或兼容的 HeroUI Pro 组件实现；尽量不要自行编写带样式的原生 HTML 元素。
- 不得使用原生 `button`、`input`、`select`、`textarea`、`table`、`dialog` 等元素重复实现组件库已经提供的能力，也不得通过给原生元素堆叠 Tailwind 类名来仿造现有 UI 组件。`div`、`span`、`p` 等原生元素仅可用于组件库没有对应抽象的必要语义结构或基础布局，且样式必须保持最少。
- 开始实现界面前必须先检查项目现有组件、HeroUI 和兼容的 HeroUI Pro 是否已有合适组件；同一视觉或交互模式出现两次及以上时，必须提取到 `components` 或对应 feature 内作为可复用 UI 组件。
- 项目 UI 全局不使用 `ring` 视觉。禁止添加 `ring-*`、`focus:ring-*`、`focus-visible:ring-*`、`data-[focus-visible]:ring-*` 或通过 `box-shadow` 仿造 ring；HeroUI、HeroUI Pro 和 React Aria 组件自带的 ring 也必须在全局主题层统一清除。
- 需要表达键盘焦点时使用不改变控件尺寸的背景色、文字色或透明度变化，不使用 ring、额外边框或外描边。HeroUI 组件的 `className` 默认只补充业务布局、尺寸和必要间距，不额外添加边框、阴影、焦点、悬停或按压效果；除 ring 外的组件状态视觉交给 HeroUI 自身实现。
- 项目使用已购买的第三方 HeroUI Pro 兼容包 `@agile-avocation/ui-pro`，不得安装、导入或替换为官方包 `@heroui-pro/react`。HeroUI Pro 文档中的 `@heroui-pro/react` 导入示例在本项目中统一改为从 `@agile-avocation/ui-pro` 导入。
- 使用 Pro 组件前先查阅 [HeroUI Pro React 组件文档](https://heroui.pro/docs/react/components)，以其中的组件清单、结构、属性和示例为准；同时结合本项目已安装版本的 TypeScript 类型与实际导出进行确认，不凭记忆猜测 API。
- Button、Input、Select、Modal、Popover、Tooltip、Tabs、Accordion、Menu、Toast 等基础组件继续使用 `@heroui/react`，并参考 [HeroUI React 基础文档](https://heroui.com/en/docs/react/getting-started)。不得为了使用 Pro 组件而重复实现或替换已有的 HeroUI 基础组件。
- 普通悬停、按压、弹出、折叠和进入退出效果优先使用 HeroUI 自带的 CSS transition 与状态属性，不为简单动画引入 JavaScript 动画。
- Motion 只用于会话切换、消息进入、Tool Call 状态变化、审批卡片、Diff 面板和共享布局等业务动画。
- Animate UI 仅作为特殊 Sheet、Animated Icon、Copy Button 等少量组件的补充。引入前确认 HeroUI + Motion 无法以更小成本实现。
- 图标统一使用 Lucide React。业务组件不得混入另一套风格不一致的图标库。
- 可调整布局面板统一使用 `react-resizable-panels`，长会话和大量事件列表统一使用 `@tanstack/react-virtual`。
- 所有动画必须尊重 `prefers-reduced-motion`。优先动画 `transform` 和 `opacity`，避免持续动画影响 Agent 流式输出性能。
- 不为了“更有动画感”给每个元素添加动效。动画必须表达进入、退出、状态变化、层级关系或操作反馈。
- 所有具有业务含义的组件必须放在 `apps/web/src/features/<feature-name>`，例如 session、conversation、approval、provider 和 file-change。
- `pages` 只负责路由级数据装配、布局和 feature 组合，不承载可复用业务逻辑，不堆积大段 JSX。
- `components` 只放按钮、弹窗、表格、空状态等无业务语义的通用 UI；包含 session、run、tool、approval 等领域词汇的组件不属于通用组件。
- 一个 feature 内优先按 `components`、`hooks`、`api`、`state`、`types` 和 `constants` 分层；只有确实存在对应内容时才创建目录。
- feature 私有实现不得被其他 feature 深层导入。跨 feature 只通过该 feature 的公开入口或提升到 `shared` 的稳定能力复用。
- 业务组件不得直接拼装 API 路径、SSE 事件名、Query Key、状态枚举或路由参数名，应引用集中定义的协议、常量和参数工厂。
- 服务端数据使用 TanStack Query，跨组件的纯 UI 状态使用 Zustand，组件局部状态保留在组件内部。
- 不把同一份服务端数据同时复制进 Query cache 和 Zustand。
- 按 feature 组织会话、消息、审批、模型和文件变化，不建立全局 `components` 垃圾场。
- 组件订阅 SSE 后只消费 `HarnessEvent`，不得识别 Pi 的原始事件类型。
- 流式文本更新应批量刷新，避免每个 token 都触发整个会话页面重渲染。
- 所有危险操作在界面中显示明确目标和后果，不能使用含义模糊的确认按钮。
- UI 必须正确呈现 loading、empty、streaming、error、aborted 和 awaiting-approval 状态。

## 错误、日志与可观测性

- 领域错误定义稳定 `code`，例如 `SESSION_BUSY`、`PATH_OUTSIDE_WORKSPACE`、`APPROVAL_REJECTED`。
- 在 API 边界统一把领域错误映射成 HTTP 状态，不在各 route 重复拼装错误响应。
- 使用 pino 结构化日志，并包含相关的 `sessionId`、`runId`、`toolCallId`，但不记录敏感参数。
- 预期错误使用 `warn` 或 `info`，真正的未处理异常使用 `error`。
- daemon 顶层必须处理未捕获异常和优雅关闭，停止接收新 run，并中止或等待活动任务。

## 代码质量与变更原则

- 先阅读相关模块和 `架构设计.md`，再修改代码。
- 新增常量、枚举、类型、协议或工具函数前必须先全仓搜索；已有实现必须直接复用。若模块或浏览器边界阻止直接引用，应由原所有者提供最小且边界安全的公开导出，禁止在消费者中复制定义；API 边界必需的运行时校验 Schema 不视为重复定义。
- 优先完成最小闭环，避免顺手加入未要求的框架、基础设施或产品功能。
- 修改共享协议时同步检查 daemon 和 Web 的所有消费者。
- 修改 Agent 事件映射时保持事件顺序、session ID、run ID 和 tool call ID 的关联。
- 修改文件或命令策略时，安全默认值必须是拒绝或请求审批，而不是静默放行。
- 不保留已废弃实现、注释代码或临时兼容分支；确需兼容时写清退出条件。
- 注释解释原因、约束和风险，不复述代码表面行为。
- 不自动新增测试文件，除非用户明确要求。
- 不自动执行 dev 或 build 命令，除非用户明确要求。
- 不自动执行任何 git 命令，除非用户明确要求。

## Git 提交规范

- 提交信息遵循 Conventional Commits，格式为 `<type>(<scope>): <subject>`。
- `scope` 应使用受影响的应用或 package 名称，例如 `web`、`daemon`、`agent-runtime`、`providers`、`tools`、`policy`、`deps` 或 `docs`。
- 允许的 `type`：
  - `feat`：新增用户可感知的功能。
  - `fix`：修复缺陷。
  - `refactor`：不改变外部行为的代码重构。
  - `perf`：性能优化。
  - `style`：仅格式、样式或无逻辑影响的调整。
  - `docs`：仅文档变更。
  - `chore`：工程配置、脚本或日常维护。
  - `build`：构建系统或构建依赖变更。
  - `ci`：持续集成配置变更。
  - `revert`：撤销已有提交。
- `subject` 使用简洁中文祈使句，直接描述本次变更，例如 `feat(web): 增加会话列表骨架`；结尾不加句号。
- 一个提交只表达一个完整目的。不要把重构、依赖升级、格式化和无关业务修改混在同一提交中。
- 提交前只暂存属于当前任务的文件，不覆盖或顺带提交用户已有的无关修改。
- 单纯依赖升级使用 `chore(deps)`；影响构建方式时使用 `build(deps)`。
- 破坏性变更在 type/scope 后添加 `!`，并在正文中使用 `BREAKING CHANGE:` 说明迁移方式，例如 `feat(daemon)!: 调整事件数据结构`。
- 需要解释背景、取舍或迁移步骤时，在标题后空一行书写正文；正文说明“为什么”，不要重复文件改动清单。
- 关联任务或问题放在 footer，例如 `Refs: #123`、`Closes: #123`。
- 不使用 `update`、`changes`、`fix stuff` 等无法表达意图的模糊提交信息。
- 不在提交信息中声称未实际完成或未验证的内容。
- 除非用户明确要求，否则不要自动执行 `git add`、`git commit`、`git push`、创建分支或改写提交历史。

## 完成标准

一次变更只有在以下条件满足时才算完成：

- 代码放在正确模块且没有破坏依赖边界。
- 外部输入已经验证，错误路径有明确处理。
- 长时间操作支持取消或超时。
- 涉及本地副作用时已经经过 workspace 边界检查和审批策略。
- Web 不接触模型凭据、本地文件 API 或 Pi 内部对象。
- 新增协议和持久化字段命名一致，能够关联 session、run 和 tool call。
- 文档与实际架构保持一致。
