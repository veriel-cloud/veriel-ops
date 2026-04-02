import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/sidebar-context";

const navItems = [
  {
    label: "Overview",
    href: "/",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 4h6v8h-6z" />
        <path d="M4 16h6v4h-6z" />
        <path d="M14 12h6v8h-6z" />
        <path d="M14 4h6v4h-6z" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
      </svg>
    ),
  },
  {
    label: "Deployments",
    href: "/deploys",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" />
        <path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" />
        <circle cx="15" cy="9" r="1" />
      </svg>
    ),
  },
  {
    label: "Audit Log",
    href: "/audit",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 10l0 6" />
        <path d="M12 7l0 .01" />
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.066 2.573c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.573 1.066c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.066 -2.573c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37a1.724 1.724 0 0 0 2.573 -1.066z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const width = collapsed ? "w-[56px]" : "w-[200px]";

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "fixed top-0 left-0 z-40 h-screen bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col transition-[width] duration-200",
        width,
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-12 border-b border-[var(--color-border)]", collapsed ? "justify-center px-2" : "gap-2.5 px-4")}>
        <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="black">
            <path d="M12 2l10 18h-20z" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight">veriel-ops</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            aria-label={collapsed ? item.label : undefined}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-md transition-colors duration-100",
                collapsed ? "justify-center py-2 px-0" : "gap-2.5 px-2.5 py-[7px]",
                isActive
                  ? "text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
              )
            }
          >
            {item.icon}
            {!collapsed && <span className="text-[13px]">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("flex items-center border-t border-[var(--color-border)]", collapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-3")}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">V</span>
            </div>
            <p className="text-[12px] text-[var(--color-text-secondary)] truncate">veriel-dev</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-4 h-4 transition-transform duration-200", collapsed && "rotate-180")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 7l-5 5l5 5" />
            <path d="M17 7l-5 5l5 5" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
