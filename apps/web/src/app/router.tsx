import { EmptyState } from "@agile-avocation/ui-pro";
import { CircleExclamation } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { ApiRequestError } from "../api/request";
import { authSessionQueryOptions } from "../features/auth/api/auth-queries";
import { isAuthErrorCode } from "../features/auth/constants/auth-errors";
import {
  sessionListQueryOptions,
  sessionSnapshotQueryOptions,
} from "../features/chat/api/session-queries";
import { ChatShell } from "../features/chat/components/chat-shell";
import { BoardPage } from "../pages/board-page";
import { ChatThreadPage } from "../pages/chat-thread-page";
import { LoginPage } from "../pages/login-page";
import { McpOAuthLaunchPage, McpOAuthResultPage } from "../pages/mcp-oauth-page";
import { NewChatPage } from "../pages/new-chat-page";
import { SkillOAuthLaunchPage, SkillOAuthResultPage } from "../pages/skill-oauth-page";
import { queryClient } from "./query-client";

function RootLayout() {
  return <Outlet />;
}

function AppErrorRoute() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-10" role="alert">
      <EmptyState className="max-w-md" size="lg">
        <EmptyState.Media variant="icon">
          <CircleExclamation aria-hidden className="text-danger" />
        </EmptyState.Media>
        <EmptyState.Header>
          <EmptyState.Title>页面加载失败</EmptyState.Title>
          <EmptyState.Description>
            页面暂时无法加载，请重试。若问题持续出现，请确认本地 daemon 正在运行。
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <div className="flex gap-2">
            <Button variant="primary" onPress={() => window.location.reload()}>
              重试
            </Button>
            <Button variant="tertiary" onPress={() => window.location.assign("/")}>
              返回首页
            </Button>
          </div>
        </EmptyState.Content>
      </EmptyState>
    </main>
  );
}

function ChatLayout() {
  return (
    <ChatShell>
      <Outlet />
    </ChatShell>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: AppErrorRoute,
});

async function fetchCurrentAuthSession() {
  return queryClient.fetchQuery({
    ...authSessionQueryOptions(),
    staleTime: 0,
  });
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    const authSession = await fetchCurrentAuthSession();
    if (!authSession.authenticated) throw redirect({ replace: true, to: "/login" });
    const sessions = await queryClient.fetchQuery(sessionListQueryOptions());
    const session = sessions[0];
    if (!session) throw redirect({ replace: true, to: "/new" });
    throw redirect({
      params: { chatId: session.id },
      replace: true,
      to: "/$chatId",
    });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => {
    const authError = search.authError;
    return isAuthErrorCode(authError) ? { authError } : {};
  },
  beforeLoad: async () => {
    const session = await fetchCurrentAuthSession();

    if (session.authenticated) {
      throw redirect({ replace: true, to: "/" });
    }
  },
  component: LoginRoute,
});

const skillOAuthLaunchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skill-oauth/$collectionId/launch",
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === "string" && search.name.length <= 80 ? search.name : "插件",
  }),
  component: SkillOAuthLaunchRoute,
});

const skillOAuthResultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skill-oauth/result",
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.message === "string" && search.message.length <= 500
      ? { message: search.message }
      : {}),
    name: typeof search.name === "string" && search.name.length <= 80 ? search.name : "插件",
    status: search.status === "success" ? ("success" as const) : ("error" as const),
  }),
  component: SkillOAuthResultRoute,
});

const mcpOAuthLaunchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mcp-oauth/$serverId/launch",
  validateSearch: (search: Record<string, unknown>) => {
    const rawRevision = search.expectedRevision;
    const expectedRevision =
      typeof rawRevision === "number"
        ? rawRevision
        : typeof rawRevision === "string" && rawRevision.trim() !== ""
          ? Number(rawRevision)
          : Number.NaN;
    return {
      expectedRevision:
        Number.isSafeInteger(expectedRevision) && expectedRevision > 0 ? expectedRevision : null,
      name:
        typeof search.name === "string" && search.name.length <= 100 ? search.name : "MCP 服务器",
    };
  },
  component: McpOAuthLaunchRoute,
});

const mcpOAuthResultRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mcp-oauth/result",
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.message === "string" && search.message.length <= 500
      ? { message: search.message }
      : {}),
    name: typeof search.name === "string" && search.name.length <= 100 ? search.name : "MCP 服务器",
    status: search.status === "success" ? ("success" as const) : ("error" as const),
  }),
  component: McpOAuthResultRoute,
});

const chatLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "chat",
  beforeLoad: async () => {
    const session = await queryClient.ensureQueryData({
      ...authSessionQueryOptions(),
      staleTime: Number.POSITIVE_INFINITY,
    });

    if (!session.authenticated) {
      throw redirect({ replace: true, to: "/login" });
    }
  },
  component: ChatLayout,
});

const newChatRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/new",
  component: NewChatPage,
});

const boardRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/board",
  component: BoardPage,
});

const unknownRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "$",
  beforeLoad: () => {
    throw redirect({ replace: true, to: "/new" });
  },
});

const chatThreadRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/$chatId",
  loader: ({ params }) => {
    void queryClient.prefetchQuery(sessionSnapshotQueryOptions(params.chatId));
  },
  errorComponent: ({ error }) =>
    error instanceof ApiRequestError && (error.status === 400 || error.status === 404) ? (
      <Navigate replace to="/new" />
    ) : (
      <AppErrorRoute />
    ),
  component: ChatThreadRoute,
});

function ChatThreadRoute() {
  const { chatId } = chatThreadRoute.useParams();

  return <ChatThreadPage sessionId={chatId} />;
}

function LoginRoute() {
  const search = loginRoute.useSearch();
  return <LoginPage authError={search.authError} />;
}

function SkillOAuthLaunchRoute() {
  const { collectionId } = skillOAuthLaunchRoute.useParams();
  const { name } = skillOAuthLaunchRoute.useSearch();
  return <SkillOAuthLaunchPage collectionId={collectionId} name={name} />;
}

function SkillOAuthResultRoute() {
  const { message, name, status } = skillOAuthResultRoute.useSearch();
  return <SkillOAuthResultPage message={message} name={name} status={status} />;
}

function McpOAuthLaunchRoute() {
  const { serverId } = mcpOAuthLaunchRoute.useParams();
  const { expectedRevision, name } = mcpOAuthLaunchRoute.useSearch();
  return <McpOAuthLaunchPage expectedRevision={expectedRevision} name={name} serverId={serverId} />;
}

function McpOAuthResultRoute() {
  const { message, name, status } = mcpOAuthResultRoute.useSearch();
  return <McpOAuthResultPage message={message} name={name} status={status} />;
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  skillOAuthLaunchRoute,
  skillOAuthResultRoute,
  mcpOAuthLaunchRoute,
  mcpOAuthResultRoute,
  chatLayoutRoute.addChildren([newChatRoute, boardRoute, chatThreadRoute, unknownRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
