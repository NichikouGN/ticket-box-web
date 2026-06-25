import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Globe, ArchiveRestore, Ban } from "lucide-react";
import { concertService, type ConcertListItem } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function OrganizerDashboardPage() {
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
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 mt-1">Manage your events and ticket sales</p>
          </div>
          <Button asChild variant="gradient">
            <Link to="/organizer/concerts/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 font-medium text-slate-300">Event</th>
                  <th className="px-6 py-4 font-medium text-slate-300">Date</th>
                  <th className="px-6 py-4 font-medium text-slate-300">Venue</th>
                  <th className="px-6 py-4 font-medium text-slate-300">Status</th>
                  <th className="px-6 py-4 font-medium text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
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
                      <tr key={concert.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                              {concert.thumbnailUrl ? (
                                <img src={concert.thumbnailUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">No Img</div>
                              )}
                            </div>
                            <div className="font-medium text-white line-clamp-1 max-w-xs">{concert.title}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{formattedDate}</td>
                        <td className="px-6 py-4 text-slate-400 max-w-[150px] truncate">{concert.venue}</td>
                        <td className="px-6 py-4">
                          <Badge variant={concert.status.toLowerCase() as any}>
                            {concert.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-white">
                              <Link to={`/organizer/concerts/${concert.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                            
                            {concert.status === 'DRAFT' && (
                              <Button variant="ghost" size="sm" className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => handleAction('publish', concert.id)}>
                                <Globe className="w-4 h-4 mr-1.5" /> Publish
                              </Button>
                            )}
                            {concert.status === 'PUBLISHED' && (
                              <Button variant="ghost" size="sm" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleAction('cancel', concert.id)}>
                                <Ban className="w-4 h-4 mr-1.5" /> Cancel
                              </Button>
                            )}
                            {concert.status === 'CANCELLED' && (
                              <Button variant="ghost" size="sm" className="h-8 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10" onClick={() => handleAction('restore', concert.id)}>
                                <ArchiveRestore className="w-4 h-4 mr-1.5" /> Restore
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No events found. Create your first event!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <div className="flex items-center px-4 text-sm text-slate-400">Page {page} of {totalPages}</div>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
