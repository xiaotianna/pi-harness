"use client";

import { ArrowUpRightFromSquare as ExternalLink, Eye, EyeSlash as EyeOff } from "@gravity-ui/icons";
import {
  Button,
  Input,
  InputGroup,
  Label,
  ListBox,
  Select,
  Tabs,
  TextField,
  Tooltip,
} from "@heroui/react";
import { useEffect, useState } from "react";
import {
  type ModelProvider,
  ProviderOAuthPromptType,
  type ProviderOAuthState,
  ProviderOAuthStatus,
} from "../../models";

export const ProviderAuthenticationMethod = {
  API_KEY: "api-key",
  OAUTH: "oauth",
} as const;

export type ProviderAuthenticationMethod =
  (typeof ProviderAuthenticationMethod)[keyof typeof ProviderAuthenticationMethod];

const PROVIDER_OAUTH_WINDOW_NAME = "pi-harness-provider-oauth";

function openProviderOAuthWindow(url: string): void {
  const oauthWindow = window.open(url, PROVIDER_OAUTH_WINDOW_NAME);
  if (oauthWindow) oauthWindow.opener = null;
}

function prepareProviderOAuthWindow(): void {
  openProviderOAuthWindow("about:blank");
}

export function getStoredProviderAuthenticationMethod(
  provider: ModelProvider | null,
): ProviderAuthenticationMethod | null {
  if (!provider?.hasStoredCredential) return null;
  return provider.authSource === "OAuth"
    ? ProviderAuthenticationMethod.OAUTH
    : ProviderAuthenticationMethod.API_KEY;
}

export function getDefaultProviderAuthenticationMethod(
  provider: ModelProvider | null,
): ProviderAuthenticationMethod {
  const storedMethod = getStoredProviderAuthenticationMethod(provider);
  if (storedMethod) return storedMethod;
  return provider?.supportsOAuth && !provider.requiresApiKey
    ? ProviderAuthenticationMethod.OAUTH
    : ProviderAuthenticationMethod.API_KEY;
}

interface ProviderApiKeyFieldProps {
  credentialPreview: string | null;
  onChange: (value: string) => void;
  value: string;
}

