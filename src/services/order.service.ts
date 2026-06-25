
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
    status: string;
    totalPrice: number;
    paymentDeadline: string;
    paymentUrl: string;
  };
}

export interface OrderStatusUpdate {
  status: "PROCESSING" | "PENDING_PAYMENT" | "COMPLETED" | "FAILED" | "EXPIRED";
  paymentUrl?: string;
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
   * Poll the order SSE stream using fetch (which supports custom headers unlike EventSource).
   * Reads the server-sent events line by line from the response body stream.
   * Returns a cleanup/abort function.
   */
  streamOrderStatus: (
    orderId: string,
    onUpdate: (update: OrderStatusUpdate) => void,
    onError: (msg: string) => void
  ): (() => void) => {
    const base = getApiBase();
    const accessToken = localStorage.getItem("accessToken") ?? "";
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${base}/orders/${orderId}/stream`, {
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
          onError(err?.message || "Connection error while waiting for payment URL.");
        }
      }
    })();

    return () => controller.abort();
  },
};
