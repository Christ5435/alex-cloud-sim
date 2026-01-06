import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OtpVerification from "./pages/OtpVerification";
import Dashboard from "./pages/Dashboard";
import FilesPage from "./pages/dashboard/FilesPage";
import NodesPage from "./pages/dashboard/NodesPage";
import ActivityPage from "./pages/dashboard/ActivityPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import AdminUsersPage from "./pages/admin/UsersPage";
import AdminNodesPage from "./pages/admin/NodesPage";
import AdminActivityPage from "./pages/admin/ActivityPage";
import AdminSecurityPage from "./pages/admin/SecurityLogsPage";
import SharedFile from "./pages/SharedFile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/otp-verification" element={<OtpVerification />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/files" element={<FilesPage />} />
            <Route path="/dashboard/nodes" element={<NodesPage />} />
            <Route path="/dashboard/activity" element={<ActivityPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminUsersPage />} />
            <Route path="/admin/nodes" element={<AdminNodesPage />} />
            <Route path="/admin/activity" element={<AdminActivityPage />} />
            <Route path="/admin/security" element={<AdminSecurityPage />} />
            <Route path="/shared/:token" element={<SharedFile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;