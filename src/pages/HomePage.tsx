import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  // Role-based redirect
  if (user?.role === "ORGANIZER") {
    return <Navigate to="/organizer" replace />;
  }

  // Default redirect for AUDIENCE or others
  return <Navigate to="/concerts" replace />;
}
