import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  return (
    <aside className="fixed top-0 left-0 z-40 h-screen w-[200px] bg-[var(--color-bg)] border-r border-[var(--color-border)] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-[var(--color-border)]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-12 h-12 shrink-0">
          <path d="M100 10L20 44v60c0 48 34 80 80 92 46-12 80-44 80-92V44L100 10z" fill="none" stroke="#fff" strokeWidth="5"/>
          <g transform="translate(29, 26) scale(1.4)">
            <path fill="#fff" strokeWidth="2" stroke="#fff" d="M76.277 22.056a7.02 7.02 0 0 0-10.692 9.022l-8.337 8.337a9.07 9.07 0 0 0-5.196-1.628c-2.09 0-4.018.707-5.558 1.893l-5.856-5.856a5.417 5.417 0 1 0-1.888 1.895l5.885 5.884a9.07 9.07 0 0 0-1.64 4.217h-9.072A7.02 7.02 0 0 0 20 47.101a7.02 7.02 0 0 0 13.902 1.397h9.165a9.15 9.15 0 0 0 7.69 7.444v9.524a7.02 7.02 0 1 0 2.676.034V55.93c4.378-.667 7.743-4.458 7.743-9.02 0-2.138-.739-4.106-1.975-5.662l8.319-8.32a7.02 7.02 0 0 0 8.758-.942 7.02 7.02 0 0 0-.001-9.929M52.052 53.271a6.37 6.37 0 0 1-6.361-6.36c0-3.509 2.853-6.362 6.36-6.362s6.362 2.853 6.362 6.361a6.37 6.37 0 0 1-6.361 6.361"/>
          </g>
        </svg>
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)] tracking-tight">veriel-ops</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors duration-100",
                isActive
                  ? "text-[var(--color-text-primary)] bg-[var(--color-bg-hover)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[var(--color-text-tertiary)]">V</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-[var(--color-text-secondary)] truncate">veriel-dev</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
