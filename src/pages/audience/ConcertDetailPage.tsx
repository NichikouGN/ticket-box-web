import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Ticket as TicketIcon, ArrowLeft } from "lucide-react";
import { concertService, type ConcertDetail, type TicketTypeView } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BuyTicketModal from "@/components/ticket/BuyTicketModal";

export default function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeView[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [seatMapSvgUrl, setSeatMapSvgUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buy ticket modal state
  const [selectedTicket, setSelectedTicket] = useState<TicketTypeView | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [detailRes, ticketsRes, stockRes] = await Promise.all([
          concertService.getConcertDetail(id),
          concertService.getConcertTickets(id),
          concertService.getConcertStock(id),
        ]);

        if (detailRes.success) {
          setConcert(detailRes.data);
          setSeatMapSvgUrl(detailRes.data.seatMapSvgUrl);
        }
        if (ticketsRes.success) {
          setTicketTypes(ticketsRes.data.ticketTypes);
        }
        if (stockRes.success) {
          const stockMap: Record<string, number> = {};
          stockRes.data.ticketTypes.forEach(s => {
            stockMap[s.id] = s.stock;
          });
          setStock(stockMap);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load concert details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full rounded-3xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full mt-6" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !concert) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Oops!</h2>
          <p className="text-red-500 mb-8">{error || "Concert not found"}</p>
          <Button asChild>
            <Link to="/concerts">Back to Events</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const formattedDate = new Date(concert.eventDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 pb-24">
        <Link to="/concerts" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6 transition-colors duration-200">
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        {/* Hero Poster */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-[21/9] rounded-3xl overflow-hidden mb-12 border border-border shadow-2xl transition-colors duration-300"
        >
          {concert.thumbnailUrl ? (
            <img src={concert.thumbnailUrl} alt={concert.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-surface flex items-center justify-center transition-colors duration-300">
              <TicketIcon className="w-24 h-24 text-muted/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent transition-colors duration-300" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight drop-shadow-sm transition-colors duration-300">
              {concert.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted">
              <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md px-4 py-2 rounded-full border border-border transition-colors duration-300">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-foreground/90 font-medium">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md px-4 py-2 rounded-full border border-border transition-colors duration-300">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-foreground/90 font-medium">{concert.venue}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Details Column */}
          <div className="lg:col-span-2 space-y-12">
            <motion.section 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                Lineup
              </h2>
              {concert.artists.some(artist => artist.verifiedBio) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {concert.artists.map((artist, idx) => (
                    <Card key={idx} className="border-border bg-card hover:border-primary/20 transition-all duration-200 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-xl font-bold text-foreground">{artist.name}</h3>
                          {artist.verifiedBio && (
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Verified Bio
                            </span>
                          )}
                        </div>
                        {artist.verifiedBio ? (
                          <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">
                            {artist.verifiedBio}
                          </p>
                        ) : (
                          <p className="text-muted text-xs italic">
                            No biography available.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {concert.artists.map((artist, idx) => (
                    <div key={idx} className="px-5 py-3 rounded-xl bg-card border border-border text-foreground font-medium text-lg shadow-sm transition-colors duration-300">
                      {artist.name}
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            {concert.description && (
              <motion.section 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-6">About the Event</h2>
                <div className="prose dark:prose-invert prose-neutral max-w-none">
                  <p className="text-muted leading-relaxed text-lg whitespace-pre-line">
                    {concert.description}
                  </p>
                </div>
              </motion.section>
            )}

            {seatMapSvgUrl && (
              <motion.section 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-6">Seat Map</h2>
                <div className="rounded-3xl border border-border bg-white dark:bg-neutral-900 p-4 transition-colors duration-300">
                  <img src={seatMapSvgUrl} alt="Seat Map" className="w-full h-auto" />
                </div>
              </motion.section>
            )}
          </div>

          {/* Tickets Column */}
          <div className="space-y-6">
            <div className="sticky top-24">
              <h2 className="text-2xl font-bold text-foreground mb-6">Tickets</h2>
              {ticketTypes.length > 0 ? (
                <div className="space-y-4">
                  {ticketTypes.map((ticket, idx) => {
                    const currentStock = stock[ticket.id] ?? 0;
                    const isSoldOut = currentStock === 0;

                    return (
                      <motion.div 
                        key={ticket.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                      >
                        <Card className={`border-border bg-card shadow-md transition-all duration-300 ${isSoldOut ? 'opacity-60' : ''}`}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl font-bold text-foreground">{ticket.name}</h3>
                                <p className="text-sm text-muted mt-1">Limit {ticket.maxPerUser} per person</p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-bold text-primary transition-colors duration-300">
                                  ${ticket.price.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-6">
                              <span className={`text-sm font-medium ${isSoldOut ? 'text-red-500' : currentStock < 20 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {isSoldOut ? 'Sold Out' : currentStock < 20 ? `Only ${currentStock} left!` : 'Available'}
                              </span>
                              <Button
                                variant={isSoldOut ? "secondary" : "default"}
                                disabled={isSoldOut}
                                onClick={() => !isSoldOut && setSelectedTicket(ticket)}
                              >
                                {isSoldOut ? 'Sold Out' : 'Buy Now'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-border bg-card shadow-sm">
                  <CardContent className="p-8 text-center text-muted">
                    No tickets available yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Ticket Modal */}
      {selectedTicket && concert && (
        <BuyTicketModal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          concertId={concert.id}
          concertTitle={concert.title}
          ticketType={selectedTicket}
          availableStock={stock[selectedTicket.id] ?? 0}
        />
      )}
    </AppLayout>
  );
}
