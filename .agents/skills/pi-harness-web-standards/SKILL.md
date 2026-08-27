---
name: pi-harness-web-standards
description: PI Harness 前端工程规范，约束 apps/web 的架构边界、目录职责、React 与 TypeScript 实现、组件选型与复用、HeroUI 和 HeroUI Pro 使用、数据与状态管理、HTTP 与 SSE、路由参数、样式、动效、性能、无障碍和验证。修改、生成、评审或重构任何 Web 前端页面、组件、Hook、状态、API 客户端或交互流程时使用；涉及 UI 时同时配合 heroui-react 与 heroui-pro-design-taste。
---

# PI Harness 前端规范

把本 Skill 作为 `apps/web` 的项目级工程规范。保持现有产品语言和架构边界，在满足功能的前提下优先复用、最小变更、清晰分层和可验证实现。组件使用规范只是本 Skill 的一个部分。

## 执行流程

1. 阅读仓库 `AGENTS.md` 和 `docs/架构设计.md` 中与当前任务相关的章节。
2. 完整阅读 [project-map.md](references/project-map.md) 与 [learned-rules.md](references/learned-rules.md)。
3. 涉及页面、组件、布局、样式或交互时，完整阅读 `.agents/skills/heroui-pro-design-taste/SKILL.md`；使用或修改 HeroUI 时，再完整阅读 `.agents/skills/heroui-react/SKILL.md` 并查询 v3 文档。
4. 检查相邻页面、所属 feature、已有组件、Hook、公开出口、API 封装、状态和共享工具，不根据文件名猜测实现。
5. 先确定职责归属、状态来源、组件层级和验证方式，再实施最小闭环；不要顺手重做未要求的界面或架构。
6. 仅运行与风险相称的格式、静态检查和类型检查。除非用户要求，否则不运行 dev、build、创建测试或执行 git 操作。
7. 完成前执行“对话自迭代”流程，把明确且可复用的新反馈沉淀到规则账本。

## 前端架构边界

- 让 `apps/web` 只承担浏览器交互，不导入 Node API、daemon 源码、storage、tools、`pi-ai` 或 `pi-agent-core`，也不持有模型凭据。
- 把应用入口、Provider、Router 和全局初始化放入 `app`。
- 让 `pages` 只负责路由级数据装配、布局和 feature 组合；不要在页面中直接发起底层 fetch 或堆积可复用业务逻辑。
- 把包含 session、conversation、run、tool、approval、provider、model、memory、skill、plugin、trace 或 file-change 语义的实现放入对应 `features/<feature-name>`。
- 把无业务语义、可跨 feature 复用的 UI 放入 `components`；不要建立全局组件垃圾场。
- 把 HTTP 与 SSE 基础客户端放入 `api`，把跨 feature 的稳定常量、参数、类型和小型工具放入 `shared`。
- 仅通过 feature 的公开入口跨 feature 复用，不深层导入另一 feature 的私有文件。
- 出现第二个真实消费者前不要提前创建 package、协议层或通用抽象。

## 文件、命名与导出

- 文件和目录使用 `kebab-case`；React 组件、类型和接口使用 `PascalCase`；函数与变量使用 `camelCase`；全局常量使用 `UPPER_SNAKE_CASE`。
- 新增常量、枚举、类型、协议或工具函数前先全仓搜索；已有实现必须复用。受模块或浏览器边界限制时，让原所有者提供最小且边界安全的公开导出，不在 Web 复制定义；API 边界必需的运行时校验 Schema 除外。
- 优先使用具名导出，仅在框架约定需要时使用默认导出。
- 使用显式 `type` 导入；保持 TypeScript strict、`noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes` 兼容。
- 不使用 `any`。把外部值视为 `unknown`，完成最小验证后再进入业务逻辑。
- 使用可辨识联合表达互斥状态，不用多个布尔值拼装隐式状态。
- 默认使用 `as const` 对象加联合类型，不使用 TypeScript `enum`。
- 不向可选属性无意义地显式传入 `undefined`；需要时使用条件展开保持精确可选属性语义。
- 让函数和组件保持单一职责；副作用留在 API、Hook 或边界模块，不创建无意义转发 wrapper。
- 与业务无关的通用辅助能力使用项目已有的第三方库实现，并在 `shared/utils` 或所属 feature 的 `utils` 统一适配，不在页面、组件或业务文件中重复手写。
- 业务相关的判断、解析和转换辅助函数放入所属 feature 或 `shared` 的 `utils`，不混入组件、事件协议或页面。
- 模型和 Agent 使用的 Prompt、Prompt 片段及其协议标记放入所属模块的 `prompts` 目录，调用方只负责组合或引用。

