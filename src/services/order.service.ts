
// ─── Types ───────────────────────────────────────────────────────────

export interface OrderItem {
  concertId: string;
  ticketTypeId: string;
  quantity: number;
}

export interface CreateOrderInput {
  paymentMethod: "stripe";
  data: OrderItem[];
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    totalPrice: number;
    paymentDeadline: string;
    paymentUrl: string;
  };
}

export interface OrderStatusUpdate {
  status: "PROCESSING" | "PENDING_PAYMENT" | "COMPLETED" | "FAILED" | "EXPIRED";
  paymentUrl?: string;
  paymentDeadline?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getApiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000/api/v1";
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Service ─────────────────────────────────────────────────────────

export const orderService = {
  /**
   * Create an order. Uses raw fetch to include the Idempotency-Key header cleanly.
   */
  createOrder: async (input: CreateOrderInput, idempotencyKey: string): Promise<CreateOrderResponse> => {
    const base = getApiBase();
    const accessToken = localStorage.getItem("accessToken");

    const response = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to create order");
    }
    return data as CreateOrderResponse;
  },

  /**
   * Stream payment URL via SSE with a polling fallback.
   * Uses SSE as the primary mechanism, but starts polling after a short delay
   * in case the SSE pub/sub message is missed due to race conditions.
   */
  streamPaymentUrlWithPolling: (
    orderId: string,
    onUpdate: (update: OrderStatusUpdate) => void,
    onError: (msg: string) => void
  ): (() => void) => {
    let resolved = false;
    const cleanups: (() => void)[] = [];

    const wrappedOnUpdate = (update: OrderStatusUpdate) => {
      if (resolved) return;
      resolved = true;
      // Clean up all strategies
      cleanups.forEach((fn) => fn());
      onUpdate(update);
    };

    const wrappedOnError = (msg: string) => {
      if (resolved) return;
      resolved = true;
      cleanups.forEach((fn) => fn());
      onError(msg);
    };

    // Strategy 1: SSE stream (primary)
    const sseCleanup = orderService._streamBase(orderId, "payment-url", wrappedOnUpdate, (errMsg) => {
      // Only treat as fatal if polling also hasn't resolved it
      if (!resolved) {
        console.warn("[SSE] Stream error, relying on polling fallback:", errMsg);
      }
    });
    cleanups.push(sseCleanup);

    // Strategy 2: Polling fallback (starts after 3 seconds)
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLL_ATTEMPTS = 40; // 40 × 3s = 2 minutes max
    let pollAttempts = 0;

    const pollTimer = setTimeout(() => {
      if (resolved) return;

      const interval = setInterval(async () => {
        if (resolved) {
          clearInterval(interval);
          return;
        }

        pollAttempts++;
        if (pollAttempts > MAX_POLL_ATTEMPTS) {
          clearInterval(interval);
          wrappedOnError("Order processing timed out. Please try again.");
          return;
        }

        try {
          const result = await orderService._pollPaymentUrl(orderId);
          if (result) {
            clearInterval(interval);
            wrappedOnUpdate(result);
          }
        } catch (err: any) {
          console.warn("[Poll] Error polling payment URL:", err?.message);
          // Don't fail on individual poll errors, keep trying
        }
      }, POLL_INTERVAL_MS);

      cleanups.push(() => clearInterval(interval));
    }, POLL_INTERVAL_MS);

    cleanups.push(() => clearTimeout(pollTimer));

    return () => {
      resolved = true;
      cleanups.forEach((fn) => fn());
    };
  },

  streamOrderConfirmWithPolling: (
    orderId: string,
    onUpdate: (update: OrderStatusUpdate) => void,
    onError: (msg: string) => void
  ): (() => void) => {
    let resolved = false;
    const cleanups: (() => void)[] = [];

    const wrappedOnUpdate = (update: OrderStatusUpdate) => {
      if (resolved) return;
      resolved = true;
      cleanups.forEach((fn) => fn());
      onUpdate(update);
    };

    const wrappedOnError = (msg: string) => {
      if (resolved) return;
      resolved = true;
      cleanups.forEach((fn) => fn());
      onError(msg);
    };

    // Strategy 1: SSE stream (primary)
    const sseCleanup = orderService._streamBase(orderId, "order-confirm", wrappedOnUpdate, (errMsg) => {
      if (!resolved) {
        console.warn("[SSE] Stream error, relying on polling fallback:", errMsg);
      }
    });
    cleanups.push(sseCleanup);

    // Strategy 2: Polling fallback (starts after 3 seconds)
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLL_ATTEMPTS = 40; // 40 * 3 = 2 minutes max
    let pollAttempts = 0;

    const pollTimer = setTimeout(() => {
      if (resolved) return;

      const interval = setInterval(async () => {
        if (resolved) {
          clearInterval(interval);
          return;
        }

        pollAttempts++;
        if (pollAttempts > MAX_POLL_ATTEMPTS) {
          clearInterval(interval);
          wrappedOnError("Order confirmation timed out. Please try again.");
          return;
        }

        try {
          const result = await orderService._pollOrderConfirm(orderId);
          if (result) {
            clearInterval(interval);
            wrappedOnUpdate(result);
          }
        } catch (err: any) {
          console.warn("[Poll] Error polling order confirm:", err?.message);
        }
      }, POLL_INTERVAL_MS);

      cleanups.push(() => clearInterval(interval));
    }, POLL_INTERVAL_MS);

    cleanups.push(() => clearTimeout(pollTimer));

    return () => {
      resolved = true;
      cleanups.forEach((fn) => fn());
    };
  },

