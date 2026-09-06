import type { ReactNode } from "react";

export interface SettingsRowProps {
  children: ReactNode;
  description?: string;
  title: string;
}

export function SettingsRow({ children, description, title }: SettingsRowProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 items-center gap-4 py-5 @xl/settings:py-6 @xl/settings:grid-cols-[minmax(0,1fr)_auto] @xl/settings:gap-6">
      <div className="min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
