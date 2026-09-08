import { Label, ListBox, Select } from "@heroui/react";
import { MEMORY_SCOPES, type MemoryScope } from "../state/memory-demo-store";

export function MemoryScopeSelect({
  value,
  onChange,
  label = "作用范围",
}: {
  value: MemoryScope;
  onChange: (value: MemoryScope) => void;
  label?: string;
}) {
  return (
    <Select
      variant="secondary"
      value={value}
      onChange={(key) => {
        const scope = MEMORY_SCOPES.find(({ id }) => id === key);
        if (scope) onChange(scope.id);
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-w-[calc(100vw-2rem)]">
        <ListBox>
          {MEMORY_SCOPES.map((scope) => (
            <ListBox.Item id={scope.id} key={scope.id} textValue={scope.label}>
              {scope.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
