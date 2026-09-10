import { McpOAuthLaunchView, McpOAuthResultView } from "../features/settings/views/mcp-oauth-view";

export function McpOAuthLaunchPage({
  expectedRevision,
  name,
  serverId,
}: {
  expectedRevision: number | null;
  name: string;
  serverId: string;
}) {
  return <McpOAuthLaunchView expectedRevision={expectedRevision} name={name} serverId={serverId} />;
}

export function McpOAuthResultPage({
  message,
  name,
  status,
}: {
  message?: string | undefined;
  name: string;
  status: "error" | "success";
}) {
  return <McpOAuthResultView message={message} name={name} status={status} />;
}
