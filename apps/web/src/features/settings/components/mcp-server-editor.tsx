import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  Tabs,
  TextArea,
  TextField,
} from "@heroui/react";
import { McpAuthMode, McpTransport } from "@pi-harness/agent-runtime/mcp-contract";
import { useId, useState } from "react";
import { importMcpServers, type McpServer, saveMcpServer } from "../api/mcp-api";
import {
  createMcpFormDraft,
  MCP_AUTH_OPTIONS,
  MCP_JSON_PLACEHOLDER,
  MCP_TRANSPORT_OPTIONS,
  type McpFormDraft,
  readMcpForm,
  readMcpJson,
  writeMcpJson,
} from "../utils/mcp-form";

const McpEditorMode = {
  FORM: "form",
  JSON: "json",
} as const;
type McpEditorMode = (typeof McpEditorMode)[keyof typeof McpEditorMode];

function McpConnectionFields({
  draft,
  isSaving,
  onChange,
}: {
  draft: McpFormDraft;
  isSaving: boolean;
  onChange: (value: Partial<McpFormDraft>) => void;
}) {
  return (
    <>
      <TextField
        fullWidth
        variant="secondary"
        isRequired
        isDisabled={isSaving}
        value={draft.name}
        onChange={(name) => onChange({ name })}
      >
        <Label>服务器 ID</Label>
        <Input autoFocus maxLength={100} placeholder="例如：docs" />
        <Description>对应 mcpServers 对象中的 key。</Description>
        <FieldError />
      </TextField>
      <Select
        fullWidth
        variant="secondary"
        isDisabled={isSaving}
        value={draft.transport}
        onChange={(value) => {
          const option = MCP_TRANSPORT_OPTIONS.find((item) => item.id === value);
          if (option) onChange({ transport: option.id, endpoint: "" });
        }}
      >
        <Label>连接方式</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {MCP_TRANSPORT_OPTIONS.map((option) => (
              <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        <Description>
          {MCP_TRANSPORT_OPTIONS.find((option) => option.id === draft.transport)?.description}
        </Description>
      </Select>
      <TextField
        fullWidth
        variant="secondary"
        isRequired
        isDisabled={isSaving}
        value={draft.endpoint}
        onChange={(endpoint) => onChange({ endpoint })}
      >
        <Label>{draft.transport === McpTransport.STDIO ? "命令" : "服务器地址"}</Label>
        <Input
          maxLength={4096}
          placeholder={draft.transport === McpTransport.STDIO ? "npx" : "https://example.com/mcp"}
        />
        <FieldError />
      </TextField>
      {draft.transport === McpTransport.STDIO ? (
        <>
          <TextField
            fullWidth
            variant="secondary"
            isDisabled={isSaving}
            value={draft.args}
            onChange={(args) => onChange({ args })}
          >
            <Label>命令参数</Label>
            <TextArea
              rows={3}
              maxLength={65536}
              placeholder={"-y\n@modelcontextprotocol/server-everything"}
            />
            <Description>每行一个参数。</Description>
          </TextField>
          <TextField
            fullWidth
            variant="secondary"
            isDisabled={isSaving}
            value={draft.environment}
            onChange={(environment) => onChange({ environment })}
          >
            <Label>环境变量</Label>
            <TextArea
              autoComplete="off"
              spellCheck={false}
              rows={3}
              maxLength={65536}
              placeholder="DEBUG=1"
            />
            <Description>每行一个 KEY=VALUE。</Description>
          </TextField>
        </>
      ) : null}
    </>
  );
}

function McpCommonFields({
  draft,
  isJsonMode,
  isSaving,
  server,
  onChange,
}: {
  draft: McpFormDraft;
  isJsonMode: boolean;
  isSaving: boolean;
  server?: McpServer;
  onChange: (value: Partial<McpFormDraft>) => void;
}) {
  const showNetworkOptions = isJsonMode || draft.transport !== McpTransport.STDIO;
  return (
    <>
      {showNetworkOptions ? (
        <>
          <Select
            fullWidth
            variant="secondary"
            isDisabled={isSaving}
            value={draft.authMode}
            onChange={(value) => {
              if (
                value === McpAuthMode.NONE ||
                value === McpAuthMode.STATIC ||
                value === McpAuthMode.OAUTH
              ) {
                onChange({ authMode: value });
              }
            }}
          >
            <Label>鉴权方式</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {MCP_AUTH_OPTIONS.map((option) => (
                  <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
            <Description>自动检测会在首次连接后提示 OAuth 或 Token/API Key。</Description>
          </Select>
          <Switch
            isDisabled={isSaving}
            isSelected={draft.allowPrivateNetwork}
            onChange={(allowPrivateNetwork) => onChange({ allowPrivateNetwork })}
          >
            <Switch.Content className="w-full justify-between">
              <Label>允许连接本机或局域网</Label>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </>
      ) : null}
      <TextField
        fullWidth
        variant="secondary"
        isRequired
        isDisabled={isSaving}
        value={draft.timeout}
        onChange={(timeout) => onChange({ timeout })}
      >
        <Label>调用超时（秒）</Label>
        <Input inputMode="numeric" />
        <FieldError />
      </TextField>
      {server ? (
        <p className="text-sm text-muted">
          保存会撤销当前信任并断开连接；连接配置改变时还会清除旧凭据，需要重新连接。
        </p>
      ) : null}
    </>
  );
}

export function McpServerEditor({
  server,
  onClose,
  onSaved,
}: {
  server?: McpServer;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const formId = useId();
  const [draft, setDraft] = useState(() => createMcpFormDraft(server));
  const [mode, setMode] = useState<McpEditorMode>(McpEditorMode.FORM);
  const [json, setJson] = useState(() => (server ? writeMcpJson(createMcpFormDraft(server)) : ""));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const update = (value: Partial<typeof draft>) =>
    setDraft((previous) => ({ ...previous, ...value }));
  const save = async () => {
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      if (mode === McpEditorMode.JSON) {
        const inputs = readMcpJson(json, draft, server);
        const [input] = inputs;
        if (server) {
          if (!input || inputs.length !== 1) throw new Error("编辑时 JSON 只能包含一个服务器");
          await saveMcpServer(input, server);
        } else {
          await importMcpServers(inputs);
        }
      } else {
        await saveMcpServer(readMcpForm(draft, server), server);
      }
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存 MCP 配置失败");
    } finally {
      setIsSaving(false);
    }
  };
  const selectMode = (key: React.Key) => {
    if (key !== McpEditorMode.FORM && key !== McpEditorMode.JSON) return;
    setError(null);
    if (key === McpEditorMode.JSON) {
      try {
        readMcpForm(draft, server);
        setJson(writeMcpJson(draft));
      } catch {
        // 未完成的表单继续保留在原状态，JSON 使用空白示例等待粘贴。
        setJson("");
      }
      setMode(key);
      return;
    }
    if (json.trim()) {
      try {
        const inputs = readMcpJson(json, draft, server);
        const [input] = inputs;
        if (!input || inputs.length !== 1)
          throw new Error("JSON 包含多个服务器，无法切换为单服务器表单");
        setDraft(createMcpFormDraft(input));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "JSON 配置无法转换为表单");
        return;
      }
    }
    setMode(key);
  };
  return (
    <Modal.Backdrop
      isOpen
      isDismissable={!isSaving}
      onOpenChange={(open) => !open && !isSaving && onClose()}
    >
      <Modal.Container scroll="inside">
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.CloseTrigger aria-label="关闭 MCP 配置" isDisabled={isSaving} />
          <Modal.Header>
            <Modal.Heading>{server ? "编辑 MCP 服务器" : "添加 MCP 服务器"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="scrollbar-none">
            <Form
              id={formId}
              aria-label="MCP 服务器配置"
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <Tabs selectedKey={mode} variant="primary" onSelectionChange={selectMode}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label="MCP 配置方式">
                    <Tabs.Tab id={McpEditorMode.FORM}>
                      表单配置
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id={McpEditorMode.JSON}>
                      JSON 配置
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel className="px-0 pb-0" id={McpEditorMode.FORM}>
                  <div className="flex flex-col gap-4">
                    <McpConnectionFields draft={draft} isSaving={isSaving} onChange={update} />
                  </div>
                </Tabs.Panel>
                <Tabs.Panel className="px-0 pb-0" id={McpEditorMode.JSON}>
                  <TextField
                    fullWidth
                    variant="secondary"
                    isRequired
                    isDisabled={isSaving}
                    value={json}
                    onChange={setJson}
                  >
                    <Label>mcp.json</Label>
                    <TextArea
                      className="font-mono text-xs"
                      rows={12}
                      maxLength={262144}
                      placeholder={MCP_JSON_PLACEHOLDER}
                    />
                    <Description>
                      JSON 会解析后与下方通用设置合并；添加时可包含多个服务器。
                    </Description>
                    <FieldError />
                  </TextField>
                </Tabs.Panel>
              </Tabs>
              <McpCommonFields
                draft={draft}
                isJsonMode={mode === McpEditorMode.JSON}
                isSaving={isSaving}
                {...(server ? { server } : {})}
                onChange={update}
              />
              {error ? (
                <Alert status="danger">
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button isDisabled={isSaving} variant="tertiary" onPress={onClose}>
              取消
            </Button>
            <Button form={formId} isPending={isSaving} type="submit">
              保存配置
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
