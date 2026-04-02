import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "dark" | "light" | "monokai" | "github-dark" | "solarized-dark";

interface ThemeContext {
	theme: ThemeId;
	setTheme: (theme: ThemeId) => void;
}

const ctx = createContext<ThemeContext>({ theme: "dark", setTheme: () => {} });

const STORAGE_KEY = "veriel-ops-theme";

export const THEMES: { id: ThemeId; label: string }[] = [
	{ id: "dark", label: "Dark (Vercel)" },
	{ id: "light", label: "Light" },
	{ id: "monokai", label: "Monokai" },
	{ id: "github-dark", label: "GitHub Dark" },
	{ id: "solarized-dark", label: "Solarized Dark" },
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<ThemeId>(() => {
		return (localStorage.getItem(STORAGE_KEY) as ThemeId) || "dark";
	});

	function setTheme(t: ThemeId) {
		setThemeState(t);
		localStorage.setItem(STORAGE_KEY, t);
	}

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	return <ctx.Provider value={{ theme, setTheme }}>{children}</ctx.Provider>;
}

export function useTheme() {
	return useContext(ctx);
}
