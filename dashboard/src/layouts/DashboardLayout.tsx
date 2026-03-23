import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 ml-[200px]">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