  /**
   * Poll the SSE endpoint once to check if the payment URL is ready.
   * The SSE endpoint checks the payment-service and returns immediately
   * if the payment is in a terminal state.
   */
  _pollPaymentUrl: async (orderId: string): Promise<OrderStatusUpdate | null> => {
    const base = getApiBase();
    const accessToken = localStorage.getItem("accessToken") ?? "";
    const controller = new AbortController();

    // Set a 5-second timeout for each poll
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${base}/orders/${orderId}/stream/payment-url`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      if (!response.body) {
        return null;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let eventName = "";
      let buffer = "";

      // Read with a per-chunk timeout — if the server doesn't send an
      // immediate response (meaning payment isn't ready), abort and return null
      const chunkTimeout = setTimeout(() => {
        controller.abort();
      }, 3000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              const rawData = line.replace("data:", "").trim();
              if (eventName === "ORDER_UPDATED") {
                clearTimeout(chunkTimeout);
                try {
                  const parsed: OrderStatusUpdate = JSON.parse(rawData);
                  // Only return if it has a meaningful status
                  if (parsed.paymentUrl || parsed.status === "FAILED" || parsed.status === "EXPIRED") {
                    reader.cancel();
                    return parsed;
                  }
                } catch {
                  // Parse error, ignore
                }
                reader.cancel();
                return null;
              } else if (eventName === "TIMEOUT") {
                clearTimeout(chunkTimeout);
                reader.cancel();
                return { status: "FAILED" } as OrderStatusUpdate;
              }
              eventName = "";
            }
          }
        }
      } finally {
        clearTimeout(chunkTimeout);
      }

      return null;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        return null; // Timeout — payment not ready yet
      }
      throw err;
    }
  },

  /**
   * Poll the SSE endpoint once to check if the order confirmation is ready.
   */
  _pollOrderConfirm: async (orderId: string): Promise<OrderStatusUpdate | null> => {
    const base = getApiBase();
    const accessToken = localStorage.getItem("accessToken") ?? "";
    const controller = new AbortController();

    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${base}/orders/${orderId}/stream/order-confirm`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      if (!response.body) {
        return null;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let eventName = "";
      let buffer = "";

      const chunkTimeout = setTimeout(() => {
        controller.abort();
      }, 3000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              const rawData = line.replace("data:", "").trim();
              if (eventName === "ORDER_UPDATED") {
                clearTimeout(chunkTimeout);
                try {
                  const parsed: OrderStatusUpdate = JSON.parse(rawData);
                  if (["COMPLETED", "FAILED", "EXPIRED"].includes(parsed.status)) {
                    reader.cancel();
                    return parsed;
                  }
                } catch {
                  // Parse error, ignore
                }
                reader.cancel();
                return null;
              } else if (eventName === "TIMEOUT") {
                clearTimeout(chunkTimeout);
                reader.cancel();
                return { status: "FAILED" } as OrderStatusUpdate;
              }
              eventName = "";
            }
          }
        }
      } finally {
        clearTimeout(chunkTimeout);
      }

      return null;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        return null; // Timeout — not ready yet
      }
      throw err;
    }
  },

  _streamBase: (
    orderId: string,
    endpoint: string,
    onUpdate: (update: OrderStatusUpdate) => void,
    onError: (msg: string) => void
  ): (() => void) => {
    const base = getApiBase();
    const accessToken = localStorage.getItem("accessToken") ?? "";
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${base}/orders/${orderId}/stream/${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          onError((err as any).message || `Server error ${response.status}`);
          return;
        }

        if (!response.body) {
          onError("No response stream available");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let eventName = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              const rawData = line.replace("data:", "").trim();
              if (eventName === "ORDER_UPDATED") {
                try {
                  const parsed: OrderStatusUpdate = JSON.parse(rawData);
                  onUpdate(parsed);
                } catch {
                  onError("Failed to parse order update");
                }
                return; // Done — close the stream
              } else if (eventName === "TIMEOUT") {
                onError("Order processing timed out. Please try again.");
                return;
              }
              eventName = "";
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          onError(err?.message || "Connection error while waiting for update.");
        }
      }
    })();

    return () => controller.abort();
  }
};
