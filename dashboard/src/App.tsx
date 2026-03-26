import { Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { Deploys } from "./pages/Deploys";
import { NewProject } from "./pages/NewProject";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:name" element={<ProjectDetail />} />
        <Route path="/deploys" element={<Deploys />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
