import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Globe, ArchiveRestore, Ban, ShieldCheck } from "lucide-react";
import { concertService, type ConcertListItem } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [concerts, setConcerts] = useState<ConcertListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchConcerts = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const response = await concertService.listOrganizerConcerts(pageNum, 10);
      if (response.success) {
        setConcerts(response.data);
        setTotalPages(page + (response.data.length === 10 ? 1 : 0));
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load concerts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerts(page);
  }, [page]);

  const handleAction = async (action: 'publish' | 'cancel' | 'restore', id: string) => {
    try {
      let res;
      if (action === 'publish') res = await concertService.publishConcert(id);
      else if (action === 'cancel') res = await concertService.cancelConcert(id);
      else res = await concertService.restoreConcert(id);

      if (res.success) {
        toast.success(res.message);
        fetchConcerts(page);
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} concert`);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">Dashboard</h1>
            <p className="text-muted mt-1">Manage your events and ticket sales</p>
          </div>
          {user?.role === "ORGANIZER" && (
            <Button asChild variant="default">
              <Link to="/organizer/concerts/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Link>
            </Button>
          )}
        </div>

        <Card className="border-border bg-card overflow-hidden shadow-md transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface border-b border-border transition-colors duration-300">
                <tr>
                  <th className="px-6 py-4 font-medium text-muted">Event</th>
                  <th className="px-6 py-4 font-medium text-muted">Date</th>
                  <th className="px-6 py-4 font-medium text-muted">Venue</th>
                  <th className="px-6 py-4 font-medium text-muted">Status</th>
                  <th className="px-6 py-4 font-medium text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border transition-colors duration-300">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-32" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : concerts.length > 0 ? (
                  concerts.map((concert) => {
                    const formattedDate = new Date(concert.eventDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
                    });
                    
                    return (
                      <tr key={concert.id} className="hover:bg-surface/50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-surface border border-border overflow-hidden shrink-0 transition-colors duration-300">
                              {concert.thumbnailUrl ? (
                                <img src={concert.thumbnailUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted/60 text-xs">No Img</div>
                              )}
                            </div>
                            <div className="font-medium text-foreground line-clamp-1 max-w-xs transition-colors duration-300">{concert.title}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted">{formattedDate}</td>
                        <td className="px-6 py-4 text-muted max-w-[150px] truncate">{concert.venue}</td>
                        <td className="px-6 py-4">
                          <Badge variant={concert.status.toLowerCase() as any}>
                            {concert.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user?.role === "STAFF" ? (
                              concert.status === 'PUBLISHED' && (
                                <Button asChild variant="ghost" size="sm" className="h-8 text-primary hover:bg-primary/10 rounded-xl">
                                  <Link to={`/organizer/concerts/${concert.id}/checkin`}>
                                    <ShieldCheck className="w-4 h-4 mr-1.5" /> Check-in
                                  </Link>
                                </Button>
                              )
                            ) : (
                              <>
                                <Button asChild variant="ghost" size="sm" className="h-8 text-muted hover:text-foreground hover:bg-surface rounded-xl">
                                  <Link to={`/organizer/concerts/${concert.id}/edit`}>
                                    <Edit className="w-4 h-4" />
                                  </Link>
                                </Button>
                                
                                {concert.status === 'DRAFT' && (
                                  <Button variant="ghost" size="sm" className="h-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl" onClick={() => handleAction('publish', concert.id)}>
                                    <Globe className="w-4 h-4 mr-1.5" /> Publish
                                  </Button>
                                )}
                                {concert.status === 'PUBLISHED' && (
                                  <>
                                    <Button asChild variant="ghost" size="sm" className="h-8 text-primary hover:bg-primary/10 rounded-xl">
                                      <Link to={`/organizer/concerts/${concert.id}/checkin`}>
                                        <ShieldCheck className="w-4 h-4 mr-1.5" /> Check-in
                                      </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:bg-red-500/10 rounded-xl" onClick={() => handleAction('cancel', concert.id)}>
                                      <Ban className="w-4 h-4 mr-1.5" /> Cancel
                                    </Button>
                                  </>
                                )}
                                {concert.status === 'CANCELLED' && (
                                  <Button variant="ghost" size="sm" className="h-8 text-orange-500 hover:bg-orange-500/10 rounded-xl" onClick={() => handleAction('restore', concert.id)}>
                                    <ArchiveRestore className="w-4 h-4 mr-1.5" /> Restore
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      No events found. Create your first event!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex justify-center gap-2 transition-colors duration-300">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <div className="flex items-center px-4 text-sm text-muted">Page {page} of {totalPages}</div>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
