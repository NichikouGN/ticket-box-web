import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Role = "ORGANIZER" | "STAFF" | "AUDIENCE";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallbackPath?: string;
}

export default function RoleGuard({
  children,
  allowedRoles,
  fallbackPath = "/concerts",
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
