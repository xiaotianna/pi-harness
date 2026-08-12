import {
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { ChatShell } from "../features/chat/components/chat-shell";
import { DEFAULT_CHAT_THREAD_ID, getChatThread } from "../features/chat/data/chat";
import { ChatThreadPage } from "../pages/chat-thread-page";
import { ExplorePage } from "../pages/explore-page";
import { LibraryPage } from "../pages/library-page";
import { NewChatPage } from "../pages/new-chat-page";

function RootLayout() {
  return (
    <ChatShell>
      <Outlet />
    </ChatShell>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

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

const newChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/new",
  component: NewChatPage,
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
});

const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/explore",
  component: ExplorePage,
});

const chatThreadRoute = createRoute({
  getParentRoute: () => rootRoute,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  newChatRoute,
  libraryRoute,
  exploreRoute,
  chatThreadRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