## 组件与 Hook 复用

按以下顺序选择实现，并在找到满足需求的层级后停止：

1. 所属 feature 已有业务组件或 Hook。
2. `apps/web/src/components` 中已有通用组件。
3. `@heroui/react` 的 HeroUI v3 基础组件。
4. `@agile-avocation/ui-pro` 中已安装的 HeroUI Pro 兼容复合组件。
5. Motion 或 Animate UI，仅补充组件库没有表达的业务状态变化。
6. 最小语义化原生 HTML，仅用于组件库没有抽象的结构或浏览器平台能力。

- 先兼容或扩展已有 Hook；只有继续扩展会耦合无关职责时才拆新 Hook。
- 同一视觉或交互模式出现第二次时抽取复用；不要为假想需求提前封装一次性布局。
- 把跨页面或跨 feature 的 Query Key、URL 参数、筛选项、排序字段和默认值集中管理。
- 不安装或导入 `@heroui-pro/react`；项目只使用兼容包 `@agile-avocation/ui-pro`。
- 使用 Pro 组件前查阅 HeroUI Pro 文档，并核对已安装版本的导出和 TypeScript 类型，不猜测 API。
- 使用 Gravity UI Icons 表达普通界面图标；没有语义等价图标时才使用 Lucide React。图标继承现有 HeroUI 语义色和业务状态 class；使用 `ModelProviderIcon` 表达 Provider 品牌。
- 具体场景与已有实现优先级见 [project-map.md](references/project-map.md)。

## HeroUI 与交互实现

- 使用 HeroUI v3 复合组件结构，不套用 v2 扁平 API，也不添加 `HeroUIProvider`。
- 对 React Aria 与 HeroUI 操作使用 `onPress`；仅在目标 API 明确要求时使用 `onClick`。
- 让组件管理 hover、pressed、focus、border 和 shadow 状态；`className` 主要补充外围布局、尺寸和必要间距。
- 使用语义 variant 与主题 token，不用带样式的原生 `button`、`input`、`select`、`textarea`、`table` 或 `dialog` 重做组件库能力。
- 仅在浏览器平台能力要求时使用原生交互元素，例如由 HeroUI Button 触发的隐藏文件输入框。
- 为纯图标操作同时提供 `aria-label` 和 Tooltip，并保证合理的点击区域。
- 对破坏性操作使用 `AlertDialog`，清楚说明目标和后果；对普通表单与复合流程使用 `Modal`。
- 把可预期的字段错误放在字段附近，把表单级校验放在表单内，把网络和非预期错误放入全局 Toast。
- 正确呈现 loading、empty、streaming、error、aborted、disabled 和 awaiting-approval 状态。

## 数据、状态与通信

- 使用 TanStack Query 管理 daemon 或服务端状态，使用 Zustand 管理跨组件纯 UI 状态，使用组件状态管理局部交互。
- 不把同一份服务端数据同时复制到 Query cache 和 Zustand。
- 让业务组件通过 feature API 或 Hook 获取数据，不在组件中拼接 API 路径、SSE 事件名或 Query Key。
- 使用集中式 Query Key 工厂和统一 URL search 参数 schema；页面与组件不要重复解析同一参数。
- 对 Web 实际消费的 API 响应进行最小验证，不把未经验证的外部数据直接交给 UI。
- 只消费项目 `HarnessEvent`，不识别 Pi 原始事件。按 `seq` 去重和排序，SSE 断线后从会话快照恢复。
- 批量刷新流式文本，避免每个 token 触发整个会话页面重渲染。
- 让异步请求、订阅和长时间操作支持取消或清理；不要忽略 Promise、使用空 `catch` 或把错误伪装成成功结果。

