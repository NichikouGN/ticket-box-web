import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId") || searchParams.get("session_id");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!orderId) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/tickets", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, navigate]);

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Session</h1>
          <p className="text-slate-400 mb-6">No payment session found.</p>
          <Button onClick={() => navigate("/concerts")} variant="gradient">
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600 rounded-full blur-[160px] opacity-10" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[160px] opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Decorative top strip */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400" />

          <div className="p-10 flex flex-col items-center text-center">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                >
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </motion.div>
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-white mb-3"
            >
              Payment Successful!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed"
            >
              Your payment has been confirmed. Your tickets are being prepared
              and will be available shortly.
            </motion.p>

            {/* Redirect countdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5 mb-8"
            >
              <div className="flex items-center justify-center gap-3 text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span className="text-sm">
                  Redirecting to your tickets in{" "}
                  <span className="text-white font-bold">{countdown}s</span>
                </span>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex gap-3 w-full"
            >
              <Button
                variant="gradient"
                size="lg"
                className="flex-1"
                onClick={() => navigate("/tickets", { replace: true })}
              >
                <Ticket className="w-5 h-5 mr-2" />
                View My Tickets
              </Button>
            </motion.div>

            {/* Trust badge */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-xs text-slate-500"
            >
              A confirmation email will be sent to your inbox.
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
