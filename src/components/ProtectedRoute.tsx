import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useAccessControl";
import { useSubscription } from "@/hooks/useSubscription";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import TrialExpiredPage from "@/pages/TrialExpiredPage";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { status, loading: statusLoading } = useUserStatus();
  const { hasAccess, loading: subLoading, subscription } = useSubscription();
  const location = useLocation();

  if (loading || statusLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(230 22% 7%), hsl(260 30% 12%), hsl(230 22% 7%))" }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (status && status !== "approved") return <PendingApprovalPage />;

  // Trial expirado / sem assinatura ativa: bloqueia tudo, exceto a página de Settings (aba Assinatura)
  const isSettingsRoute = location.pathname.startsWith("/settings");
  if (subscription && !hasAccess && !isSettingsRoute) {
    return <TrialExpiredPage />;
  }

  return <>{children}</>;
}