## 样式、布局与响应式

- 保持现有 4px/8px 间距节奏与语义化 surface、foreground、muted、accent、danger 等 token。
- 显式设置 flex 或 grid 子项对齐，不依赖图标、文字或不同元素的偶然 baseline。
- 避免重复 wrapper、边框、背景和阴影；父容器已经提供间距时，不在子项重复叠加。
- 需要用阴影提示滚动溢出的列表统一使用 HeroUI `ScrollShadow` 的内置阴影样式，不手写或叠加 `shadow-*`、渐变遮罩或 `box-shadow`。
- 让内联控件保持内容宽度，并提供合理的最小和最大宽度。
- 不添加 `ring-*`、`focus:ring-*`、`focus-visible:ring-*` 或模拟 ring 的 box-shadow。
- 让宽屏侧栏、移动端覆盖层、滚动容器和弹窗尺寸遵循已有 AppLayout 与 HeroUI 模式。
- 只在组件库没有对应抽象时使用 `div`、`span`、`p`、标题、列表、section 和 image 等语义或布局元素，并保持交互样式最少。
- 保持已经确认的产品视觉语言；局部修复不代表可以重做相邻页面。

## 动效与性能

- 普通 hover、press、popover、折叠和进入退出优先使用 HeroUI 自带 CSS transition。
- 会话切换、消息进入、Tool 状态、审批、Diff、检查器、Trace 详情和共享布局变化使用 Motion。
- 所有动画通过 `useReducedMotion` 或 `motion-reduce` 尊重 `prefers-reduced-motion`。
- 优先动画 `transform` 和 `opacity`，避免影响流式输出或长列表布局的持续动画。
- 大量消息和事件使用 `@tanstack/react-virtual`；可调面板使用项目既有 AppLayout 或 resizable panels 抽象。
- 对高频输入和 SSE 更新控制订阅范围、派生计算和重渲染边界，不为没有证据的性能问题提前复杂化。

## 完成检查

完成前逐项确认：

- 代码位于正确层级，没有破坏 Web 与 daemon 的边界。
- 没有重复现有组件、Hook、工具、状态或 feature 公开能力。
- 服务端状态、共享 UI 状态和局部状态归属正确。
- HeroUI 与 Pro API 已通过文档、源码或类型验证。
- 交互具备键盘、可访问名称、Tooltip、错误反馈和危险操作说明。
- 状态覆盖、响应式、滚动、缩放、减少动效和长列表性能符合场景。
- 样式没有引入 ring、第二套视觉系统或无关重设计。
- Biome 与相关 TypeScript 检查通过，或已明确说明环境阻塞。

## 对话自迭代

把用户对前端架构、代码组织、组件、交互、样式、状态或验证方式的明确反馈视为候选项目知识。

每次触发本 Skill 后：

1. 检查当前对话中的明确偏好、纠正、拒绝或确认模式。
2. 仅当反馈能影响未来前端任务时，更新 [learned-rules.md](references/learned-rules.md)。
3. 优先更新已有规则，避免重复；新指令冲突时，把旧规则标记为 `superseded` 并关联替代 ID。
4. 只记录简洁转述，不保存敏感信息或把对话完整复制为日志。
5. 不从沉默、Agent 自己未确认的选择、临时 mock、一次性 workaround 或偶然实现中学习。
6. 当用户明确声明为项目级规范，或同一规则在两个独立任务中得到确认时，把规则提升到 `SKILL.md` 或 [project-map.md](references/project-map.md)，并标记为 `promoted`。
7. 更新 Skill 后运行 skill-creator 的 `quick_validate.py`；若校验环境缺少依赖，执行等价结构校验并明确说明。
8. 在最终回复中说明本次新增、调整或提升了哪些规则。

当前用户请求优先于已学习规则，仓库指令优先于本 Skill。不得通过自迭代削弱无障碍、安全、架构边界或明确项目约束。
