import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-8">
        <Outlet />
      </main>
    </div>
  );
}
