/// <reference lib="dom" />
import { useEffect, useState } from "react";

type ColorScheme = "light" | "dark";

export function useColorScheme(): ColorScheme {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");

  useEffect(() => {
    // Check if globalThis and matchMedia are available
    if (typeof globalThis === "undefined" || !("matchMedia" in globalThis)) {
      return;
    }

    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

    // Set initial value
    setColorScheme(mediaQuery.matches ? "dark" : "light");

    // Create event listener
    const updateScheme = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    // Add listener for changes
    mediaQuery.addEventListener("change", updateScheme);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", updateScheme);
    };
  }, []);

  return colorScheme;
}
