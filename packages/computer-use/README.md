# computer-use

macOS 本地 Computer Use 执行层。TypeScript 提供 Agent Tool、受限 JavaScript 执行、JSONL RPC、超时和中止；长期驻留的 Rust helper 同时提供内置 MCP 服务，负责 Accessibility Tree、单帧窗口截图与输入事件。

## 为什么使用 Rust

原生层要持有 AX 元素句柄、编码截图并调用 macOS C/Objective-C Framework。Rust 可以把平台对象和不安全边界限制在 helper 内；TypeScript daemon 不加载原生 ABI，也不会因原生崩溃一起退出。Go 在这里需要更多 cgo/Objective-C 桥接，收益不大。

## 给模型的数据

`computer_list_apps` 可列出当前运行的应用；`computer_observe` 可用显示名称或 bundle ID 在后台找到/启动目标应用，并返回两个 content block：

1. 可选的 PNG `ImageContent`；
2. 一段 JSON 文本，其中 `accessibilityTree` 是可直接引用元素编号的缩进树。

```ts
{
  observationId: "obs-123-1",
  screenshot: { type: "image", mimeType: "image/png", data: "...base64..." },
  screenshotFrame: { x: 120, y: 80, width: 800, height: 600, scale: 2 },
  accessibilityTree: `0 window "计算器" [x=120 y=80 width=800 height=600]
  1 text-field "0"
  2 button "清除"
  3 button "等于"`,
}
```

这不是屏幕共享或视频流。每次观察通过 ScreenCaptureKit 获取目标窗口的一帧；模型执行动作后再次观察。AX 树负责语义和可操作元素，截图负责画布、自绘控件和布局判断。动作位置显示独立绘制的 AI 光标，背景有柔和呼吸动效，停住后轻微左右摆动；它不接管用户的实体光标，闲置 12 秒后隐藏，并遵循系统的减少动态效果设置。

## 安全边界

- 元素编号只在同一 `scopeId + observationId` 中有效；一次成功动作后立即失效。
- 每个动作仍会校验目标应用 PID、目标窗口 ID 和窗口尺寸；定向键鼠输入还会复查应用内的焦点窗口，不要求目标应用保持前台。
- 观察超过 120 秒、目标窗口改变、元素不存在或坐标落在观察窗口外时拒绝动作。
- 坐标是 macOS 全局逻辑坐标；`screenshotFrame.scale` 只描述截图像素与逻辑坐标的比例。
- AX 树限制深度、节点数和字符数，截图最长边限制在 1920 × 1200 范围内，RPC 响应限制为 24 MiB。
- secure text field 不回传值；截图 base64 只存在于 Tool content，不在 `details` 中重复保存。
- `computer_exec` 在普通审批模式下使用 SRT 隔离的持久化 JavaScript 子进程，完全访问下直接启动宿主机子进程；两种模式都通过受限 JavaScript 上下文只暴露 `cua` 能力对象，禁用动态代码生成，不提供 Node、Shell、文件系统或网络对象，并限制为 25 个输入动作、50 个步骤和 30 秒。
- `computer_observe` 和 `computer_act` 都是串行工具，并分别导出 `computerObservePolicy` / `computerActPolicy`。它们通过通用 `USER_APPROVAL` 策略自行定义审批信息，完全访问下自动放行。
- 通过插件 MCP 接入时，daemon 只按稳定 bundle ID 保存应用观察授权；非完全访问模式下，`computer_exec` 的一次批准只覆盖当前脚本，选择“本次会话允许”后，同一 Run 内针对该应用的后续脚本可继续执行；请求批准模式下，单步 `computer_act` 仍逐次审批。

## 脚本执行

Computer Use MCP 启用且同时提供观察和动作能力时，daemon 会额外注册 `computer_exec`：

```js
const before = await cua.observe();
if (before.accessibilityTree.includes("继续")) {
  return await cua.press({ elementId: 12 });
}
return before;
```

每个动作完成后运行时会通过 helper 自动重新观察，脚本拿到的元素编号始终来自最新状态。需要跨 `computer_exec` 调用保存的值放在 `globalThis`。
`computer_exec` 复用当前 Computer Use MCP 连接和已驻留的 helper，不会另起一份原生 helper；脚本运行时关闭时也不会关闭共享 MCP 客户端。
所有 `cua` 调用都必须 `await`；脚本结束时仍有未完成的电脑操作会失败并重置运行时，避免悬空 RPC 影响后续调用。沙箱不提供 `cua.find`、`cua.elements`、`setTimeout` 或 `console.error`，等待使用 `cua.wait(ms)`。

