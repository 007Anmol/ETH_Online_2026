// src/components/ThemeProvider.tsx

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("verichain-theme");

    const initialTheme: Theme = savedTheme === "light" ? "light" : "dark";

    setTheme(initialTheme);

    document.documentElement.classList.toggle(
      "dark",
      initialTheme === "dark"
    );
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme: Theme =
        currentTheme === "light" ? "dark" : "light";

      localStorage.setItem("verichain-theme", nextTheme);

      document.documentElement.classList.toggle(
        "dark",
        nextTheme === "dark"
      );

      return nextTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}