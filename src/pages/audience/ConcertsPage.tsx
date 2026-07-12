import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, CalendarX } from "lucide-react";
import { concertService, type ConcertListItem } from "@/services/concert.service";
import EventCard from "@/components/event/EventCard";
import { Skeleton } from "@/components/ui/skeleton";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";

export default function ConcertsPage() {
  const [concerts, setConcerts] = useState<ConcertListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchConcerts = async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await concertService.listConcerts(pageNum, 12);
      if (response.success) {
        setConcerts(response.data);
        setTotalPages(page + (response.data.length === 12 ? 1 : 0));
      } else {
        setError("Failed to load concerts");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching concerts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerts(page);
  }, [page]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Featured Events</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Discover Live{" "}
            <span className="text-primary">
              Music
            </span>
          </h1>
          <p className="text-muted max-w-2xl mx-auto">
            Find and book tickets for the best concerts, festivals, and live performances happening around you.
          </p>
        </motion.div>

        {error && (
          <div className="text-center p-8 bg-red-500/10 rounded-2xl border border-red-500/20 mb-8">
            <p className="text-red-400">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => fetchConcerts(page)}>
              Try Again
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-4">
                <Skeleton className="h-[200px] w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            ))}
          </div>
        ) : concerts?.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {concerts.map((concert) => (
                <EventCard key={concert.id} concert={concert} />
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center px-4 text-sm text-muted">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 bg-card rounded-3xl border border-border"
          >
            <CalendarX className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No upcoming events</h3>
            <p className="text-muted">Check back later for new concerts and festivals.</p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
