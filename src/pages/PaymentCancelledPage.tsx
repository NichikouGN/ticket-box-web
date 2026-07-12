import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCancelledPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300">
          {/* Decorative top strip */}
          <div className="h-1.5 bg-red-500" />

          <div className="p-10 flex flex-col items-center text-center">
            {/* Cancelled Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="relative mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                >
                  <XCircle className="w-12 h-12 text-red-500" />
                </motion.div>
              </div>
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-foreground mb-3"
            >
              Payment Cancelled
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-muted text-sm mb-8 max-w-xs leading-relaxed"
            >
              Your payment was cancelled. Your ticket reservation is still held
              for a limited time — you can try again before it expires.
            </motion.p>

            {/* Info box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="w-full bg-surface rounded-2xl border border-border p-5 mb-8 transition-colors duration-300"
            >
              <p className="text-sm text-muted">
                No charges were made to your card. You can safely close this page
                or browse other events.
              </p>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex gap-3 w-full"
            >
              <Button
                variant="outline"
                size="lg"
                className="flex-1 border-border"
                onClick={() => navigate("/concerts", { replace: true })}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Browse Events
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
