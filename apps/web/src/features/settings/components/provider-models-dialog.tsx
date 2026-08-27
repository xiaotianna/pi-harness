"use client";

import { CircleCheck, Flask as TestTube2, TrashBin as Trash2 } from "@gravity-ui/icons";
import { Button, Fieldset, Form, Input, Modal, TextField, Tooltip, toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  type ModelProvider,
  providerQueryKeys,
  testProviderConnection,
  updateProvider,
} from "../../models";

export interface ProviderModelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: ModelProvider | null;
}

export function ProviderModelsDialog({ isOpen, onClose, provider }: ProviderModelsDialogProps) {
  const queryClient = useQueryClient();
  const [modelIdDraft, setModelIdDraft] = useState("");
  const [modelIds, setModelIds] = useState<readonly string[]>([]);
  const [testedModelId, setTestedModelId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setModelIdDraft("");
    setModelIds(provider?.models.map((model) => model.id) ?? []);
    setTestedModelId(null);
  }, [isOpen, provider]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (provider?.kind === "custom") await updateProvider(provider.id, { modelIds });
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
    if (!modelId || modelIds.includes(modelId)) return;
    setModelIds((current) => [...current, modelId]);
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
          <Modal.Header>
            <Modal.Heading>{provider ? `${provider.name} 模型` : "模型"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form id="provider-models-form" onSubmit={handleSubmit}>
              <Fieldset className="gap-2">
                <Fieldset.Legend>模型 ID</Fieldset.Legend>
                {modelIds.length > 0 ? (
                  <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
                    {modelIds.map((modelId) => {
                      const disabledReason = testDisabledReason(modelId);
                      const isTesting =
                        testConnectionMutation.isPending &&
                        testConnectionMutation.variables === modelId;
                      return (
                        <li
                          className="flex min-h-10 items-center gap-2 rounded-xl bg-default px-3 py-1.5"
                          key={modelId}
                        >
                          <code className="min-w-0 flex-1 truncate text-sm">{modelId}</code>
                          <Tooltip delay={0}>
                            <Button
                              isIconOnly
                              aria-label={`测试 ${modelId} 连接`}
                              isDisabled={
                                disabledReason !== null || testConnectionMutation.isPending
                              }
                              isPending={isTesting}
                              size="sm"
                              type="button"
                              variant="tertiary"
                              onPress={() => testConnectionMutation.mutate(modelId)}
                            >
                              {testedModelId === modelId ? (
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
                                aria-label={`删除模型 ${modelId}`}
                                size="sm"
                                type="button"
                                variant="tertiary"
                                onPress={() => {
                                  setModelIds((current) =>
                                    current.filter((item) => item !== modelId),
                                  );
                                  setTestedModelId(null);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                              <Tooltip.Content>删除模型</Tooltip.Content>
                            </Tooltip>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">暂无模型</p>
                )}
                {provider?.kind === "custom" ? (
                  <div className="flex items-end gap-2">
                    <TextField
                      fullWidth
                      aria-label="新增模型 ID"
                      value={modelIdDraft}
                      variant="secondary"
                      onChange={setModelIdDraft}
                    >
                      <Input placeholder="例如：model-a" />
                    </TextField>
                    <Button
                      className="shrink-0"
                      isDisabled={!modelIdDraft.trim() || modelIds.includes(modelIdDraft.trim())}
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
              <Button form="provider-models-form" isDisabled={saveMutation.isPending} type="submit">
                {saveMutation.isPending ? "保存中…" : "保存"}
              </Button>
            ) : null}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
