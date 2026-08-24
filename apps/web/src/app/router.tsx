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
import { ChatThreadPage } from "../pages/chat-thread-page";
import { ExplorePage } from "../pages/explore-page";
import { LibraryPage } from "../pages/library-page";
import { LoginPage } from "../pages/login-page";
import { NewChatPage } from "../pages/new-chat-page";
import { queryClient } from "./query-client";

function RootLayout() {
  return <Outlet />;
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
  loader: async ({ params }) => {
    try {
      return await queryClient.ensureQueryData(sessionSnapshotQueryOptions(params.chatId));
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.status === 404) throw notFound();
      throw error;
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
  chatLayoutRoute.addChildren([newChatRoute, libraryRoute, exploreRoute, chatThreadRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
