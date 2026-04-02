import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { clearStoredToken } from "@/lib/api";

function LayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed } = useSidebar();

  function handleLogout() {
    clearStoredToken();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-[var(--color-accent)] focus:text-white focus:text-sm"
      >
        Skip to content
      </a>
      <Sidebar />
      <main
        id="main-content"
        className={`flex-1 transition-[margin] duration-200 ${collapsed ? "ml-[56px]" : "ml-[200px]"}`}
      >
        <div className="flex items-center justify-end gap-3 px-4 sm:px-8 pt-4">
          <NotificationBell />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="text-[11px] text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Logout
          </button>
        </div>
        <div key={location.pathname} className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-8 animate-page-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}
