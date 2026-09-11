import { Toast } from "@heroui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { OverlayScrollbars } from "../components/ui/overlay-scrollbars";
import { ThemeProvider } from "../features/settings";
import { queryClient } from "./query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <OverlayScrollbars />
      <Toast.Provider placement="top" />
    </ThemeProvider>
  );
}
