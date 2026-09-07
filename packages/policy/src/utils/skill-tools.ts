import { isCommandAllowedByPrefixes } from "../command-policy.js";

const TOOL_ALIASES: Readonly<Record<string, string>> = {
  Bash: "run_command",
  Read: "read_file",
  Write: "write_file",
  Edit: "edit_file",
  Glob: "list_files",
  Grep: "search_text",
  WebFetch: "web_fetch",
  WebSearch: "web_search",
};

// Tool argument syntax is client-specific. Only simple Bash prefixes are portable here;
// unsupported selectors never grant permission, and shell operators never match a prefix.
export function matchesSkillTool(
  declarations: string | readonly string[] | undefined,
  toolName: string,
  args: unknown,
): boolean {
  if (
    typeof declarations === "string" &&
    declarations.trim() &&
    !/^[^\s()]+(?:\([^()]*\))?(?:\s+[^\s()]+(?:\([^()]*\))?)*$/.test(declarations.trim())
  )
    return false;
  const entries =
    typeof declarations === "string"
      ? (declarations.match(/[^\s()]+(?:\([^)]*\))?/g) ?? [])
      : (declarations ?? []);
  return entries.some((entry) => {
    const match = /^([^\s()]+)(?:\(([^()]*)\))?$/.exec(entry);
    if (!match?.[1] || (TOOL_ALIASES[match[1]] ?? match[1]) !== toolName) return false;
    if (match[2] === undefined) return true;
    if (toolName !== "run_command" || !match[2].endsWith(":*")) return false;
    const prefix = match[2].slice(0, -2).trim();
    if (!prefix || /[\0\r\n;&|<>(){}[\]$`'"\\*?!#]/u.test(prefix)) return false;
    if (
      typeof args !== "object" ||
      args === null ||
      !("command" in args) ||
      typeof args.command !== "string"
    )
      return false;
    return isCommandAllowedByPrefixes(args.command, [prefix.split(/\s+/u)]);
  });
}
