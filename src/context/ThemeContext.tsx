"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setTheme(s.theme || "dark-minimal"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
