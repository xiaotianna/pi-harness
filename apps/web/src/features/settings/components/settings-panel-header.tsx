import type { ReactNode } from "react";

export interface SettingsPanelHeaderProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export function SettingsPanelHeader({ action, description, title }: SettingsPanelHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