function ProviderApiKeyField({ credentialPreview, onChange, value }: ProviderApiKeyFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField fullWidth name="apiKey" value={value || credentialPreview || ""} onChange={onChange}>
      <Label>API Key</Label>
      <InputGroup fullWidth variant="secondary">
        <InputGroup.Input
          autoComplete="off"
          placeholder="输入 API Key"
          type={isVisible ? "text" : "password"}
          onFocus={(event) => {
            if (!value && credentialPreview) event.currentTarget.select();
          }}
        />
        <InputGroup.Suffix>
          <Tooltip delay={0}>
            <Button
              isIconOnly
              aria-label={isVisible ? "隐藏 API Key" : "显示 API Key"}
              size="sm"
              type="button"
              variant="tertiary"
              onPress={() => setIsVisible((current) => !current)}
            >
              {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Tooltip.Content>{isVisible ? "隐藏 API Key" : "显示 API Key"}</Tooltip.Content>
          </Tooltip>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}

interface ProviderOAuthPanelProps {
  isActive: boolean;
  isAnswering: boolean;
  isCancelling: boolean;
  isStarting: boolean;
  oauthState: ProviderOAuthState | null;
  onAnswer: (promptId: string, value: string) => void;
  onCancel: () => void;
  onStart: () => void;
  storedMethod: ProviderAuthenticationMethod | null;
}

type ProviderOAuthInputState = Extract<
  ProviderOAuthState,
  { status: typeof ProviderOAuthStatus.AWAITING_INPUT }
>;

interface ProviderOAuthPromptProps {
  isAnswering: boolean;
  isCancelling: boolean;
  onAnswer: (promptId: string, value: string) => void;
  onCancel: () => void;
  state: ProviderOAuthInputState;
}

interface ProviderOAuthPromptCopy {
  description: string;
  fieldLabel: string;
  placeholder: string | null;
  title: string;
}

function getProviderOAuthPromptCopy(state: ProviderOAuthInputState): ProviderOAuthPromptCopy {
  if (state.promptType === ProviderOAuthPromptType.SELECT) {
    return {
      description: "请选择适合当前环境的 OAuth 授权方式。",
      fieldLabel: "登录方式",
      placeholder: null,
      title: "选择登录方式",
    };
  }
  if (state.promptType === ProviderOAuthPromptType.MANUAL_CODE) {
    return {
      description: "浏览器没有自动返回时，请粘贴授权码或完整的回调地址。",
      fieldLabel: "授权码或回调地址",
      placeholder: state.placeholder,
      title: "完成浏览器授权",
    };
  }
  if (state.message.includes("GitHub Enterprise URL/domain")) {
    return {
      description: "使用 GitHub.com 可直接留空；企业账号请填写 Enterprise 域名。",
      fieldLabel: "Enterprise 域名（可选）",
      placeholder: "例如 company.ghe.com",
      title: "选择 GitHub 登录范围",
    };
  }
  return {
    description: state.message,
    fieldLabel: state.promptType === ProviderOAuthPromptType.SECRET ? "登录凭据" : "登录信息",
    placeholder: state.placeholder,
    title: "补充登录信息",
  };
}

function getProviderOAuthOptionCopy(option: ProviderOAuthInputState["options"][number]) {
  if (option.id === "browser") {
    return {
      description: "推荐，在当前浏览器中完成授权",
      label: "浏览器登录",
    };
  }
  if (option.id === "device_code") {
    return {
      description: "适合远程环境或浏览器回调不可用时",
      label: "设备码登录",
    };
  }
  return option;
}

function ProviderOAuthPrompt({
  isAnswering,
  isCancelling,
  onAnswer,
  onCancel,
  state,
}: ProviderOAuthPromptProps) {
  const [value, setValue] = useState(
    state.promptType === ProviderOAuthPromptType.SELECT ? (state.options[0]?.id ?? "") : "",
  );
  const canSubmitEmpty = state.promptType === ProviderOAuthPromptType.TEXT;
  const copy = getProviderOAuthPromptCopy(state);
  const authorizationUrl = state.authorizationUrl;

  useEffect(() => {
    if (authorizationUrl) openProviderOAuthWindow(authorizationUrl);
  }, [authorizationUrl]);

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{copy.title}</p>
        <p className="text-sm text-muted">{copy.description}</p>
      </div>
      {state.promptType === ProviderOAuthPromptType.SELECT ? (
        <Select
          aria-label={copy.fieldLabel}
          value={value}
          variant="secondary"
          onChange={(key) => setValue(String(key))}
        >
          <Label>{copy.fieldLabel}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {state.options.map((option) => {
                const optionCopy = getProviderOAuthOptionCopy(option);
                return (
                  <ListBox.Item key={option.id} id={option.id} textValue={optionCopy.label}>
                    <div className="flex flex-col gap-0.5">
                      <Label>{optionCopy.label}</Label>
                      {optionCopy.description ? (
                        <span className="text-xs text-muted">{optionCopy.description}</span>
                      ) : null}
                    </div>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                );
              })}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : (
        <TextField fullWidth value={value} variant="secondary" onChange={setValue}>
          <Label>{copy.fieldLabel}</Label>
          <Input
            autoComplete="off"
            {...(copy.placeholder === null ? {} : { placeholder: copy.placeholder })}
            type={state.promptType === ProviderOAuthPromptType.SECRET ? "password" : "text"}
          />
        </TextField>
      )}
      <div className="flex justify-end gap-2">
        <Button
          isDisabled={isAnswering || isCancelling}
          type="button"
          variant="tertiary"
          onPress={onCancel}
        >
          取消登录
        </Button>
        {authorizationUrl ? (
          <Button
            type="button"
            variant="secondary"
            onPress={() => openProviderOAuthWindow(authorizationUrl)}
          >
            <ExternalLink className="size-4" />
            打开授权页面
          </Button>
        ) : null}
        <Button
          isDisabled={isCancelling || (!canSubmitEmpty && !value)}
          isPending={isAnswering}
          type="button"
          onPress={() => {
            if (state.promptType === ProviderOAuthPromptType.SELECT && value === "browser") {
              prepareProviderOAuthWindow();
            }
            onAnswer(state.promptId, value);
          }}
        >
          继续
        </Button>
      </div>
    </div>
  );
}

function ProviderOAuthPanel({
  isActive,
  isAnswering,
  isCancelling,
  isStarting,
  oauthState,
  onAnswer,
  onCancel,
  onStart,
  storedMethod,
}: ProviderOAuthPanelProps) {
  const authorizationUrl =
    oauthState?.status === ProviderOAuthStatus.AWAITING_USER ||
    oauthState?.status === ProviderOAuthStatus.AWAITING_INPUT
      ? oauthState.authorizationUrl
      : null;

  if (oauthState?.status === ProviderOAuthStatus.AWAITING_INPUT) {
    return (
      <ProviderOAuthPrompt
        isAnswering={isAnswering}
        isCancelling={isCancelling}
        key={oauthState.promptId}
        state={oauthState}
        onAnswer={onAnswer}
        onCancel={onCancel}
      />
    );
  }

  if (isActive) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div
          className={
            oauthState?.status === ProviderOAuthStatus.STARTING
              ? "flex flex-col items-center gap-1 text-center"
              : "flex flex-col gap-1 text-left"
          }
        >
          <p className="font-medium">
            {oauthState?.status === ProviderOAuthStatus.AWAITING_USER
              ? "完成 OAuth 授权"
              : "正在准备登录"}
          </p>
          <p aria-live="polite" className="text-sm text-muted">
            {oauthState?.message}
          </p>
        </div>
        {oauthState?.status === ProviderOAuthStatus.AWAITING_USER && oauthState.userCode ? (
          <TextField isReadOnly fullWidth value={oauthState.userCode} variant="secondary">
            <Label>设备码</Label>
            <Input />
          </TextField>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button isDisabled={isCancelling} type="button" variant="tertiary" onPress={onCancel}>
            取消登录
          </Button>
          {authorizationUrl ? (
            <Button
              type="button"
              onPress={() => window.open(authorizationUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="size-4" />
              打开授权页面
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 py-4 text-center">
      {storedMethod === ProviderAuthenticationMethod.OAUTH ? (
        <p className="text-sm text-muted">已通过 OAuth 登录；如需改用 API Key，请先移除凭据。</p>
      ) : null}
      {oauthState?.status === ProviderOAuthStatus.FAILED ? (
        <p className="text-sm text-danger" role="alert">
          {oauthState.message}
        </p>
      ) : null}
      <Button isPending={isStarting} type="button" variant="secondary" onPress={onStart}>
        {storedMethod === ProviderAuthenticationMethod.OAUTH ? "重新登录 OAuth" : "使用 OAuth 登录"}
      </Button>
    </div>
  );
}

export interface ProviderAuthenticationSectionProps {
  apiKey: string;
  authenticationMethod: ProviderAuthenticationMethod;
  isOAuthActive: boolean;
  isOAuthAnswering: boolean;
  isOAuthCancelling: boolean;
  isOAuthStarting: boolean;
  oauthState: ProviderOAuthState | null;
  onApiKeyChange: (value: string) => void;
  onAnswerOAuth: (promptId: string, value: string) => void;
  onAuthenticationMethodChange: (method: ProviderAuthenticationMethod) => void;
  onCancelOAuth: () => void;
  onStartOAuth: () => void;
  provider: ModelProvider | null;
  requiresApiKey: boolean;
}

export function ProviderAuthenticationSection({
  apiKey,
  authenticationMethod,
  isOAuthActive,
  isOAuthAnswering,
  isOAuthCancelling,
  isOAuthStarting,
  oauthState,
  onApiKeyChange,
  onAnswerOAuth,
  onAuthenticationMethodChange,
  onCancelOAuth,
  onStartOAuth,
  provider,
  requiresApiKey,
}: ProviderAuthenticationSectionProps) {
  const storedMethod = getStoredProviderAuthenticationMethod(provider);
  const supportsApiKey = requiresApiKey;
  const supportsOAuth = provider?.supportsOAuth ?? false;
  const apiKeyField = supportsApiKey ? (
    <ProviderApiKeyField
      credentialPreview={provider?.credentialPreview ?? null}
      value={apiKey}
      onChange={onApiKeyChange}
    />
  ) : null;
  const oauthPanel = supportsOAuth ? (
    <ProviderOAuthPanel
      isActive={isOAuthActive}
      isAnswering={isOAuthAnswering}
      isCancelling={isOAuthCancelling}
      isStarting={isOAuthStarting}
      oauthState={oauthState}
      storedMethod={storedMethod}
      onAnswer={onAnswerOAuth}
      onCancel={onCancelOAuth}
      onStart={onStartOAuth}
    />
  ) : null;

  if (storedMethod === ProviderAuthenticationMethod.OAUTH) return oauthPanel;
  if (storedMethod === ProviderAuthenticationMethod.API_KEY) return apiKeyField;
  if (supportsApiKey && supportsOAuth) {
    return (
      <Tabs
        key={authenticationMethod}
        selectedKey={authenticationMethod}
        variant="primary"
        onSelectionChange={(key) => {
          if (
            key === ProviderAuthenticationMethod.API_KEY ||
            key === ProviderAuthenticationMethod.OAUTH
          ) {
            onAuthenticationMethodChange(key);
          }
        }}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="认证方式">
            <Tabs.Tab id={ProviderAuthenticationMethod.API_KEY}>
              API Key
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id={ProviderAuthenticationMethod.OAUTH}>
              OAuth
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="px-0" id={ProviderAuthenticationMethod.API_KEY}>
          {apiKeyField}
        </Tabs.Panel>
        <Tabs.Panel className="px-0" id={ProviderAuthenticationMethod.OAUTH}>
          {oauthPanel}
        </Tabs.Panel>
      </Tabs>
    );
  }
  if (supportsApiKey) return apiKeyField;
  if (supportsOAuth) return oauthPanel;
  return null;
}
