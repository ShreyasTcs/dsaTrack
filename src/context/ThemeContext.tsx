"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSettings, putSettings } from "@/lib/storage";

type Theme = "dark-minimal" | "colorful" | "professional";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark-minimal",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark-minimal");

  useEffect(() => {
    const settings = getSettings();
    setTheme(settings.theme || "dark-minimal");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    putSettings({ theme: newTheme });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
