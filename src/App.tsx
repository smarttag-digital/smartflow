import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import PipelinePage from "@/pages/PipelinePage";
import PropertiesPage from "@/pages/PropertiesPage";
import PartnersPage from "@/pages/PartnersPage";
import FinancePage from "@/pages/FinancePage";
import CapturePage from "@/pages/CapturePage";
import ReportsPage from "@/pages/ReportsPage";
import AutomationPage from "@/pages/AutomationPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PrivacyProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
              <Route path="/leads" element={<ProtectedLayout><LeadsPage /></ProtectedLayout>} />
              <Route path="/pipeline" element={<ProtectedLayout><PipelinePage /></ProtectedLayout>} />
              <Route path="/properties" element={<ProtectedLayout><PropertiesPage /></ProtectedLayout>} />
              <Route path="/partners" element={<ProtectedLayout><PartnersPage /></ProtectedLayout>} />
              <Route path="/finance" element={<ProtectedLayout><FinancePage /></ProtectedLayout>} />
              <Route path="/capture" element={<ProtectedLayout><CapturePage /></ProtectedLayout>} />
              <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
              <Route path="/automation" element={<ProtectedLayout><AutomationPage /></ProtectedLayout>} />
              <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
              <Route path="/admin" element={<ProtectedLayout><AdminPage /></ProtectedLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PrivacyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
