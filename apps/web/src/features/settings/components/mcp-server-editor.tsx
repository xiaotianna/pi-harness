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
import { McpTransport } from "@pi-harness/agent-runtime/mcp-contract";
import { useId, useState } from "react";
import { importMcpServers, type McpServer, saveMcpServer } from "../api/mcp-api";
import {
  createMcpFormDraft,
  MCP_JSON_PLACEHOLDER,
  MCP_TRANSPORT_OPTIONS,
  type McpFormDraft,
  readMcpForm,
  readMcpJson,
} from "../utils/mcp-form";

const McpEditorMode = {
  FORM: "form",
  JSON: "json",
} as const;
type McpEditorMode = (typeof McpEditorMode)[keyof typeof McpEditorMode];

function McpFormFields({
  draft,
  isSaving,
  server,
  onChange,
}: {
  draft: McpFormDraft;
  isSaving: boolean;
  server?: McpServer;
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
        <Label>名称</Label>
        <Input autoFocus maxLength={100} placeholder="例如：文档服务" />
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
      </Select>
      <TextField
        fullWidth
        variant="secondary"
        isRequired
        isDisabled={isSaving}
        value={draft.endpoint}
        onChange={(endpoint) => onChange({ endpoint })}
      >
        <Label>{draft.transport === McpTransport.STDIO ? "可执行命令" : "服务器地址"}</Label>
        <Input
          maxLength={4096}
          placeholder={
            draft.transport === McpTransport.STDIO
              ? "/usr/local/bin/mcp-server"
              : "https://example.com/mcp"
          }
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
            <Label>命令参数（JSON 数组）</Label>
            <TextArea rows={3} maxLength={65536} />
            <Description>
              直接执行命令，不经过 Shell；在对话中使用时，工作目录为当前会话目录。
            </Description>
          </TextField>
          <p className="text-sm text-muted">
            本地服务器以你的系统账户权限运行，当前未提供操作系统沙箱。保存不会启动命令，连接前需确认信任。
          </p>
        </>
      ) : (
        <>
          <Switch
            isDisabled={isSaving}
            isSelected={draft.hasStaticAuth}
            onChange={(hasStaticAuth) => onChange({ hasStaticAuth })}
          >
            <Switch.Content className="w-full justify-between">
              <Label>使用请求头凭据</Label>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
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
      )}
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
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const update = (value: Partial<typeof draft>) =>
    setDraft((previous) => ({ ...previous, ...value }));
  const save = async () => {
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      if (!server && mode === McpEditorMode.JSON) {
        await importMcpServers(readMcpJson(json));
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
  return (
    <Modal.Backdrop
      isOpen
      isDismissable={!isSaving}
      onOpenChange={(open) => !open && !isSaving && onClose()}
    >
      <Modal.Container scroll="inside">
        <Modal.Dialog className={server ? "sm:max-w-md" : "sm:max-w-lg"}>
          <Modal.CloseTrigger aria-label="关闭 MCP 配置" isDisabled={isSaving} />
          <Modal.Header>
            <Modal.Heading>{server ? "编辑 MCP 服务器" : "添加 MCP 服务器"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              id={formId}
              aria-label="MCP 服务器配置"
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {server ? (
                <McpFormFields
                  draft={draft}
                  isSaving={isSaving}
                  server={server}
                  onChange={update}
                />
              ) : (
                <Tabs
                  selectedKey={mode}
                  variant="primary"
                  onSelectionChange={(key) => {
                    if (key === McpEditorMode.FORM || key === McpEditorMode.JSON) {
                      setError(null);
                      setMode(key);
                    }
                  }}
                >
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
                      <McpFormFields draft={draft} isSaving={isSaving} onChange={update} />
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
                        rows={14}
                        maxLength={262144}
                        placeholder={MCP_JSON_PLACEHOLDER}
                      />
                      <Description>
                        使用 mcpServers 对象，可一次添加多个服务器。凭据需在保存后单独设置。
                      </Description>
                      <FieldError />
                    </TextField>
                  </Tabs.Panel>
                </Tabs>
              )}
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
