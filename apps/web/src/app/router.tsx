import {
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { authSessionQueryOptions } from "../features/auth/api/auth-queries";
import { isAuthErrorCode } from "../features/auth/constants/auth-errors";
import { ChatShell } from "../features/chat/components/chat-shell";
import { DEFAULT_CHAT_THREAD_ID, getChatThread } from "../features/chat/data/chat";
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
  beforeLoad: () => {
    throw redirect({
      params: { chatId: DEFAULT_CHAT_THREAD_ID },
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
    const session = await fetchCurrentAuthSession().catch(() => null);

    if (session?.authenticated) {
      throw redirect({ replace: true, to: "/" });
    }
  },
  component: LoginRoute,
});

const chatLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "chat",
  beforeLoad: async () => {
    let isAuthenticated = false;
    try {
      const session = await fetchCurrentAuthSession();
      isAuthenticated = session.authenticated;
    } catch {
      isAuthenticated = false;
    }

    if (!isAuthenticated) {
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
  loader: ({ params }) => {
    const thread = getChatThread(params.chatId);

    if (!thread) {
      throw notFound();
    }

    return thread;
  },
  component: ChatThreadRoute,
});

function ChatThreadRoute() {
  const thread = chatThreadRoute.useLoaderData();

  return <ChatThreadPage thread={thread} />;
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
