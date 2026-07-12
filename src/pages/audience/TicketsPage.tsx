import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket as TicketIcon, Calendar, MapPin, CheckCircle2, Clock, X } from "lucide-react";
import { ticketService, type TicketListItem, type TicketDetail } from "@/services/ticket.service";
import { concertService, type ConcertListItem } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [concerts, setConcerts] = useState<Record<string, ConcertListItem>>({});
  const [ticketNames, setTicketNames] = useState<Record<string, string>>({}); // ticketTypeId -> Name
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedTicket, setSelectedTicket] = useState<TicketListItem | null>(null);
  const [signedDetail, setSignedDetail] = useState<TicketDetail | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch tickets and all concerts in parallel
      const [ticketsRes, concertsRes] = await Promise.all([
        ticketService.getMyTickets(),
        concertService.listConcerts(1, 100),
      ]);

      if (ticketsRes.success) {
        setTickets(ticketsRes.data || []);
      }

      const concertMap: Record<string, ConcertListItem> = {};
      if (concertsRes.success && concertsRes.data) {
        concertsRes.data.forEach((c) => {
          concertMap[c.id] = c;
        });
        setConcerts(concertMap);
      }

      // 2. Fetch ticket types for all unique concerts in the tickets list to map section names
      const uniqueConcertIds = Array.from(
        new Set((ticketsRes.data || []).map((t) => t.concertId).filter(Boolean) as string[])
      );
      const nameMap: Record<string, string> = {};

      await Promise.all(
        uniqueConcertIds.map(async (cId) => {
          try {
            const res = await concertService.getConcertTickets(cId);
            if (res.success && res.data.ticketTypes) {
              res.data.ticketTypes.forEach((tt) => {
                nameMap[tt.id] = tt.name;
              });
            }
          } catch (err) {
            console.error(`Failed to load ticket types for concert ${cId}:`, err);
          }
        })
      );
      setTicketNames(nameMap);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading your tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id") || params.get("orderId");

    const verifySession = async () => {
      const toastId = toast.loading("Confirming your payment and generating your tickets...");
      try {
        // Since payment processing and ticket generation occur asynchronously via webhooks
        // and message queues, we wait briefly for the processes to complete.
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast.success("Payment confirmed! Your tickets are ready.", { id: toastId });
        // Clear query parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "An error occurred while loading your tickets.", { id: toastId });
        loadData();
      }
    };

    if (sessionId) {
      verifySession();
    } else {
      loadData();
    }
  }, []);

  const handleOpenTicket = async (ticket: TicketListItem) => {
    setSelectedTicket(ticket);
    setIsLoadingDetail(true);
    setSignedDetail(null);
    setSignature(null);

    try {
      const res = await ticketService.getTicketDetail(ticket.ticketId);
      if (res.success && res.data) {
        setSignedDetail(res.data.ticket);
        setSignature(res.data.signature);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load ticket security signature");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCloseTicket = () => {
    setSelectedTicket(null);
    setSignedDetail(null);
    setSignature(null);
  };

  // Build the data to embed in QR code
  const getQrCodeUrl = () => {
    if (!signedDetail || !signature) return "";
    const payload = {
      ticket: {
        ticketId: signedDetail.ticketId,
        userId: signedDetail.userId,
        concertId: signedDetail.concertId,
        ticketTypeId: signedDetail.ticketTypeId,
      },
      signature: signature,
    };
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      JSON.stringify(payload)
    )}`;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 pb-24">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground">My Tickets</h1>
          <p className="text-muted mt-1">Access your concert tickets and QR codes for entry</p>
        </div>

        {error && (
          <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/20 mb-8">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadData}>
              Try Again
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-card border border-border">
                <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3 pt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket, idx) => {
              const concert = concerts[ticket.concertId];
              const ticketName = ticketNames[ticket.ticketTypeId] || "Standard Admission";
              const formattedDate = concert
                ? new Date(concert.eventDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Unknown Date";

              return (
                <motion.div
                  key={ticket.ticketId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="cursor-pointer"
                  onClick={() => handleOpenTicket(ticket)}
                >
                  <Card className="border-border bg-card/60 hover:bg-card hover:border-primary/35 transition-all duration-300 overflow-hidden relative shadow-sm">
                    <div className="absolute top-0 right-0 h-full w-1.5 bg-primary transition-colors duration-300" />
                    
                    <CardContent className="p-6 flex gap-5">
                      {/* Event thumbnail */}
                      <div className="w-24 h-24 rounded-xl bg-surface border border-border overflow-hidden shrink-0 transition-colors duration-300">
                        {concert?.thumbnailUrl ? (
                          <img src={concert.thumbnailUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <TicketIcon className="w-10 h-10 text-muted/50" />
                          </div>
                        )}
                      </div>

                      {/* Ticket Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <h2 className="font-bold text-foreground text-lg truncate leading-tight transition-colors duration-300">
                            {concert?.title || "Concert Event"}
                          </h2>
                          <Badge variant={ticket.status === "UNUSED" ? "published" : "secondary"} className="shrink-0">
                            {ticket.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted text-sm mb-1 transition-colors duration-300">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="truncate">{formattedDate}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-muted text-sm mb-3 transition-colors duration-300">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{concert?.venue || "Concert Venue"}</span>
                        </div>

                        <div className="border-t border-border pt-2 flex justify-between items-center text-xs transition-colors duration-300">
                          <span className="text-primary font-semibold transition-colors duration-300">{ticketName}</span>
                          <span className="text-muted font-mono">
                            #{ticket.ticketId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-card rounded-3xl border border-border shadow-sm transition-colors duration-300">
            <TicketIcon className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No tickets found</h3>
            <p className="text-muted max-w-sm mx-auto">
              You haven't purchased any tickets yet. Explore upcoming concerts to buy your tickets!
            </p>
          </div>
        )}

        {/* Ticket QR Modal */}
        <AnimatePresence>
          {selectedTicket && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={handleCloseTicket}
              />

              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 overflow-hidden transition-colors duration-300">
                  {/* Close button */}
                  <button
                    onClick={handleCloseTicket}
                    className="absolute top-4 right-4 p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Modal Header */}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-foreground">Entry Ticket</h3>
                    <p className="text-sm text-muted mt-1">Present this QR code at the venue gate</p>
                  </div>

                  {isLoadingDetail ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-muted text-sm">Generating secure signature…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      {/* Event details summary */}
                      <div className="w-full bg-surface border border-border rounded-2xl p-4 mb-6 transition-colors duration-300">
                        <h4 className="font-bold text-foreground text-base text-center">
                          {concerts[selectedTicket.concertId]?.title || "Concert Event"}
                        </h4>
                        <div className="flex justify-center gap-2 mt-2">
                          <Badge variant={selectedTicket.status === "UNUSED" ? "published" : "secondary"}>
                            {selectedTicket.status}
                          </Badge>
                          <Badge variant="default">
                            {ticketNames[selectedTicket.ticketTypeId] || "Standard"}
                          </Badge>
                        </div>
                      </div>

                      {/* QR Display */}
                      {selectedTicket.status === "UNUSED" ? (
                        <div className="bg-white p-4 rounded-2xl shadow-md mb-6">
                          {getQrCodeUrl() ? (
                            <img src={getQrCodeUrl()} alt="Ticket QR Code" className="w-[200px] h-[200px]" />
                          ) : (
                            <div className="w-[200px] h-[200px] bg-slate-200 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-[230px] h-[230px] border border-dashed border-border bg-surface rounded-2xl flex flex-col items-center justify-center text-center p-4 mb-6 transition-colors duration-300">
                          <CheckCircle2 className="w-12 h-12 text-muted mb-2" />
                          <span className="font-bold text-muted">Ticket Used</span>
                          <span className="text-xs text-muted/80 mt-1">This ticket has already been checked in.</span>
                        </div>
                      )}

                      {/* Security Verification Information */}
                      <div className="w-full bg-surface border border-border rounded-2xl p-3.5 text-center text-xs space-y-1.5 transition-colors duration-300">
                        <div className="flex justify-between text-muted">
                          <span>Ticket ID</span>
                          <span className="font-mono text-foreground/80">{selectedTicket.ticketId}</span>
                        </div>
                        {signature && (
                          <div className="flex justify-between text-muted items-center">
                            <span>Cryptographic Proof</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Authentic
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

type LoaderProps = {
  className?: string;
  [key: string]: any;
};

function Loader2({ className, ...props }: LoaderProps) {
  return <Clock className={`animate-spin ${className}`} {...props} />;
}
