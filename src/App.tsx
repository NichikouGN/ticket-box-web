import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";

// Auth Pages
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";

// Main Entry
import HomePage from "@/pages/HomePage";

// Audience Pages
import ConcertsPage from "@/pages/audience/ConcertsPage";
import ConcertDetailPage from "@/pages/audience/ConcertDetailPage";
import TicketsPage from "@/pages/audience/TicketsPage";

// Organizer Pages
import OrganizerDashboardPage from "@/pages/organizer/OrganizerDashboardPage";
import CreateEditConcertPage from "@/pages/organizer/CreateEditConcertPage";
import CheckinPage from "@/pages/organizer/CheckinPage";

// Payment Result Pages
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentCancelledPage from "@/pages/PaymentCancelledPage";

import { Toaster } from "sonner";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Root Redirect based on Role */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* AUDIENCE / PUBLIC CONCERT ROUTES */}
          <Route
            path="/concerts"
            element={
              <ProtectedRoute>
                <ConcertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/concerts/:id"
            element={
              <ProtectedRoute>
                <ConcertDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <TicketsPage />
              </ProtectedRoute>
            }
          />

          {/* ORGANIZER ROUTES */}
          <Route
            path="/organizer"
            element={
              <RoleGuard allowedRoles={["ORGANIZER"]}>
                <OrganizerDashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="/organizer/concerts/new"
            element={
              <RoleGuard allowedRoles={["ORGANIZER"]}>
                <CreateEditConcertPage />
              </RoleGuard>
            }
          />
          <Route
            path="/organizer/concerts/:id/edit"
            element={
              <RoleGuard allowedRoles={["ORGANIZER"]}>
                <CreateEditConcertPage />
              </RoleGuard>
            }
          />
          <Route
            path="/organizer/concerts/:id/checkin"
            element={
              <RoleGuard allowedRoles={["ORGANIZER"]}>
                <CheckinPage />
              </RoleGuard>
            }
          />

          {/* Payment Result Pages (public — user arrives from Stripe redirect) */}
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />

          {/* Catch all → redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster theme="dark" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
