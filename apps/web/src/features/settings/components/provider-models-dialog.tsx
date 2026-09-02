"use client";

import { CircleCheck, Flask as TestTube2, TrashBin as Trash2 } from "@gravity-ui/icons";
import {
  Button,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Modal,
  ScrollShadow,
  Switch,
  TextField,
  Tooltip,
  toast,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  type ModelProvider,
  type ProviderModelInput,
  providerQueryKeys,
  testProviderConnection,
  updateProvider,
} from "../../models";

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 32_000;

export interface ProviderModelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: ModelProvider | null;
}

export function ProviderModelsDialog({ isOpen, onClose, provider }: ProviderModelsDialogProps) {
  const queryClient = useQueryClient();
  const [modelIdDraft, setModelIdDraft] = useState("");
  const [models, setModels] = useState<readonly ProviderModelInput[]>([]);
  const [testedModelId, setTestedModelId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setModelIdDraft("");
    setModels(
      provider?.models.map(({ contextWindow, id, maxTokens, reasoning }) => ({
        contextWindow,
        id,
        maxTokens,
        reasoning,
      })) ?? [],
    );
    setTestedModelId(null);
  }, [isOpen, provider]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (provider?.kind === "custom") await updateProvider(provider.id, { models });
    },
    onError: (mutationError) => toast.danger(mutationError.message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
      onClose();
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (modelId: string) => {
      if (!provider) throw new Error("Provider 不存在");
      await testProviderConnection(provider.id, modelId);
      return modelId;
    },
    onError: (mutationError) => toast.danger(mutationError.message),
    onMutate: () => setTestedModelId(null),
    onSuccess: setTestedModelId,
  });

  const addModelId = () => {
    const modelId = modelIdDraft.trim();
    if (!modelId || models.some((model) => model.id === modelId)) return;
    setModels((current) => [
      ...current,
      {
        contextWindow: DEFAULT_CONTEXT_WINDOW,
        id: modelId,
        maxTokens: DEFAULT_MAX_TOKENS,
        reasoning: false,
      },
    ]);
    setModelIdDraft("");
    setTestedModelId(null);
  };

  const testDisabledReason = (modelId: string): string | null => {
    if (!provider?.isConfigured) return "请先配置 Provider 凭据";
    if (!provider.models.some((model) => model.id === modelId)) return "请先保存模型列表";
    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextIsOpen) => !nextIsOpen && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{provider ? `${provider.name} 模型` : "模型"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form className="min-w-0" id="provider-models-form" onSubmit={handleSubmit}>
              <Fieldset className="min-w-0 gap-4">
                <Fieldset.Legend className="sr-only">模型配置</Fieldset.Legend>
                {models.length > 0 ? (
                  <ScrollShadow
                    hideScrollBar
                    aria-label="模型列表"
                    className="w-full min-w-0 max-w-full"
                    orientation="horizontal"
                    role="region"
                    size={24}
                    tabIndex={0}
                  >
                    <ul className="flex w-max min-w-full gap-2">
                      {models.map((model) => {
                        const disabledReason = testDisabledReason(model.id);
                        const isTesting =
                          testConnectionMutation.isPending &&
                          testConnectionMutation.variables === model.id;
                        return (
                          <li
                            className="flex w-[calc(100vw-5rem)] max-w-md shrink-0 flex-col gap-2 rounded-xl bg-surface-secondary p-3"
                            key={model.id}
                          >
                            <div className="flex min-h-8 items-center gap-2">
                              <code className="min-w-0 flex-1 truncate text-sm">{model.id}</code>
                              <Tooltip delay={0}>
                                <Button
                                  isIconOnly
                                  aria-label={`测试 ${model.id} 连接`}
                                  isDisabled={
                                    disabledReason !== null || testConnectionMutation.isPending
                                  }
                                  isPending={isTesting}
                                  size="sm"
                                  type="button"
                                  variant="tertiary"
                                  onPress={() => testConnectionMutation.mutate(model.id)}
                                >
                                  {testedModelId === model.id ? (
                                    <CircleCheck className="size-4 text-success" />
                                  ) : (
                                    <TestTube2 className="size-4" />
                                  )}
                                </Button>
                                <Tooltip.Content>
                                  {disabledReason ?? (isTesting ? "正在测试" : "测试连接")}
                                </Tooltip.Content>
                              </Tooltip>
                              {provider?.kind === "custom" ? (
                                <Tooltip delay={0}>
                                  <Button
                                    isIconOnly
                                    aria-label={`删除模型 ${model.id}`}
                                    size="sm"
                                    type="button"
                                    variant="danger-soft"
                                    onPress={() => {
                                      setModels((current) =>
                                        current.filter((item) => item.id !== model.id),
                                      );
                                      setTestedModelId(null);
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                  <Tooltip.Content>删除模型</Tooltip.Content>
                                </Tooltip>
                              ) : null}
                            </div>
                            {provider?.kind === "custom" ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <TextField
                                  aria-label={`${model.id} 上下文窗口`}
                                  isInvalid={
                                    model.contextWindow < 1_024 || model.contextWindow > 10_000_000
                                  }
                                  value={String(model.contextWindow)}
                                  variant="secondary"
                                  onChange={(value) =>
                                    setModels((current) =>
                                      current.map((item) =>
                                        item.id === model.id
                                          ? { ...item, contextWindow: Number(value) }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  <Label>上下文窗口</Label>
                                  <Input
                                    className="tabular-nums"
                                    max={10_000_000}
                                    min={1_024}
                                    placeholder="上下文窗口"
                                    type="number"
                                  />
                                  <FieldError>上下文窗口应在 1,024 到 10,000,000 之间</FieldError>
                                </TextField>
                                <TextField
                                  aria-label={`${model.id} 最大输出`}
                                  isInvalid={
                                    model.maxTokens < 1 || model.maxTokens > model.contextWindow
                                  }
                                  value={String(model.maxTokens)}
                                  variant="secondary"
                                  onChange={(value) =>
                                    setModels((current) =>
                                      current.map((item) =>
                                        item.id === model.id
                                          ? { ...item, maxTokens: Number(value) }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  <Label>最大输出 Token 数</Label>
                                  <Input
                                    className="tabular-nums"
                                    max={model.contextWindow}
                                    min={1}
                                    placeholder="最大输出"
                                    type="number"
                                  />
                                  <FieldError>
                                    {model.maxTokens < 1
                                      ? "最大输出 Token 数至少为 1"
                                      : "最大输出 Token 数不能超过上下文窗口"}
                                  </FieldError>
                                </TextField>
                                <Switch
                                  aria-label={`${model.id} 推理能力`}
                                  className="sm:col-span-2"
                                  isSelected={model.reasoning}
                                  size="sm"
                                  onChange={(reasoning) =>
                                    setModels((current) =>
                                      current.map((item) =>
                                        item.id === model.id ? { ...item, reasoning } : item,
                                      ),
                                    )
                                  }
                                >
                                  <Switch.Content className="flex w-full items-center justify-between">
                                    <Label>推理模型</Label>
                                    <Switch.Control>
                                      <Switch.Thumb />
                                    </Switch.Control>
                                  </Switch.Content>
                                </Switch>
                              </div>
                            ) : (
                              <p className="text-xs tabular-nums text-muted">
                                上下文 {model.contextWindow.toLocaleString()} · 最大输出{" "}
                                {model.maxTokens.toLocaleString()}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </ScrollShadow>
                ) : provider?.kind === "custom" ? null : (
                  <p className="text-sm text-muted">暂无模型</p>
                )}
                {provider?.kind === "custom" ? (
                  <div className="flex min-w-0 items-end gap-2">
                    <TextField
                      aria-label={models.length > 0 ? "新增模型 ID" : "模型 ID"}
                      className="min-w-0 flex-1"
                      value={modelIdDraft}
                      variant="secondary"
                      onChange={setModelIdDraft}
                    >
                      <Label>{models.length > 0 ? "新增模型 ID" : "模型 ID"}</Label>
                      <Input placeholder="例如：model-a" />
                    </TextField>
                    <Button
                      className="shrink-0"
                      isDisabled={
                        !modelIdDraft.trim() ||
                        models.some((model) => model.id === modelIdDraft.trim())
                      }
                      type="button"
                      variant="secondary"
                      onPress={addModelId}
                    >
                      添加
                    </Button>
                  </div>
                ) : null}
              </Fieldset>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="tertiary" onPress={onClose}>
              {provider?.kind === "custom" ? "取消" : "关闭"}
            </Button>
            {provider?.kind === "custom" ? (
              <Button
                form="provider-models-form"
                isDisabled={
                  saveMutation.isPending ||
                  models.some(
                    (model) =>
                      model.contextWindow < 1_024 ||
                      model.contextWindow > 10_000_000 ||
                      model.maxTokens < 1 ||
                      model.maxTokens > model.contextWindow,
                  )
                }
                type="submit"
              >
                {saveMutation.isPending ? "保存中…" : "保存"}
              </Button>
            ) : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
