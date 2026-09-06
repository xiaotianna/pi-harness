import { MagicWand } from "@gravity-ui/icons";
import { Alert, Skeleton } from "@heroui/react";
import type { ReactNode } from "react";
import { AssistantMarkdown } from "../../../components/ai/assistant-markdown";
import { SettingsCatalogDetail } from "./settings-catalog-detail";

export function SettingsSkillDetail({
  action,
  backLabel,
  content,
  contentError,
  description,
  icon,
  isContentPending,
  name,
  onBack,
  toolbarAction,
}: {
  action: ReactNode;
  backLabel: string;
  content: string | undefined;
  contentError: Error | null;
  description: string;
  icon?: ReactNode;
  isContentPending: boolean;
  name: string;
  onBack: () => void;
  toolbarAction?: ReactNode;
}) {
  return (
    <SettingsCatalogDetail
      action={action}
      ariaLabel={`${name} 技能详情`}
      backLabel={backLabel}
      description={description}
      icon={icon ?? <MagicWand aria-hidden className="size-6 text-muted" />}
      name={name}
      toolbarAction={toolbarAction}
      onBack={onBack}
    >
      <div className="mt-8">
        {isContentPending ? (
          <div aria-busy="true" className="space-y-3">
            <span className="sr-only">正在加载技能内容</span>
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6 rounded-lg" />
          </div>
        ) : contentError ? (
          <Alert className="bg-danger-soft" role="alert" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>技能内容加载失败</Alert.Title>
              <Alert.Description>{contentError.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <AssistantMarkdown>{content ?? ""}</AssistantMarkdown>
        )}
      </div>
    </SettingsCatalogDetail>
  );
}
