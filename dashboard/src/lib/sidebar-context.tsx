import { createContext, useContext, useState } from "react";

interface SidebarContext {
	collapsed: boolean;
	toggle: () => void;
}

const ctx = createContext<SidebarContext>({ collapsed: false, toggle: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
	const [collapsed, setCollapsed] = useState(false);
	return <ctx.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>{children}</ctx.Provider>;
}

export function useSidebar() {
	return useContext(ctx);
}
