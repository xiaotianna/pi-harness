"use client";

import { Button, FieldError, Form, Input, Label, Modal, TextField, toast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { installSkill } from "../api/skill-api";
import { skillQueryKeys } from "../api/skill-queries";

export function SkillInstallDialog({
  isOpen,
  onClose,
  workspaceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [skillName, setSkillName] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSkillName("");
    setSource("");
  }, [isOpen]);

  const installMutation = useMutation({
    mutationFn: () =>
      installSkill(workspaceId, {
        ...(skillName.trim() ? { skillName: skillName.trim() } : {}),
        source: source.trim(),
      }),
    onError: (mutationError: Error) => setError(mutationError.message),
    onSuccess: async (installedSkillNames) => {
      await queryClient.invalidateQueries({ queryKey: skillQueryKeys.all });
      onClose();
      const names = installedSkillNames.join("、");
      toast.success(`已安装 ${names}`);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!source.trim() || installMutation.isPending) return;
    setError(null);
    installMutation.mutate();
  };

  const handleClose = () => {
    if (!installMutation.isPending) onClose();
  };

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) handleClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.Header>
            <Modal.Heading>安装技能</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              aria-label="安装技能"
              className="flex flex-col gap-4 [--field-border-focus:var(--accent)] [--field-border-width:2px]"
              id="skill-install-form"
              onSubmit={handleSubmit}
            >
              <TextField
                isRequired
                fullWidth
                name="source"
                value={source}
                variant="secondary"
                onChange={setSource}
              >
                <Label>GitHub 地址</Label>
                <Input placeholder="https://github.com/owner/repo" />
                <FieldError />
              </TextField>

              <TextField
                fullWidth
                name="skillName"
                value={skillName}
                variant="secondary"
                onChange={setSkillName}
              >
                <Label>Skill 名称（可选）</Label>
                <Input placeholder="例如 frontend-design" />
                <FieldError />
              </TextField>

              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button
              isDisabled={installMutation.isPending}
              type="button"
              variant="tertiary"
              onPress={handleClose}
            >
              取消
            </Button>
            <Button
              form="skill-install-form"
              isDisabled={!source.trim() || installMutation.isPending}
              isPending={installMutation.isPending}
              type="submit"
            >
              {installMutation.isPending ? "安装中…" : "安装"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
