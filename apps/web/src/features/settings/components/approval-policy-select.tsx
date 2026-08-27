"use client";

import { ChevronDown } from "@gravity-ui/icons";
import { AlertDialog, Button, Description, Dropdown, Label, ListBox, Select } from "@heroui/react";
import {
  ApprovalPolicy,
  type ApprovalPolicy as ApprovalPolicyValue,
  isApprovalPolicy,
} from "@pi-harness/policy/approval-policy";
import { Hand, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";

const FULL_ACCESS_TEXT_CLASS_NAME = "text-[color-mix(in_oklab,var(--danger)_65%,var(--warning))]";

const APPROVAL_POLICY_OPTIONS = [
  {
    description: "编辑工作区文件和执行命令前始终询问",
    icon: Hand,
    label: "请求批准",
    value: ApprovalPolicy.REQUEST_APPROVAL,
  },
  {
    description: "工作区文件修改自动批准，执行命令仍会询问",
    icon: ShieldCheck,
    label: "帮我批准",
    value: ApprovalPolicy.AUTO_APPROVE,
  },
  {
    description: "允许工作区文件修改和命令执行，不再询问",
    icon: ShieldAlert,
    label: "完全访问权限",
    value: ApprovalPolicy.FULL_ACCESS,
  },
] as const;

export function ApprovalPolicySelect({
  className,
  isDisabled = false,
  showDescription = false,
  value,
  onChange,
}: {
  className?: string;
  isDisabled?: boolean;
  showDescription?: boolean;
  value: ApprovalPolicyValue;
  onChange: (value: ApprovalPolicyValue) => void;
}) {
  const [isFullAccessDialogOpen, setIsFullAccessDialogOpen] = useState(false);
  const handleChange = (nextValue: ApprovalPolicyValue) => {
    if (nextValue === value) return;
    if (nextValue === ApprovalPolicy.FULL_ACCESS) {
      setIsFullAccessDialogOpen(true);
      return;
    }
    onChange(nextValue);
  };
  const fullAccessDialog = (
    <AlertDialog.Backdrop isOpen={isFullAccessDialogOpen} onOpenChange={setIsFullAccessDialogOpen}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-[420px]">
          <AlertDialog.Header>
            <AlertDialog.Icon status="warning" />
            <AlertDialog.Heading>开启完全访问权限？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p>
              开启后，工作区文件修改和命令执行将自动批准，不再逐次询问。工作区边界和其他安全限制仍然生效，请仅在信任当前工作区时使用。
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              取消
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                setIsFullAccessDialogOpen(false);
                onChange(ApprovalPolicy.FULL_ACCESS);
              }}
            >
              确认开启
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );

  if (!showDescription) {
    return (
      <>
        <Select
          aria-label="选择权限审批模式"
          isDisabled={isDisabled}
          selectedKey={value}
          variant="secondary"
          {...(className ? { className } : {})}
          onSelectionChange={(key) => {
            if (isApprovalPolicy(key)) handleChange(key);
          }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {APPROVAL_POLICY_OPTIONS.map((option) => (
                <ListBox.Item id={option.value} key={option.value} textValue={option.label}>
                  <Label>{option.label}</Label>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        {fullAccessDialog}
      </>
    );
  }

  const selected = APPROVAL_POLICY_OPTIONS.find((option) => option.value === value);
  const SelectedIcon = selected?.icon ?? Hand;
  const triggerTextClassName =
    value === ApprovalPolicy.FULL_ACCESS ? FULL_ACCESS_TEXT_CLASS_NAME : "text-muted";

  return (
    <>
      <Dropdown>
        <Button
          aria-label="选择权限审批模式"
          isDisabled={isDisabled}
          size="sm"
          variant="ghost"
          {...(className ? { className } : {})}
        >
          <SelectedIcon className={`size-4 ${triggerTextClassName}`} />
          <span className={triggerTextClassName}>{selected?.label}</span>
          <ChevronDown className={`size-3.5 ${triggerTextClassName}`} />
        </Button>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu
            aria-label="权限审批模式"
            selectedKeys={new Set([value])}
            selectionMode="single"
            onAction={(key) => {
              const option = APPROVAL_POLICY_OPTIONS.find((item) => item.value === key);
              if (option) handleChange(option.value);
            }}
          >
            {APPROVAL_POLICY_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isFullAccess = option.value === ApprovalPolicy.FULL_ACCESS;

              return (
                <Dropdown.Item
                  className="ps-2 pe-7"
                  id={option.value}
                  key={option.value}
                  textValue={option.label}
                >
                  <Icon
                    className={`size-4 ${isFullAccess ? FULL_ACCESS_TEXT_CLASS_NAME : "text-muted"}`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <Label className={isFullAccess ? FULL_ACCESS_TEXT_CLASS_NAME : undefined}>
                      {option.label}
                    </Label>
                    <Description className={isFullAccess ? FULL_ACCESS_TEXT_CLASS_NAME : undefined}>
                      {option.description}
                    </Description>
                  </div>
                  <Dropdown.ItemIndicator className="start-auto end-2" />
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {fullAccessDialog}
    </>
  );
}
