import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Ticket,
  Minus,
  Plus,
  Loader2,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type TicketTypeView } from "@/services/concert.service";
import { orderService, generateIdempotencyKey } from "@/services/order.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuyTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  concertId: string;
  concertTitle: string;
  ticketType: TicketTypeView;
  availableStock: number;
}

type ModalStep = "select" | "processing" | "redirect" | "waiting_payment" | "success" | "error";



// ─── Component ────────────────────────────────────────────────────────────────

export default function BuyTicketModal({
  isOpen,
  onClose,
  concertId,
  concertTitle,
  ticketType,
  availableStock,
}: BuyTicketModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<ModalStep>("select");
  const [processingMsg, setProcessingMsg] = useState("Creating your reservation…");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const maxQty = Math.min(ticketType.maxPerUser, availableStock);

  const handleClose = useCallback(() => {
    cleanupRef.current?.();
    setStep("select");
    setQuantity(1);
    setPaymentUrl(null);
    setOrderId(null);
    setErrorMsg(null);
    onClose();
  }, [onClose]);

  const handleBuy = async () => {
    setStep("processing");
    setProcessingMsg("Creating your reservation…");

    try {
      const idempotencyKey = generateIdempotencyKey();
      const orderRes = await orderService.createOrder(
        {
          paymentMethod: "stripe",
          data: [{ concertId, ticketTypeId: ticketType.id, quantity }],
        },
        idempotencyKey
      );

      if (!orderRes.success) {
        throw new Error("Failed to create order");
      }

      const { orderId: newOrderId } = orderRes.data;
      setOrderId(newOrderId);
      setProcessingMsg("Generating secure payment link…");

      // If the order already has a paymentUrl right away, skip SSE
      if (orderRes.data.paymentUrl) {
        setPaymentUrl(orderRes.data.paymentUrl);
        setStep("redirect");
        return;
      }

      // Otherwise, open SSE stream to wait for paymentUrl
      const cleanup = orderService.streamPaymentUrl(
        newOrderId,
        (update) => {
          if (update.paymentUrl) {
            setPaymentUrl(update.paymentUrl);
            setStep("redirect");
          } else if (update.status === "FAILED" || update.status === "EXPIRED") {
            setErrorMsg("Your order failed or expired. Please try again.");
            setStep("error");
          }
        },
        (errMsg) => {
          setErrorMsg(errMsg);
          setStep("error");
        }
      );

      cleanupRef.current = cleanup;
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  const totalPrice = ticketType.price * quantity;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={step !== "processing" ? handleClose : undefined}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/50 pointer-events-auto overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-600 rounded-full blur-3xl opacity-10 pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-fuchsia-600 rounded-full blur-3xl opacity-10 pointer-events-none" />

              {/* Close button */}
              {step !== "processing" && (
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <AnimatePresence mode="wait">
                {/* ── Step: Select Quantity ── */}
                {step === "select" && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-8"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Purchase Tickets</p>
                        <h2 className="text-lg font-bold text-white leading-tight">{concertTitle}</h2>
                      </div>
                    </div>

                    {/* Ticket Type Card */}
                    <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-white text-lg">{ticketType.name}</h3>
                          <p className="text-slate-400 text-sm mt-1">Max {ticketType.maxPerUser} per person</p>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                          ${ticketType.price.toLocaleString()}
                        </span>
                      </div>

                      {/* Stock badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${availableStock < 20 ? "bg-orange-400" : "bg-emerald-400"}`} />
                        <span className={`text-xs font-medium ${availableStock < 20 ? "text-orange-400" : "text-emerald-400"}`}>
                          {availableStock < 20 ? `Only ${availableStock} remaining!` : `${availableStock} available`}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-3">Quantity</label>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-3xl font-bold text-white">{quantity}</span>
                          <p className="text-xs text-slate-500 mt-1">ticket{quantity !== 1 ? "s" : ""}</p>
                        </div>
                        <button
                          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                          disabled={quantity >= maxQty}
                          className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between py-4 border-t border-slate-700/50 mb-6">
                      <span className="text-slate-400 font-medium">Total</span>
                      <span className="text-2xl font-bold text-white">
                        ${totalPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Buy Button */}
                    <Button
                      className="w-full"
                      variant="gradient"
                      size="lg"
                      onClick={handleBuy}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Proceed to Payment
                    </Button>

                    {/* Trust badge */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Secured by Stripe. Your seat is held for 10 minutes.</span>
                    </div>
                  </motion.div>
                )}

                {/* ── Step: Processing ── */}
                {step === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 flex flex-col items-center justify-center min-h-[320px] text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full border-2 border-slate-700 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-10 h-10 text-violet-400" />
                        </motion.div>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Reserving your tickets…</h3>
                    <p className="text-slate-400 text-sm max-w-xs">{processingMsg}</p>
                    <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>This usually takes just a few seconds</span>
                    </div>
                  </motion.div>
                )}

                {/* ── Step: Redirect ── */}
                {step === "redirect" && paymentUrl && (
                  <motion.div
                    key="redirect"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 flex flex-col items-center text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mb-6"
                    >
                      <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Tickets Reserved!</h3>
                    <p className="text-slate-400 text-sm mb-2">
                      Your seat is held for <span className="text-white font-semibold">10 minutes</span>.
                      Complete payment to confirm your booking.
                    </p>
                    <div className="w-full bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 my-6 text-left space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Ticket</span>
                        <span className="text-white font-medium">{ticketType.name} × {quantity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total</span>
                        <span className="text-violet-400 font-bold text-base">${totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant="gradient"
                      size="lg"
                      onClick={() => {
                        window.open(paymentUrl, "_blank");
                        if (orderId) {
                          setStep("waiting_payment");
                          const cleanup = orderService.streamOrderConfirm(
                            orderId,
                            (update) => {
                              if (update.status === "COMPLETED") {
                                setStep("success");
                                setTimeout(() => {
                                  window.location.href = "/tickets";
                                }, 2000);
                              } else if (update.status === "FAILED" || update.status === "EXPIRED") {
                                setErrorMsg("Payment failed or expired.");
                                setStep("error");
                              }
                            },
                            (errMsg) => {
                              setErrorMsg(errMsg);
                              setStep("error");
                            }
                          );
                          cleanupRef.current = cleanup;
                        }
                      }}
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Complete Payment
                    </Button>
                    <button
                      onClick={handleClose}
                      className="mt-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      I'll pay later
                    </button>
                  </motion.div>
                )}

                {/* ── Step: Waiting Payment ── */}
                {step === "waiting_payment" && (
                  <motion.div
                    key="waiting_payment"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 flex flex-col items-center justify-center min-h-[320px] text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full border-2 border-slate-700 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-10 h-10 text-violet-400" />
                        </motion.div>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-xl" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Waiting for Payment</h3>
                    <p className="text-slate-400 text-sm max-w-xs">Please complete your payment in the new tab. We are waiting for confirmation...</p>
                    <button
                      onClick={handleClose}
                      className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}

                {/* ── Step: Success ── */}
                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 flex flex-col items-center text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mb-6"
                    >
                      <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Your payment was confirmed. Redirecting to your tickets...
                    </p>
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  </motion.div>
                )}

                {/* ── Step: Error ── */}
                {step === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 flex flex-col items-center text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center mb-6">
                      <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
                    <p className="text-red-400 text-sm mb-8 max-w-xs">{errorMsg}</p>
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setStep("select");
                          setErrorMsg(null);
                        }}
                      >
                        Try Again
                      </Button>
                      <Button className="flex-1" onClick={handleClose}>
                        Close
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
