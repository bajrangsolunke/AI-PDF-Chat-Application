import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";

export function useDarkMode() {
  const dark = useUiStore((s) => s.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
}
