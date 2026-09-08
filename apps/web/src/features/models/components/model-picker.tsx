import { ChevronDown, CircleExclamation as CircleAlert } from "@gravity-ui/icons";
import {
  Button,
  Description,
  Disclosure,
  Dropdown,
  Label,
  ListBox,
  Popover,
  ScrollShadow,
  Separator,
  Tooltip,
  useMediaQuery,
} from "@heroui/react";
import {
  DEFAULT_THINKING_LEVEL,
  type ThinkingLevel as ThinkingLevelValue,
} from "@pi-harness/agent-runtime/thinking-level";
import { maxBy } from "es-toolkit";
import { useState } from "react";
import { ListLayout, Virtualizer } from "react-aria-components";
import type { ModelProvider } from "../api/provider-api";
import { MODEL_MENU_LAYOUT_OPTIONS, THINKING_LEVEL_OPTIONS } from "../constants/model-picker";
import { createModelSelectionKey } from "../constants/model-providers";
import { ModelProviderIcon } from "./model-provider-icon";

function MobileModelPicker({
  isDisabled,
  compactMobile = true,
  onModelChange,
  onThinkingLevelChange,
  providers,
  selectedModel,
  selectedModelKey,
  selectedProvider,
  selectedThinkingLevel,
  selectedThinkingLevelLabel,
}: {
  compactMobile?: boolean;
  isDisabled: boolean;
  onModelChange: (modelKey: string) => void;
  onThinkingLevelChange?: (thinkingLevel: ThinkingLevelValue) => void;
  providers: readonly ModelProvider[];
  selectedModel: ModelProvider["models"][number] | undefined;
  selectedModelKey: string | null;
  selectedProvider: ModelProvider | undefined;
  selectedThinkingLevel: ThinkingLevelValue;
  selectedThinkingLevelLabel: string;
}) {
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const triggerLabel = `选择模型，当前 ${selectedModel?.name ?? "未选择模型"}${
    onThinkingLevelChange && selectedModel?.thinkingLevels.length
      ? `，推理强度${selectedThinkingLevelLabel}`
      : ""
  }`;

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Tooltip delay={0}>
        <Button
          isIconOnly={compactMobile}
          aria-label={triggerLabel}
          isDisabled={isDisabled}
          size="sm"
          variant="ghost"
        >
          {selectedProvider ? (
            <ModelProviderIcon isColor providerId={selectedProvider.id} size={16} />
          ) : (
            <CircleAlert className="size-4 text-muted" />
          )}
          {!compactMobile ? (
            <span className="min-w-0 truncate">{selectedModel?.name ?? "暂无可用模型"}</span>
          ) : null}
        </Button>
        <Tooltip.Content placement="top">{selectedModel?.name ?? "选择模型"}</Tooltip.Content>
      </Tooltip>
      <Popover.Content
        className="w-max min-w-52 max-w-[calc(100vw-2rem)] overflow-hidden"
        placement="top start"
      >
        <Popover.Dialog className="p-0">
          <ScrollShadow className="max-h-[min(70dvh,32rem)] p-1.5" orientation="vertical">
            {onThinkingLevelChange ? (
              <>
                <Disclosure>
                  <Disclosure.Heading>
                    <Disclosure.Trigger className="flex min-h-9 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm hover:bg-default">
                      <Label>推理强度</Label>
                      <Description className="ms-auto text-sm">
                        {selectedModel?.thinkingLevels.length
                          ? selectedThinkingLevelLabel
                          : "当前模型不支持"}
                      </Description>
                      <Disclosure.Indicator className="ms-0" />
                    </Disclosure.Trigger>
                  </Disclosure.Heading>
                  <Disclosure.Content>
                    <Disclosure.Body style={{ padding: 0 }}>
                      <ListBox
                        aria-label="推理强度"
                        className="px-1"
                        disallowEmptySelection
                        selectedKeys={new Set([selectedThinkingLevel])}
                        selectionMode="single"
                        onSelectionChange={(keys) => {
                          if (keys === "all") return;
                          const [key] = keys;
                          const option = THINKING_LEVEL_OPTIONS.find((item) => item.value === key);
                          if (option) onThinkingLevelChange(option.value);
                        }}
                      >
                        {THINKING_LEVEL_OPTIONS.filter((option) =>
                          selectedModel?.thinkingLevels.includes(option.value),
                        ).map((option) => (
                          <ListBox.Item
                            id={option.value}
                            key={option.value}
                            textValue={`${option.label} ${option.description}`}
                          >
                            <div className="flex flex-col">
                              <Label>{option.label}</Label>
                              <Description>{option.description}</Description>
                            </div>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Disclosure.Body>
                  </Disclosure.Content>
                </Disclosure>
                <Separator className="my-1" />
              </>
            ) : null}
            {providers.length === 0 ? (
              <div className="flex min-h-9 items-center gap-3 px-2.5 py-1.5">
                <CircleAlert className="size-4 shrink-0 text-muted" />
                <div className="flex flex-col">
                  <Label>暂无可用模型</Label>
                  <Description>请先在设置中连接并启用 Provider</Description>
                </div>
              </div>
            ) : (
              providers.map((provider) => {
                const isExpanded = expandedProviderId === provider.id;

                return (
                  <Disclosure
                    isExpanded={isExpanded}
                    key={provider.id}
                    onExpandedChange={(nextIsExpanded) =>
                      setExpandedProviderId(nextIsExpanded ? provider.id : null)
                    }
                  >
                    <Disclosure.Heading
                      {...(isExpanded ? { className: "sticky top-0 z-10 bg-overlay" } : {})}
                    >
                      <Disclosure.Trigger className="flex min-h-9 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-sm hover:bg-default">
                        <ModelProviderIcon isColor providerId={provider.id} size={16} />
                        <Label>{provider.name}</Label>
                        <Disclosure.Indicator />
                      </Disclosure.Trigger>
                    </Disclosure.Heading>
                    <Disclosure.Content>
                      <Disclosure.Body style={{ padding: 0 }}>
                        <Virtualizer layout={ListLayout} layoutOptions={MODEL_MENU_LAYOUT_OPTIONS}>
                          <ListBox
                            aria-label={`${provider.name} 模型`}
                            className="max-h-[min(50dvh,20rem)] overflow-y-auto p-0!"
                            disallowEmptySelection
                            items={provider.models}
                            selectedKeys={
                              selectedModelKey ? new Set([selectedModelKey]) : new Set()
                            }
                            selectionMode="single"
                            onSelectionChange={(keys) => {
                              if (keys === "all") return;
                              const [key] = keys;
                              if (typeof key !== "string") return;
                              onModelChange(key);
                              setIsOpen(false);
                            }}
                          >
                            {(model) => (
                              <ListBox.Item
                                className="ps-2 pe-7"
                                id={createModelSelectionKey(provider.id, model.id)}
                                key={createModelSelectionKey(provider.id, model.id)}
                                textValue={model.name}
                              >
                                <ModelProviderIcon isColor providerId={provider.id} size={16} />
                                <Label className="min-w-0 truncate">{model.name}</Label>
                                <ListBox.ItemIndicator className="start-auto end-2" />
                              </ListBox.Item>
                            )}
                          </ListBox>
                        </Virtualizer>
                      </Disclosure.Body>
                    </Disclosure.Content>
                  </Disclosure>
                );
              })
            )}
          </ScrollShadow>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export function ModelPicker({
  isDisabled = false,
  providers,
  selectedModelKey,
  onModelChange,
  onThinkingLevelChange,
  selectedThinkingLevel = DEFAULT_THINKING_LEVEL,
  selectedThinkingLevelLabel = "",
  compactMobile = true,
}: {
  isDisabled?: boolean;
  providers: readonly ModelProvider[];
  selectedModelKey: string | null;
  onModelChange: (key: string) => void;
  onThinkingLevelChange?: (level: ThinkingLevelValue) => void;
  selectedThinkingLevel?: ThinkingLevelValue;
  selectedThinkingLevelLabel?: string;
  compactMobile?: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const selectedProvider = providers.find((provider) =>
    provider.models.some(
      (model) => createModelSelectionKey(provider.id, model.id) === selectedModelKey,
    ),
  );
  const selectedModel = selectedProvider?.models.find(
    (model) => createModelSelectionKey(selectedProvider.id, model.id) === selectedModelKey,
  );
  if (isMobile)
    return (
      <MobileModelPicker
        compactMobile={compactMobile}
        isDisabled={isDisabled}
        providers={providers}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        selectedModelKey={selectedModelKey}
        onModelChange={onModelChange}
        selectedThinkingLevel={selectedThinkingLevel}
        selectedThinkingLevelLabel={selectedThinkingLevelLabel}
        {...(onThinkingLevelChange ? { onThinkingLevelChange } : {})}
      />
    );
  return (
    <Dropdown>
      <Button
        aria-label={`选择模型，当前 ${selectedModel?.name ?? "未选择模型"}${
          onThinkingLevelChange && selectedModel?.thinkingLevels.length
            ? `，推理强度${selectedThinkingLevelLabel}`
            : ""
        }`}
        className="max-w-full gap-2 px-2"
        isDisabled={isDisabled}
        size="sm"
        variant="ghost"
      >
        {selectedProvider ? (
          <ModelProviderIcon isColor providerId={selectedProvider.id} size={16} />
        ) : null}
        <span className="min-w-0 truncate">{selectedModel?.name ?? "选择模型"}</span>
        {onThinkingLevelChange && selectedModel?.thinkingLevels.length ? (
          <span className="font-normal text-muted">{selectedThinkingLevelLabel}</span>
        ) : null}
        <ChevronDown className="size-3.5" />
      </Button>
      <Dropdown.Popover className="min-w-52" placement="bottom start">
        <Dropdown.Menu aria-label="选择模型 Provider">
          {onThinkingLevelChange ? (
            <>
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item
                  id="thinking-level"
                  isDisabled={!selectedModel || selectedModel.thinkingLevels.length === 0}
                  textValue={`推理强度 ${selectedThinkingLevelLabel}`}
                >
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-6">
                    <Label>推理强度</Label>
                    <Description className="text-sm">
                      {selectedModel?.thinkingLevels.length
                        ? selectedThinkingLevelLabel
                        : "当前模型不支持"}
                    </Description>
                  </div>
                  <Dropdown.SubmenuIndicator />
                </Dropdown.Item>
                <Dropdown.Popover className="min-w-60" placement="right top">
                  <Dropdown.Menu
                    aria-label="推理强度"
                    selectedKeys={new Set([selectedThinkingLevel])}
                    selectionMode="single"
                    onAction={(key) => {
                      const option = THINKING_LEVEL_OPTIONS.find((item) => item.value === key);
                      if (option) onThinkingLevelChange(option.value);
                    }}
                  >
                    {THINKING_LEVEL_OPTIONS.filter((option) =>
                      selectedModel?.thinkingLevels.includes(option.value),
                    ).map((option) => (
                      <Dropdown.Item
                        className="ps-2 pe-7"
                        id={option.value}
                        key={option.value}
                        textValue={`${option.label} ${option.description}`}
                      >
                        <div className="flex flex-col">
                          <Label>{option.label}</Label>
                          <Description>{option.description}</Description>
                        </div>
                        <Dropdown.ItemIndicator className="start-auto end-2" />
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
              <Separator className="my-1" />
            </>
          ) : null}
          {providers.length === 0 ? (
            <Dropdown.Item isDisabled id="no-models" textValue="暂无可用模型">
              <CircleAlert className="size-4 text-muted" />
              <div className="flex flex-col">
                <Label>暂无可用模型</Label>
                <Description>请先在设置中连接并启用 Provider</Description>
              </div>
            </Dropdown.Item>
          ) : (
            providers.map((provider) => {
              const widestModelName = maxBy(provider.models, (model) => model.name.length)?.name;

              return (
                <Dropdown.SubmenuTrigger key={provider.id}>
                  <Dropdown.Item id={`provider-${provider.id}`} textValue={provider.name}>
                    <ModelProviderIcon isColor providerId={provider.id} size={16} />
                    <Label>{provider.name}</Label>
                    <Dropdown.SubmenuIndicator />
                  </Dropdown.Item>
                  <Dropdown.Popover className="w-max max-w-[calc(100vw-2rem)]! overflow-hidden">
                    <span
                      aria-hidden
                      className="pointer-events-none invisible block h-0 whitespace-nowrap px-10 text-sm"
                    >
                      {widestModelName}
                    </span>
                    <Virtualizer layout={ListLayout} layoutOptions={MODEL_MENU_LAYOUT_OPTIONS}>
                      <Dropdown.Menu
                        aria-label={`${provider.name} 模型`}
                        className="max-h-[calc(100vh-2rem)] overflow-y-auto! p-0!"
                        items={provider.models}
                        selectedKeys={selectedModelKey ? new Set([selectedModelKey]) : new Set()}
                        selectionMode="single"
                        onAction={(key) => {
                          if (typeof key === "string") onModelChange(key);
                        }}
                      >
                        {(model) => (
                          <Dropdown.Item
                            className="ps-2 pe-7"
                            id={createModelSelectionKey(provider.id, model.id)}
                            textValue={model.name}
                          >
                            <ModelProviderIcon isColor providerId={provider.id} size={16} />
                            <Label className="whitespace-nowrap">{model.name}</Label>
                            <Dropdown.ItemIndicator className="start-auto end-2" />
                          </Dropdown.Item>
                        )}
                      </Dropdown.Menu>
                    </Virtualizer>
                  </Dropdown.Popover>
                </Dropdown.SubmenuTrigger>
              );
            })
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
