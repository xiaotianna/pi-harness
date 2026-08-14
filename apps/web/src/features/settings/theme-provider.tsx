import { useTheme } from "@heroui/react";
import { createContext, type PropsWithChildren, useContext } from "react";

const ThemeContext = createContext<ReturnType<typeof useTheme> | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useTheme("system");

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);

  if (theme === null) {
    throw new Error("useAppTheme 必须在 ThemeProvider 内使用");
  }

  return theme;
}
