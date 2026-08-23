"use client";

import {
  AlertDialog,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  answerProviderOAuthPrompt,
  cancelProviderOAuth,
  createProvider,
  deleteProvider,
  deleteProviderCredential,
  getProviderOAuthState,
  type ModelProvider,
  ProviderApiError,
  type ProviderInput,
  type ProviderOAuthState,
  ProviderOAuthStatus,
  providerQueryKeys,
  saveProviderApiKey,
  startProviderOAuth,
  updateProvider,
} from "../../models";
import {
  getDefaultProviderAuthenticationMethod,
  getStoredProviderAuthenticationMethod,
  ProviderAuthenticationMethod,
  type ProviderAuthenticationMethod as ProviderAuthenticationMethodValue,
  ProviderAuthenticationSection,
} from "./provider-authentication-section";

const PROTOCOLS = [
  { id: "openai-responses", label: "OpenAI Responses" },
  { id: "openai-completions", label: "OpenAI Completions" },
  { id: "anthropic-messages", label: "Anthropic Messages" },
] as const satisfies readonly { id: ProviderInput["protocol"]; label: string }[];

function isProtocol(value: string | null): value is ProviderInput["protocol"] {
  return PROTOCOLS.some((protocol) => protocol.id === value);
}

export interface ProviderEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  provider: ModelProvider | null;
}

