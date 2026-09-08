import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

export function SettingsFilterTabs<T extends string>({
  label,
  items,
  selectedKey,
  onSelectionChange,
  className,
}: {
  label: string;
  items: readonly { id: T; label: string }[];
  selectedKey: T;
  onSelectionChange: (key: T) => void;
  className?: string;
}) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      className={`flex flex-wrap gap-1 ${className ?? ""}`}
      disallowEmptySelection
      selectedKeys={[selectedKey]}
      selectionMode="single"
      onSelectionChange={(keys) => {
        const [key] = keys;
        const item = items.find((item) => item.id === key);
        if (item) onSelectionChange(item.id);
      }}
    >
      {items.map((item) => (
        <ToggleButton
          className="h-8 cursor-[var(--cursor-interactive)] rounded-lg px-3 text-sm text-muted outline-none hover:bg-default data-[focus-visible]:bg-default data-[selected]:bg-accent-soft data-[selected]:font-medium data-[selected]:text-accent-soft-foreground"
          id={item.id}
          key={item.id}
        >
          {item.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
