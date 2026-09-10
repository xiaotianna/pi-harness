import {
  SkillOAuthLaunchView,
  SkillOAuthResultView,
} from "../features/skills/views/skill-oauth-view";

export function SkillOAuthLaunchPage({
  collectionId,
  name,
}: {
  collectionId: string;
  name: string;
}) {
  return <SkillOAuthLaunchView collectionId={collectionId} name={name} />;
}

export function SkillOAuthResultPage({
  message,
  name,
  status,
}: {
  message?: string | undefined;
  name: string;
  status: "error" | "success";
}) {
  return <SkillOAuthResultView message={message} name={name} status={status} />;
}
