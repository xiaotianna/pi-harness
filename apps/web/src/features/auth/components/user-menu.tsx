"use client";

import { ArrowRightFromSquare as LogOut, Gear as Settings } from "@gravity-ui/icons";
import { AlertDialog, Avatar, Button, Dropdown, dropdownVariants } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { logout } from "../api/auth-api";
import { authQueryKeys, authSessionQueryOptions } from "../api/auth-queries";

const dropdownStyles = dropdownVariants();

export function UserMenu({ onSettings }: { onSettings: () => void }) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(authSessionQueryOptions());
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(authQueryKeys.session(), { authenticated: false });
      await router.navigate({ replace: true, to: "/login" });
    },
  });

  if (!sessionQuery.data?.authenticated) {
    return null;
  }

  const { user } = sessionQuery.data;
  const displayName = user.displayName ?? user.username;

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          aria-label="打开用户菜单"
          className="flex items-center gap-3 text-left"
          isDisabled={logoutMutation.isPending}
          style={{ transform: "none" }}
        >
          {({ isPressed }) => (
            <div className="flex items-center gap-3 px-1 py-1">
              <Avatar
                className={dropdownStyles.trigger({ className: "size-9 shrink-0" })}
                data-pressed={isPressed}
              >
                <Avatar.Image alt={displayName} src={user.avatarUrl} />
                <Avatar.Fallback>
                  <img alt="" className="size-full object-cover" src="/images/blue-avatar.jpg" />
                </Avatar.Fallback>
              </Avatar>
              <span
                className="min-w-0 truncate text-sm font-medium text-foreground"
                data-sidebar="label"
              >
                {displayName}
              </span>
            </div>
          )}
        </Dropdown.Trigger>
        <Dropdown.Popover placement="top start">
          <Dropdown.Menu
            aria-label="用户操作"
            onAction={(key) => {
              if (key === "settings") {
                onSettings();
              } else if (key === "logout") {
                logoutMutation.reset();
                setIsLogoutDialogOpen(true);
              }
            }}
          >
            <Dropdown.Item id="settings" textValue="设置">
              <Settings className="size-4 text-muted" />
              设置
            </Dropdown.Item>
            <Dropdown.Item className="text-danger" id="logout" textValue="退出登录">
              <LogOut className="size-4 text-danger" />
              退出登录
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <AlertDialog.Backdrop
        isOpen={isLogoutDialogOpen}
        onOpenChange={(isOpen) => {
          if (!logoutMutation.isPending) {
            setIsLogoutDialogOpen(isOpen);
          }
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>确认退出登录？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>退出后需要重新登录才能继续使用 PI Harness。</p>
              {logoutMutation.isError ? (
                <p className="mt-2 text-danger">退出失败，请重试。</p>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button isDisabled={logoutMutation.isPending} slot="close" variant="tertiary">
                取消
              </Button>
              <Button
                isPending={logoutMutation.isPending}
                onPress={() => logoutMutation.mutate()}
                variant="danger"
              >
                {logoutMutation.isPending ? "正在退出..." : "退出登录"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
