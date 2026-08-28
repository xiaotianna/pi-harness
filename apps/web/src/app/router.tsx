import { EmptyState } from "@agile-avocation/ui-pro";
import { CircleExclamation } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { CancelledError } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
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
import { ChatPageSkeleton } from "../features/chat/views/chat-page";
import { ChatThreadPage } from "../pages/chat-thread-page";
import { ExplorePage } from "../pages/explore-page";
import { LibraryPage } from "../pages/library-page";
import { LoginPage } from "../pages/login-page";
import { NewChatPage } from "../pages/new-chat-page";
import { queryClient } from "./query-client";

function RootLayout() {
  return <Outlet />;
}

function AppErrorRoute() {
  return (
    <main
      className="flex min-h-svh items-center justify-center px-6 py-10"
      role="alert"
    >
      <EmptyState className="max-w-md" size="lg">
        <EmptyState.Media variant="icon">
          <CircleExclamation aria-hidden className="text-danger" />
        </EmptyState.Media>
        <EmptyState.Header>
          <EmptyState.Title>页面加载失败</EmptyState.Title>
          <EmptyState.Description>
            页面暂时无法加载，请重试。若问题持续出现，请确认本地 daemon
            正在运行。
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <div className="flex gap-2">
            <Button variant="primary" onPress={() => window.location.reload()}>
              重试
            </Button>
            <Button
              variant="tertiary"
              onPress={() => window.location.assign("/")}
            >
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
    if (!authSession.authenticated)
      throw redirect({ replace: true, to: "/login" });
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

const chatLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "chat",
  beforeLoad: async () => {
    const session = await fetchCurrentAuthSession();

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

const libraryRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/library",
  component: LibraryPage,
});

const exploreRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/explore",
  component: ExplorePage,
});

const chatThreadRoute = createRoute({
  getParentRoute: () => chatLayoutRoute,
  path: "/$chatId",
  pendingComponent: ChatPageSkeleton,
  pendingMinMs: 0,
  pendingMs: 0,
  loader: async ({ abortController, params }) => {
    const queryOptions = sessionSnapshotQueryOptions(params.chatId);
    try {
      return await queryClient.ensureQueryData(queryOptions);
    } catch (error: unknown) {
      let finalError = error;
      if (error instanceof CancelledError) {
        abortController.signal.throwIfAborted();
        try {
          return await queryClient.fetchQuery(queryOptions);
        } catch (retryError: unknown) {
          finalError = retryError;
        }
      }
      if (finalError instanceof ApiRequestError && finalError.status === 404)
        throw notFound();
      throw finalError;
    }
  },
  component: ChatThreadRoute,
});

function ChatThreadRoute() {
  const snapshot = chatThreadRoute.useLoaderData();

  return <ChatThreadPage sessionId={snapshot.session.id} />;
}

function LoginRoute() {
  const search = loginRoute.useSearch();
  return <LoginPage authError={search.authError} />;
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  chatLayoutRoute.addChildren([
    newChatRoute,
    libraryRoute,
    exploreRoute,
    chatThreadRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
