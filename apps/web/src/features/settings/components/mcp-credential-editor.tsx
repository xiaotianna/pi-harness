import { Alert, Button, Description, Label, Modal, TextArea, TextField } from "@heroui/react";
import { McpTransport } from "@pi-harness/agent-runtime/mcp-contract";
import { useState } from "react";
import { deleteMcpCredential, type McpServer, putMcpCredential } from "../api/mcp-api";
import { readMcpCredential } from "../utils/mcp-form";

export function McpCredentialEditor({
  server,
  onClose,
  onSaved,
}: {
  server: McpServer;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (shouldDelete: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      if (shouldDelete) await deleteMcpCredential(server);
      else await putMcpCredential(server, readMcpCredential(text, server));
      setText("");
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存凭据失败");
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
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          <Modal.Header>
            <Modal.Heading>{server.name} 的凭据</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <TextField isDisabled={isSaving} value={text} onChange={setText}>
              <Label>
                {server.config.transport === McpTransport.STDIO
                  ? "环境变量（JSON 对象）"
                  : "请求头（JSON 对象）"}
              </Label>
              <TextArea
                autoComplete="off"
                spellCheck={false}
                rows={5}
                maxLength={65536}
                variant="secondary"
                placeholder={
                  server.config.transport === McpTransport.STDIO
                    ? '{"API_KEY":"你的密钥"}'
                    : '{"Authorization":"Bearer 你的密钥"}'
                }
              />
              <Description>
                仅发送给本机 daemon 保存，不回显已有值。替换或移除后需要重新信任。
              </Description>
            </TextField>
            {error ? (
              <Alert status="danger">
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            {server.hasCredential ? (
              <Button isDisabled={isSaving} variant="danger-soft" onPress={() => void save(true)}>
                移除凭据
              </Button>
            ) : null}
            <Button isDisabled={isSaving} variant="tertiary" onPress={onClose}>
              取消
            </Button>
            <Button isPending={isSaving} isDisabled={!text.trim()} onPress={() => void save(false)}>
              保存凭据
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
