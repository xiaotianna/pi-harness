# computer-use

macOS 本地 Computer Use 执行层。TypeScript 负责 Agent Tool、JSONL RPC、超时和中止；长期驻留的 Rust helper 负责 Accessibility Tree、单帧窗口截图与输入事件。

## 为什么使用 Rust

原生层要持有 AX 元素句柄、编码截图并调用 macOS C/Objective-C Framework。Rust 可以把平台对象和不安全边界限制在 helper 内；TypeScript daemon 不加载原生 ABI，也不会因原生崩溃一起退出。Go 在这里需要更多 cgo/Objective-C 桥接，收益不大。

## 给模型的数据

`computer_observe` 返回两个 content block：

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

这不是屏幕共享或视频流。每次观察只通过 ScreenCaptureKit 获取当前前台窗口的一帧；模型执行动作后再次观察。AX 树负责语义和可操作元素，截图负责画布、自绘控件和布局判断。

## 安全边界

- 元素编号只在同一 `scopeId + observationId` 中有效；一次成功动作后立即失效。
- 观察超过 120 秒、前台应用改变、元素不存在或坐标落在观察窗口外时拒绝动作。
- 坐标是 macOS 全局逻辑坐标；`screenshotFrame.scale` 只描述截图像素与逻辑坐标的比例。
- AX 树限制深度、节点数和字符数，截图最长边限制在 1920 × 1200 范围内，RPC 响应限制为 24 MiB。
- secure text field 不回传值；截图 base64 只存在于 Tool content，不在 `details` 中重复保存。
- `computer_observe` 和 `computer_act` 都是串行工具，并分别导出 `computerObservePolicy` / `computerActPolicy`。它们通过通用 `USER_APPROVAL` 策略自行定义审批信息；除 `full_access` 外不会自动放行。

## 构建与使用

要求 macOS 14+、Rust toolchain，并为 helper 授予“辅助功能”和“屏幕与系统录制”权限。

```sh
pnpm --filter @pi-harness/computer-use native:build
```

Cargo 构建脚本会为 helper 写入 macOS 系统 Swift runtime search path。

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

启用工具时同时把 `COMPUTER_USE_SYSTEM_PROMPT` 注入 System Prompt，daemon 关闭时调用 `client.close()`。当前包刻意不自行接入 `AgentManager`：helper 的签名/安装路径、TCC 权限引导和 Tool Policy 审批 UI 必须由 daemon 产品层一次性装配，不能在 package 内绕过。