export function ProviderEditorDialog({ isOpen, onClose, provider }: ProviderEditorDialogProps) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [authenticationMethod, setAuthenticationMethod] =
    useState<ProviderAuthenticationMethodValue>(ProviderAuthenticationMethod.API_KEY);
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [oauthState, setOAuthState] = useState<ProviderOAuthState | null>(null);
  const [protocol, setProtocol] = useState<ProviderInput["protocol"]>("openai-responses");
  const [requiresApiKey, setRequiresApiKey] = useState(true);
  const storedAuthenticationMethod = getStoredProviderAuthenticationMethod(provider);

  useEffect(() => {
    if (!isOpen) return;
    setApiKey("");
    setAuthenticationMethod(getDefaultProviderAuthenticationMethod(provider));
    setBaseUrl(provider?.baseUrl ?? "");
    setError(null);
    setName(provider?.name ?? "");
    setOAuthState(null);
    const nextProtocol = provider?.protocol ?? null;
    setProtocol(isProtocol(nextProtocol) ? nextProtocol : "openai-responses");
    setRequiresApiKey(provider?.requiresApiKey ?? true);
  }, [isOpen, provider, storedAuthenticationMethod]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (provider?.kind === "builtin") {
        if (apiKey.trim()) await saveProviderApiKey(provider.id, apiKey.trim());
        return;
      }

      const input: ProviderInput = {
        baseUrl: baseUrl.trim(),
        modelIds: provider?.models.map((model) => model.id) ?? [],
        name: name.trim(),
        protocol,
        requiresApiKey,
      };
      const saved = provider
        ? await updateProvider(provider.id, input)
        : await createProvider(input);
      if (requiresApiKey && apiKey.trim()) {
        await saveProviderApiKey(saved.id, apiKey.trim());
      }
    },
    onError: (mutationError) => {
      if (mutationError instanceof ProviderApiError && mutationError.status === 400) {
        setError(mutationError.message);
        return;
      }
      toast.danger(mutationError.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: providerQueryKeys.all }),
    onSuccess: onClose,
  });

  const removeCredentialMutation = useMutation({
    mutationFn: async () => {
      if (provider) await deleteProviderCredential(provider.id);
    },
    onError: (mutationError) => toast.danger(mutationError.message),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
      onClose();
    },
  });

  const removeProviderMutation = useMutation({
    mutationFn: async () => {
      if (provider) await deleteProvider(provider.id);
    },
    onError: (mutationError) => {
      toast.danger(mutationError.message);
      setIsDeleteOpen(false);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
      setIsDeleteOpen(false);
      onClose();
    },
  });

  const startOAuthMutation = useMutation({
    mutationFn: startProviderOAuth,
    onError: (mutationError) => toast.danger(mutationError.message),
    onSuccess: setOAuthState,
  });

  const pollOAuthMutation = useMutation({
    mutationFn: getProviderOAuthState,
    onError: (mutationError) => {
      setOAuthState(null);
      toast.danger(mutationError.message);
    },
    onSuccess: async (state) => {
      setOAuthState(state);
      if (state.status === ProviderOAuthStatus.COMPLETED) {
        await queryClient.invalidateQueries({ queryKey: providerQueryKeys.all });
        toast.success("OAuth 登录成功");
        onClose();
      }
    },
  });

  const answerOAuthPromptMutation = useMutation({
    mutationFn: async (input: { promptId: string; providerId: string; value: string }) => {
      await answerProviderOAuthPrompt(input.providerId, input.promptId, input.value);
      return getProviderOAuthState(input.providerId);
    },
    onError: (mutationError) => toast.danger(mutationError.message),
    onSuccess: setOAuthState,
  });

  const cancelOAuthMutation = useMutation({
    mutationFn: cancelProviderOAuth,
    onError: (mutationError) => toast.danger(mutationError.message),
    onSuccess: () => setOAuthState(null),
  });

  const isOAuthActive =
    oauthState?.status === ProviderOAuthStatus.STARTING ||
    oauthState?.status === ProviderOAuthStatus.AWAITING_INPUT ||
    oauthState?.status === ProviderOAuthStatus.AWAITING_USER;

  useEffect(() => {
    if (
      !isOpen ||
      !provider ||
      !isOAuthActive ||
      pollOAuthMutation.isPending ||
      answerOAuthPromptMutation.isPending ||
      cancelOAuthMutation.isPending
    ) {
      return;
    }
    const timeoutId = window.setTimeout(() => pollOAuthMutation.mutate(provider.id), 1_000);
    return () => window.clearTimeout(timeoutId);
  }, [
    answerOAuthPromptMutation.isPending,
    cancelOAuthMutation.isPending,
    isOAuthActive,
    isOpen,
    pollOAuthMutation.isPending,
    pollOAuthMutation.mutate,
    provider,
  ]);

  const handleClose = () => {
    if (provider && isOAuthActive) cancelOAuthMutation.mutate(provider.id);
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    saveMutation.mutate();
  };

  const isSaveDisabled =
    saveMutation.isPending ||
    isOAuthActive ||
    (provider?.kind === "builtin" && !apiKey.trim()) ||
    (provider?.kind !== "builtin" && (!name.trim() || !baseUrl.trim()));
  const shouldShowSaveAction =
    provider?.kind !== "builtin" ||
    (provider.requiresApiKey &&
      (storedAuthenticationMethod === ProviderAuthenticationMethod.API_KEY ||
        (storedAuthenticationMethod === null &&
          authenticationMethod === ProviderAuthenticationMethod.API_KEY)));

  return (
    <>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) handleClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className={provider?.kind === "builtin" ? "sm:max-w-md" : "sm:max-w-lg"}>
            <Modal.Header>
              <Modal.Heading>{provider ? `配置 ${provider.name}` : "添加 Provider"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                aria-label="Provider 配置"
                className="flex flex-col gap-4 [--field-border-focus:var(--accent)] [--field-border-width:2px]"
                id="provider-form"
                onSubmit={handleSubmit}
              >
                <div className="flex flex-col gap-4">
                  {provider?.kind !== "builtin" ? (
                    <>
                      <TextField
                        isRequired
                        fullWidth
                        name="name"
                        value={name}
                        variant="secondary"
                        onChange={setName}
                      >
                        <Label>名称</Label>
                        <Input placeholder="例如：OpenAI" />
                        <FieldError />
                      </TextField>
                      <Select
                        aria-label="Provider 协议"
                        isRequired
                        name="protocol"
                        value={protocol}
                        variant="secondary"
                        onChange={(key) => {
                          const value = String(key);
                          if (isProtocol(value)) setProtocol(value);
                        }}
                      >
                        <Label>协议</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {PROTOCOLS.map((item) => (
                              <ListBox.Item key={item.id} id={item.id} textValue={item.label}>
                                <Label>{item.label}</Label>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <TextField
                        isRequired
                        fullWidth
                        name="baseUrl"
                        value={baseUrl}
                        variant="secondary"
                        onChange={setBaseUrl}
                      >
                        <Label>Base URL</Label>
                        <Input placeholder="https://api.example.com/v1" type="url" />
                        <FieldError />
                      </TextField>
                      <Switch
                        isSelected={requiresApiKey}
                        name="requiresApiKey"
                        onChange={setRequiresApiKey}
                      >
                        <Switch.Content>
                          <Label>需要 API Key</Label>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </>
                  ) : null}

                  <ProviderAuthenticationSection
                    apiKey={apiKey}
                    authenticationMethod={authenticationMethod}
                    isOAuthActive={isOAuthActive}
                    isOAuthAnswering={answerOAuthPromptMutation.isPending}
                    isOAuthCancelling={cancelOAuthMutation.isPending}
                    isOAuthStarting={startOAuthMutation.isPending}
                    key={`${provider?.id ?? "new"}:${isOpen}`}
                    oauthState={oauthState}
                    provider={provider}
                    requiresApiKey={requiresApiKey}
                    onApiKeyChange={setApiKey}
                    onAnswerOAuth={(promptId, value) => {
                      if (provider) {
                        answerOAuthPromptMutation.mutate({
                          promptId,
                          providerId: provider.id,
                          value,
                        });
                      }
                    }}
                    onAuthenticationMethodChange={setAuthenticationMethod}
                    onCancelOAuth={() => {
                      if (provider) cancelOAuthMutation.mutate(provider.id);
                    }}
                    onStartOAuth={() => {
                      if (provider) startOAuthMutation.mutate(provider.id);
                    }}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </Form>
            </Modal.Body>
            {isOAuthActive ? null : (
              <Modal.Footer className="justify-between">
                <div className="flex gap-2">
                  {provider?.canDelete ? (
                    <Button type="button" variant="danger" onPress={() => setIsDeleteOpen(true)}>
                      删除 Provider
                    </Button>
                  ) : null}
                  {provider?.hasStoredCredential ? (
                    <Button
                      isDisabled={removeCredentialMutation.isPending}
                      type="button"
                      variant="tertiary"
                      onPress={() => removeCredentialMutation.mutate()}
                    >
                      移除凭据
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="tertiary" onPress={handleClose}>
                    取消
                  </Button>
                  {shouldShowSaveAction ? (
                    <Button form="provider-form" isDisabled={isSaveDisabled} type="submit">
                      {saveMutation.isPending ? "保存中…" : "保存"}
                    </Button>
                  ) : null}
                </div>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <AlertDialog.Backdrop isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>删除 {provider?.name}？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>该 Provider 的配置和本地凭据都会被删除，此操作无法撤销。</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                取消
              </Button>
              <Button
                isDisabled={removeProviderMutation.isPending}
                variant="danger"
                onPress={() => removeProviderMutation.mutate()}
              >
                确认删除
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
