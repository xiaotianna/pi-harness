"use client";

import { Avatar, Dropdown, dropdownVariants, Label } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { logout } from "../api/auth-api";
import { authQueryKeys, authSessionQueryOptions } from "../api/auth-queries";

const dropdownStyles = dropdownVariants();

export function UserMenu() {
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
    <Dropdown>
      <Dropdown.Trigger
        aria-label="打开用户菜单"
        className="flex items-center gap-3 text-left"
        isDisabled={logoutMutation.isPending}
        style={{ transform: "none" }}
      >
        {({ isPressed }) => (
          <>
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
          </>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          aria-label="用户操作"
          onAction={(key) => {
            if (key === "logout") {
              logoutMutation.mutate();
            }
          }}
        >
          <Dropdown.Item id="logout" textValue="退出登录" variant="danger">
            <LogOut className="size-4 text-danger" />
            <Label>{logoutMutation.isError ? "退出失败，请重试" : "退出登录"}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
