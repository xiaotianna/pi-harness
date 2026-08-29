import { ArrowLeft } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import type { ReactNode } from "react";

export function SettingsCatalogDetail({
  action,
  ariaLabel,
  backLabel,
  children,
  description,
  icon,
  name,
  onBack,
}: {
  action: ReactNode;
  ariaLabel: string;
  backLabel: string;
  children: ReactNode;
  description: string;
  icon: ReactNode;
  name: string;
  onBack: () => void;
}) {
  return (
    <section aria-label={ariaLabel} className="w-full max-w-[720px]">
      <Button className="-ml-2" size="sm" variant="ghost" onPress={onBack}>
        <ArrowLeft aria-hidden className="size-4" />
        {backLabel}
      </Button>

      <div className="mt-5 flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-default">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-medium text-foreground">{name}</h2>
            {action}
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}
