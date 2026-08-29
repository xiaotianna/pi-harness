import { Button } from "@heroui/react";
import type { ReactNode } from "react";

export function SettingsCatalogItem({
  action,
  ariaLabel,
  icon,
  name,
  onPress,
  secondary,
}: {
  action: ReactNode;
  ariaLabel: string;
  icon: ReactNode;
  name: string;
  onPress: () => void;
  secondary: ReactNode;
}) {
  return (
    <li className="relative min-h-16 rounded-xl">
      <Button
        aria-label={ariaLabel}
        className="absolute inset-0 z-0 h-full w-full cursor-[var(--cursor-interactive)] rounded-xl"
        variant="ghost"
        onPress={onPress}
      >
        <span className="sr-only">{ariaLabel}</span>
      </Button>
      <div className="pointer-events-none relative z-10 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-default">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{name}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
            {secondary}
          </div>
        </div>
        <div className="pointer-events-auto">{action}</div>
      </div>
    </li>
  );
}
