const MAX_PREFIX_PARTS = 16;
const MAX_PREFIX_PART_LENGTH = 256;

/**
 * 下面的Set是对模型建议的 prefixRule 做安全过滤的，不是已授权命令列表
 */
// 允许保存单词级规则，例如 ["pwd"]、["ls"]。其他单词规则如 ["git"] 范围太大，会被拒绝
const SAFE_SINGLE_COMMANDS = new Set(["date", "ls", "pwd", "uname", "whoami"]);
// 禁止为 Shell、解释器和高风险命令保存规则，例如 rm、sudo、bash、python、node。它们仍可“允许一次”。
const BANNED_COMMANDS = new Set([
  "bash",
  "dd",
  "env",
  "eval",
  "exec",
  "fish",
  "mkfs",
  "node",
  "npx",
  "osascript",
  "perl",
  "php",
  "powershell",
  "pwsh",
  "python",
  "python3",
  "rm",
  "rmdir",
  "ruby",
  "sh",
  "shutdown",
  "su",
  "sudo",
  "unlink",
  "xargs",
  "zsh",
]);
// 禁止持久允许 git reset、git push、git clean 等高风险 Git 操作
const BANNED_GIT_SUBCOMMANDS = new Set([
  "checkout",
  "clean",
  "merge",
  "push",
  "rebase",
  "reset",
  "restore",
]);
/**
 * COMMAND_RUNNER_SUBCOMMANDS 和 COMMAND_RUNNERS 联合使用，阻止过宽规则：
 *  ["pnpm", "run"]             // 拒绝，能执行任意 script
    ["pnpm", "run", "typecheck"] // 允许保存
 */
// 容易扩大执行范围的子命令，如 run、exec、dlx
const COMMAND_RUNNER_SUBCOMMANDS = new Set(["dlx", "exec", "run", "x"]);
// 包管理器/命令执行器，如 npm、pnpm、yarn
const COMMAND_RUNNERS = new Set(["bun", "npm", "pnpm", "yarn"]);

export type CommandPrefixRule = readonly string[];

function commandName(command: string): string {
  return command.split("/").at(-1)?.toLocaleLowerCase() ?? command.toLocaleLowerCase();
}

function startsWithPrefix(command: readonly string[], prefix: CommandPrefixRule): boolean {
  return prefix.length <= command.length && prefix.every((part, index) => command[index] === part);
}

/**
 * 只解析不含 Shell 控制符、展开、引用或重定向的单条命令。
 * 复杂命令继续逐次审批，避免用不完整的 Shell 解析器扩大授权范围。
 */
function parseSimpleCommand(command: string): readonly string[] | null {
  const trimmed = command.trim();
  if (!trimmed || /[\0\r\n;&|<>(){}[\]$`'"\\*?!#]/u.test(trimmed)) return null;
  const parts = trimmed.split(/\s+/u);
  if (/^[A-Za-z_][A-Za-z0-9_]*=/u.test(parts[0] ?? "")) return null;
  return parts;
}

const DESTRUCTIVE_COMMANDS = new Set(["rm", "rmdir", "del", "erase", "rd", "remove-item"]);

/** 关键删除即使在 full_access 下也必须逐次审批；复杂 Shell 删除默认按危险处理。 */
export function isCriticalDestructiveCommand(command: string, workspaceRoot: string): boolean {
  const normalizedRoot = workspaceRoot.replaceAll("\\", "/").replace(/\/$/u, "");
  if (/\bgit\s+clean\b[^\r\n;&|]*(?:\s-f|\s--force)/iu.test(command)) return true;
  if (/\bfind\s+(?:\.|\.\/|\/)[^\r\n;&|]*\s-delete\b/iu.test(command)) return true;
  if (!/(?:^|[;&|\r\n])\s*(?:sudo\s+)?(?:rm|rmdir|del|erase|rd|remove-item)\b/iu.test(command)) {
    return false;
  }
  const lower = command.toLocaleLowerCase().replaceAll("\\", "/");
  const hasRecursiveFlag = /(?:^|\s)(?:-[a-z]*r[a-z]*|--recursive|\/s)(?:\s|$)/iu.test(lower);
  const targetsRoot =
    /(?:^|\s)(?:\.{1,2}|\.\/|\.\/\*|\.\*|\*|\/)\/?(?:\s|$)/u.test(lower) ||
    lower.includes(normalizedRoot.toLocaleLowerCase());
  const first = lower.trim().split(/\s+/u)[0]?.split("/").at(-1) ?? "";
  return (
    (hasRecursiveFlag && targetsRoot) ||
    (!parseSimpleCommand(command) && DESTRUCTIVE_COMMANDS.has(first))
  );
}

export function isCommandPrefixRule(value: unknown): value is CommandPrefixRule {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_PREFIX_PARTS &&
    value.every(
      (part) =>
        typeof part === "string" && part.length > 0 && part.length <= MAX_PREFIX_PART_LENGTH,
    )
  );
}

export function isPersistableCommandPrefixRule(value: unknown): value is CommandPrefixRule {
  if (!isCommandPrefixRule(value)) return false;
  const name = commandName(value[0] ?? "");
  if (BANNED_COMMANDS.has(name)) return false;
  if (value.length === 1) return SAFE_SINGLE_COMMANDS.has(name);
  const subcommand = value[1]?.toLocaleLowerCase();
  if (name === "git" && subcommand !== undefined && BANNED_GIT_SUBCOMMANDS.has(subcommand)) {
    return false;
  }
  return !(
    COMMAND_RUNNERS.has(name) &&
    subcommand !== undefined &&
    COMMAND_RUNNER_SUBCOMMANDS.has(subcommand) &&
    value.length < 3
  );
}

export function isCommandAllowedByPrefixes(
  command: string,
  prefixes: readonly CommandPrefixRule[],
): boolean {
  const parts = parseSimpleCommand(command);
  return parts !== null && prefixes.some((prefix) => startsWithPrefix(parts, prefix));
}

export function readApplicableCommandPrefix(
  command: string,
  value: unknown,
): CommandPrefixRule | null {
  if (!isPersistableCommandPrefixRule(value)) return null;
  const parts = parseSimpleCommand(command);
  return parts !== null && startsWithPrefix(parts, value) ? [...value] : null;
}