## 构建与使用

要求 macOS 14+、Rust toolchain 和 Xcode Swift 编译器。构建命令同时生成命令行代理、独立的 `PI Harness Computer Use.app` 和不激活应用的 AI 光标浮层；daemon 可独立运行，通过命令行代理用系统 Launch Services 启动后台 App，桌面端也使用同一后台 App。系统权限授予的是“PI Harness Computer Use”，不依赖浏览器、VS Code 或桌面窗口。

```sh
pnpm --filter @pi-harness/computer-use native:build
```

Cargo 构建脚本会为 helper 写入 macOS 系统 Swift runtime search path。未设置签名身份且未找到名为 `PI Harness Local Code Signing` 的本地证书时，开发包使用临时签名；修改原生代码后重建会改变应用身份，macOS 可能保留旧的已开启开关，却拒绝新版本。先停止 daemon，在终端仅重置此应用的两项旧记录，然后重新启动 daemon，并在「设置 → 电脑操控」授权和刷新状态：

```sh
tccutil reset Accessibility com.piharness.computer-use
tccutil reset ScreenCapture com.piharness.computer-use
```

要让后续重建保留授权，可在钥匙串访问的「证书助理 → 创建证书」中创建一个「自签名根」身份、「代码签名」类型、名称为 `PI Harness Local Code Signing` 的本地证书；打包脚本会自动使用它，不需将证书设为系统信任根。也可安装 Apple Development 证书，并设置 `COMPUTER_USE_CODESIGN_IDENTITY` 为其 SHA-1，该变量优先于本地证书。切换到固定签名后还需按上述方式重置一次旧授权。正式分发使用稳定的 Apple 代码签名身份。
单独部署 daemon 时，把 `pi-computer-use-helper` 与 `PI Harness Computer Use.app` 放在同一目录，并用 `COMPUTER_USE_HELPER_PATH` 指向命令行代理；无需安装或启动 Tauri 桌面端。

桌面端打包会构建命令行代理 sidecar，并将后台 App 放在 `Contents/Helpers`。插件市场中的 Computer Use 包含一个 MCP 服务和一个 Skill；安装插件后分别开启它们即可接入 Agent Runtime。首次使用可在「设置 → 电脑操控」查看“辅助功能”和“屏幕与系统录制”状态，并由本地 daemon 调用后台 App 发起 macOS 授权；系统弹窗中的最终确认仍由用户完成。

## 调试

调试脚本启动后会等待 3 秒，这段时间切换到计算器等目标应用。默认只观察，不执行动作：

```sh
pnpm --filter @pi-harness/computer-use debug:client
pnpm --filter @pi-harness/computer-use debug:tools
```

确认 Accessibility Tree 中的元素编号后，可以显式测试一次 AX Press；动作完成后脚本会自动重新观察：

```sh
pnpm --filter @pi-harness/computer-use debug:client -- --press 2
pnpm --filter @pi-harness/computer-use debug:tools -- --press 2
```

截图写入 `/tmp/pi-computer-use-*.png`。可通过 `COMPUTER_USE_HELPER_PATH` 覆盖 helper 路径，通过 `COMPUTER_USE_DEBUG_DELAY_MS` 调整等待时间。

```ts
import {
  ComputerUseClient,
  createComputerActTool,
  createComputerObserveTool,
} from "@pi-harness/computer-use";

const client = new ComputerUseClient({
  helperPath: "/absolute/path/to/pi-computer-use-helper",
});

const tools = [
  createComputerObserveTool(client, sessionId),
  createComputerActTool(client, sessionId),
];
```

直接嵌入工具时同时把 `COMPUTER_USE_SYSTEM_PROMPT` 注入 System Prompt，daemon 关闭时调用 `client.close()`。通过插件 MCP 接入时 daemon 会在工具准备阶段自动注入这段上下文，并兼容部分 Provider 把 `computer_act.action` 输出为 JSON 字符串的情况；字符串解析后仍按原始动作 Schema 严格校验。所有调用继续经过 daemon 的 MCP Policy 与审批链。
