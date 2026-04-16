import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useAccessControl";
import PendingApprovalPage from "@/pages/PendingApprovalPage";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { status, loading: statusLoading } = useUserStatus();

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(230 22% 7%), hsl(260 30% 12%), hsl(230 22% 7%))" }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only approved users can access the system
  if (status && status !== "approved") {
    return <PendingApprovalPage />;
  }

  return <>{children}</>;
}
