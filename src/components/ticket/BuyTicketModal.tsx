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

      // Otherwise, open SSE stream + polling fallback to wait for paymentUrl
      const cleanup = orderService.streamPaymentUrlWithPolling(
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
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
            <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl pointer-events-auto overflow-hidden transition-colors duration-300">
              {/* Close button */}
              {step !== "processing" && (
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors"
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
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-colors duration-300">
                        <Ticket className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted font-medium uppercase tracking-widest">Purchase Tickets</p>
                        <h2 className="text-lg font-bold text-foreground leading-tight transition-colors duration-300">{concertTitle}</h2>
                      </div>
                    </div>

                    {/* Ticket Type Card */}
                    <div className="bg-surface rounded-2xl border border-border p-5 mb-6 transition-colors duration-300">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg transition-colors duration-300">{ticketType.name}</h3>
                          <p className="text-muted text-sm mt-1">Max {ticketType.maxPerUser} per person</p>
                        </div>
                        <span className="text-2xl font-bold text-primary transition-colors duration-300">
                          ${ticketType.price.toLocaleString()}
                        </span>
                      </div>

                      {/* Stock badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${availableStock < 20 ? "bg-orange-400" : "bg-emerald-500"}`} />
                        <span className={`text-xs font-medium ${availableStock < 20 ? "text-orange-500" : "text-emerald-500"}`}>
                          {availableStock < 20 ? `Only ${availableStock} remaining!` : `${availableStock} available`}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-muted mb-3">Quantity</label>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-3xl font-bold text-foreground transition-colors duration-300">{quantity}</span>
                          <p className="text-xs text-muted mt-1">ticket{quantity !== 1 ? "s" : ""}</p>
                        </div>
                        <button
                          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                          disabled={quantity >= maxQty}
                          className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between py-4 border-t border-border mb-6 transition-colors duration-300">
                      <span className="text-muted font-medium">Total</span>
                      <span className="text-2xl font-bold text-foreground transition-colors duration-300">
                        ${totalPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Buy Button */}
                    <Button
                      className="w-full font-semibold"
                      variant="default"
                      size="lg"
                      onClick={handleBuy}
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Proceed to Payment
                    </Button>

                    {/* Trust badge */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-muted text-xs">
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
                      <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center transition-colors duration-300">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-10 h-10 text-primary" />
                        </motion.div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300">Reserving your tickets…</h3>
                    <p className="text-muted text-sm max-w-xs">{processingMsg}</p>
                    <div className="mt-6 flex items-center gap-2 text-muted text-xs">
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
                      <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300">Tickets Reserved!</h3>
                    <p className="text-muted text-sm mb-2">
                      Your seat is held for <span className="text-foreground font-semibold">10 minutes</span>.
                      Complete payment to confirm your booking.
                    </p>
                    <div className="w-full bg-surface rounded-2xl border border-border p-4 my-6 text-left space-y-2 transition-colors duration-300">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Ticket</span>
                        <span className="text-foreground font-medium transition-colors duration-300">{ticketType.name} × {quantity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Total</span>
                        <span className="text-primary font-bold text-base transition-colors duration-300">${totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full font-semibold"
                      variant="default"
                      size="lg"
                      onClick={() => {
                        window.open(paymentUrl, "_blank");
                        if (orderId) {
                          setStep("waiting_payment");
                          const cleanup = orderService.streamOrderConfirmWithPolling(
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
                      className="mt-3 text-sm text-muted hover:text-foreground transition-colors duration-200"
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
                      <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center transition-colors duration-300">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-10 h-10 text-primary" />
                        </motion.div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300">Waiting for Payment</h3>
                    <p className="text-muted text-sm max-w-xs">Please complete your payment in the new tab. We are waiting for confirmation...</p>
                    <button
                      onClick={handleClose}
                      className="mt-6 text-sm text-muted hover:text-foreground transition-colors duration-200"
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
                      <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300">Payment Successful!</h3>
                    <p className="text-muted text-sm mb-6">
                      Your payment was confirmed. Redirecting to your tickets...
                    </p>
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
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
                      <AlertCircle className="w-10 h-10 text-red-550 dark:text-red-450" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2 transition-colors duration-300">Something went wrong</h3>
                    <p className="text-red-500 text-sm mb-8 max-w-xs">{errorMsg}</p>
                    <div className="flex gap-3 w-full">
                      <Button
                        variant="outline"
                        className="flex-1 border-border"
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

