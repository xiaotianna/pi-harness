"use client";

import {
  AlertDialog,
  Button,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  Tabs,
  TextField,
  Tooltip,
  toast,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
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
  const [authenticationMethod, setAuthenticationMethod] = useState<"api-key" | "oauth">("api-key");
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [oauthState, setOAuthState] = useState<ProviderOAuthState | null>(null);
  const [protocol, setProtocol] = useState<ProviderInput["protocol"]>("openai-responses");
  const [requiresApiKey, setRequiresApiKey] = useState(true);
  useEffect(() => {
    if (!isOpen) return;
    setApiKey("");
    setAuthenticationMethod(provider?.authSource === "OAuth" ? "oauth" : "api-key");
    setIsApiKeyVisible(false);
    setBaseUrl(provider?.baseUrl ?? "");
    setError(null);
    setName(provider?.name ?? "");
    setOAuthState(null);
    const nextProtocol = provider?.protocol ?? null;
    setProtocol(isProtocol(nextProtocol) ? nextProtocol : "openai-responses");
    setRequiresApiKey(provider?.requiresApiKey ?? true);
  }, [isOpen, provider]);

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

  const cancelOAuthMutation = useMutation({
    mutationFn: cancelProviderOAuth,
    onError: (mutationError) => toast.danger(mutationError.message),
    onSuccess: () => setOAuthState(null),
  });

  const isOAuthActive =
    oauthState?.status === ProviderOAuthStatus.STARTING ||
    oauthState?.status === ProviderOAuthStatus.AWAITING_USER;

  useEffect(() => {
    if (
      !isOpen ||
      !provider ||
      !isOAuthActive ||
      pollOAuthMutation.isPending ||
      cancelOAuthMutation.isPending
    ) {
      return;
    }
    const timeoutId = window.setTimeout(() => pollOAuthMutation.mutate(provider.id), 1_000);
    return () => window.clearTimeout(timeoutId);
  }, [
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

  const apiKeyField = requiresApiKey ? (
    <TextField
      fullWidth
      name="apiKey"
      value={apiKey || (provider?.authSource === "OAuth" ? "" : provider?.credentialPreview) || ""}
      onChange={setApiKey}
    >
      <Label>API Key</Label>
      <InputGroup fullWidth variant="secondary">
        <InputGroup.Input
          autoComplete="off"
          placeholder="输入 API Key"
          type={isApiKeyVisible ? "text" : "password"}
          onFocus={(event) => {
            if (!apiKey && provider?.authSource !== "OAuth" && provider?.credentialPreview) {
              event.currentTarget.select();
            }
          }}
        />
        <InputGroup.Suffix>
          <Tooltip delay={0}>
            <Button
              isIconOnly
              aria-label={isApiKeyVisible ? "隐藏 API Key" : "显示 API Key"}
              size="sm"
              type="button"
              variant="tertiary"
              onPress={() => setIsApiKeyVisible((isVisible) => !isVisible)}
            >
              {isApiKeyVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Tooltip.Content>{isApiKeyVisible ? "隐藏 API Key" : "显示 API Key"}</Tooltip.Content>
          </Tooltip>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  ) : null;

  return (
    <>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(nextIsOpen) => {
          if (!nextIsOpen) handleClose();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
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
                        <Input placeholder="例如：本地 Ollama" />
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

                  {provider?.supportsOAuth ? (
                    <Tabs
                      key={authenticationMethod}
                      selectedKey={authenticationMethod}
                      variant="primary"
                      onSelectionChange={(key) => {
                        if (key === "api-key" || key === "oauth") setAuthenticationMethod(key);
                      }}
                    >
                      <Tabs.ListContainer>
                        <Tabs.List aria-label="认证方式">
                          <Tabs.Tab id="api-key">
                            API Key
                            <Tabs.Indicator />
                          </Tabs.Tab>
                          <Tabs.Tab id="oauth">
                            OAuth
                            <Tabs.Indicator />
                          </Tabs.Tab>
                        </Tabs.List>
                      </Tabs.ListContainer>
                      <Tabs.Panel className="px-0" id="api-key">
                        {apiKeyField}
                      </Tabs.Panel>
                      <Tabs.Panel className="px-0" id="oauth">
                        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                          {oauthState?.status === ProviderOAuthStatus.AWAITING_USER ? (
                            oauthState.userCode ? (
                              <TextField
                                isReadOnly
                                fullWidth
                                value={oauthState.userCode}
                                variant="secondary"
                              >
                                <Label>设备码</Label>
                                <Input />
                              </TextField>
                            ) : null
                          ) : null}
                          {isOAuthActive ? (
                            <>
                              <p aria-live="polite" className="text-sm text-muted">
                                {oauthState.message}
                              </p>
                              <div className="flex items-center gap-2">
                                {oauthState.status === ProviderOAuthStatus.AWAITING_USER ? (
                                  <Button
                                    type="button"
                                    onPress={() =>
                                      window.open(
                                        oauthState.authorizationUrl,
                                        "_blank",
                                        "noopener,noreferrer",
                                      )
                                    }
                                  >
                                    <ExternalLink className="size-4" />
                                    打开授权页面
                                  </Button>
                                ) : null}
                                <Button
                                  isDisabled={cancelOAuthMutation.isPending}
                                  type="button"
                                  variant="ghost"
                                  onPress={() => cancelOAuthMutation.mutate(provider.id)}
                                >
                                  取消登录
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              {oauthState?.status === ProviderOAuthStatus.FAILED ? (
                                <p className="text-sm text-danger" role="alert">
                                  {oauthState.message}
                                </p>
                              ) : null}
                              <Button
                                isPending={startOAuthMutation.isPending}
                                type="button"
                                variant="secondary"
                                onPress={() => startOAuthMutation.mutate(provider.id)}
                              >
                                {provider.authSource === "OAuth"
                                  ? "重新登录 OAuth"
                                  : "使用 OAuth 登录"}
                              </Button>
                            </>
                          )}
                        </div>
                      </Tabs.Panel>
                    </Tabs>
                  ) : (
                    apiKeyField
                  )}
                </div>
                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </Form>
            </Modal.Body>
            <Modal.Footer className="justify-between">
              <div className="flex gap-2">
                {provider?.canDelete ? (
                  <Button type="button" variant="danger" onPress={() => setIsDeleteOpen(true)}>
                    删除 Provider
                  </Button>
                ) : null}
                {provider?.hasStoredCredential ? (
                  <Button
                    isDisabled={removeCredentialMutation.isPending || isOAuthActive}
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
                {!provider?.supportsOAuth || authenticationMethod === "api-key" ? (
                  <Button form="provider-form" isDisabled={isSaveDisabled} type="submit">
                    {saveMutation.isPending ? "保存中…" : "保存"}
                  </Button>
                ) : null}
              </div>
            </Modal.Footer>
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
