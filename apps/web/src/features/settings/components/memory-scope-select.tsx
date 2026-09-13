import { Label, ListBox, Select } from "@heroui/react";
import { MemoryScope } from "@pi-harness/memory/contract";

export interface MemoryScopeSelection {
  scope: MemoryScope;
  workspaceId: string | null;
}

export interface MemoryWorkspaceOption {
  id: string;
  name: string;
}

const USER_SCOPE_KEY = MemoryScope.USER;

function getSelectionKey(value: MemoryScopeSelection): string {
  return value.scope === MemoryScope.USER ? USER_SCOPE_KEY : `workspace:${value.workspaceId ?? ""}`;
}

export function MemoryScopeSelect({
  value,
  onChange,
  workspaces,
  label = "作用范围",
}: {
  value: MemoryScopeSelection;
  onChange: (value: MemoryScopeSelection) => void;
  workspaces: readonly MemoryWorkspaceOption[];
  label?: string;
}) {
  return (
    <Select
      variant="secondary"
      value={getSelectionKey(value)}
      onChange={(key) => {
        if (key === USER_SCOPE_KEY) {
          onChange({ scope: MemoryScope.USER, workspaceId: null });
          return;
        }
        const workspaceId = String(key).replace(/^workspace:/, "");
        if (workspaces.some(({ id }) => id === workspaceId)) {
          onChange({ scope: MemoryScope.WORKSPACE, workspaceId });
        }
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="max-w-[calc(100vw-2rem)]">
        <ListBox>
          <ListBox.Item id={USER_SCOPE_KEY} textValue="个人 · 所有项目">
            个人 · 所有项目
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {workspaces.map((workspace) => (
            <ListBox.Item
              id={`workspace:${workspace.id}`}
              key={workspace.id}
              textValue={`项目 · ${workspace.name}`}
            >
              {`项目 · ${workspace.name}`}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
