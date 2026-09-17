import { Avatar } from "@heroui/react";
import { memo, useMemo } from "react";
import { subAgentAvatarUrl } from "../utils/sub-agent-avatar";

export const SubAgentAvatar = memo(function SubAgentAvatar({
  executionId,
  className = "size-6",
}: {
  executionId: string;
  className?: string;
}) {
  const src = useMemo(() => subAgentAvatarUrl(executionId), [executionId]);
  return (
    <Avatar aria-hidden className={`shrink-0 ${className}`}>
      <Avatar.Image alt="" src={src} />
      <Avatar.Fallback>A</Avatar.Fallback>
    </Avatar>
  );
});
