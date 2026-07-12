import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw, BarChart2, ShieldCheck, Ticket, Upload, Loader2 as SpinnerIcon, Search } from "lucide-react";
import { ticketService, type CheckinStats } from "@/services/ticket.service";
import { concertService, type ConcertDetail, type VipGuest } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab Control
  const [activeTab, setActiveTab] = useState<"standard" | "vip">("standard");

  // Verification Form State (Standard tickets)
  const [qrJson, setQrJson] = useState("");
  const [manualTicketId, setManualTicketId] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [manualTicketTypeId, setManualTicketTypeId] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // VIP Guests State
  const [vipGuests, setVipGuests] = useState<VipGuest[]>([]);
  const [vipPage, setVipPage] = useState(1);
  const [vipTotal, setVipTotal] = useState(0);
  const [vipLimit] = useState(10);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [vipSearchQuery, setVipSearchQuery] = useState("");

  const fetchDetailsAndStats = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [
        concertService.getOrganizerConcertDetail(id)
      ];

      // Only STAFF can load standard check-in stats in ticket-service
      if (user?.role === "STAFF") {
        promises.push(ticketService.getCheckinStats(id).catch(() => ({ success: false, data: null })));
      }

      const [detailRes, statsRes] = await Promise.all(promises);

      if (detailRes.success) {
        setConcert(detailRes.data);
      }

      if (statsRes && statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        setStats(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load concert details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVipGuests = async (pageNum: number) => {
    if (!id) return;
    try {
      let res;
      if (user?.role === "STAFF") {
        res = await concertService.getStaffVipGuests(id, pageNum, vipLimit);
      } else {
        res = await concertService.getVipGuests(id, pageNum, vipLimit);
      }
      if (res.success) {
        setVipGuests(res.data || []);
        setVipTotal(res.meta?.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to load VIP guests:", err);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !csvFile) return;
    setIsImporting(true);
    try {
      const res = await concertService.importVipGuests(id, csvFile);
      if (res.success) {
        toast.success(res.message || "VIP guests imported successfully");
        setCsvFile(null);
        fetchVipGuests(1);
        setVipPage(1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to import VIP guests");
    } finally {
      setIsImporting(false);
    }
  };

  const handleVipCheckIn = async (vipGuestId: string) => {
    if (!id) return;
    try {
      const res = await concertService.checkInVipGuest(id, vipGuestId);
      if (res.success) {
        toast.success(res.message || "VIP guest checked in successfully");
        fetchVipGuests(vipPage);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check in VIP guest");
    }
  };

  useEffect(() => {
    if (user) {
      fetchDetailsAndStats();
      fetchVipGuests(1);
      if (user.role === "ORGANIZER") {
        setActiveTab("vip");
      } else {
        setActiveTab("standard");
      }
    }
  }, [id, user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    let payload = {
      ticketId: "",
      userId: "",
      concertId: id,
      ticketTypeId: "",
    };

    if (qrJson.trim()) {
      try {
        const parsed = JSON.parse(qrJson);
        if (!parsed.ticketId || !parsed.userId || !parsed.ticketTypeId) {
          throw new Error("Missing required ticket fields in QR payload.");
        }
        payload = {
          ticketId: parsed.ticketId,
          userId: parsed.userId,
          concertId: parsed.concertId || id,
          ticketTypeId: parsed.ticketTypeId,
        };
      } catch (err: any) {
        toast.error("Invalid QR JSON payload format: " + err.message);
        return;
      }
    } else {
      if (!manualTicketId || !manualUserId || !manualTicketTypeId) {
        toast.error("Please paste a QR JSON or enter all manual ticket details");
        return;
      }
      payload = {
        ticketId: manualTicketId,
        userId: manualUserId,
        concertId: id,
        ticketTypeId: manualTicketTypeId,
      };
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await ticketService.verifyTicket(payload);
      if (res.success) {
        setVerificationResult({
          success: true,
          message: res.message || "Ticket verified and checked in successfully!",
        });
        toast.success("Check-in successful!");
        setQrJson("");
        setManualTicketId("");
        setManualUserId("");
        setManualTicketTypeId("");
        // Reload stats
        fetchDetailsAndStats();
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.message || "Verification failed.",
      });
      toast.error(err.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading && !concert) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const attendancePercent =
    stats && stats.totalTickets > 0
      ? Math.round((stats.checkedInTickets / stats.totalTickets) * 100)
      : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12 pb-24">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">Event Gate Check-in</h1>
            <p className="text-muted mt-1">{concert?.title || "Concert Event"}</p>
          </div>
          {user?.role === "STAFF" && (
            <Button variant="outline" size="sm" onClick={fetchDetailsAndStats} className="border-border">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Stats
            </Button>
          )}
        </div>

        {/* Stats Summary (STAFF only) */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-border bg-card shadow-sm transition-colors duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted text-xs font-semibold uppercase tracking-wider">Total Tickets Sold</p>
                    <h3 className="text-3xl font-bold text-foreground mt-2 transition-colors duration-300">{stats.totalTickets || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-surface border border-border rounded-lg text-muted transition-colors duration-300">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm transition-colors duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted text-xs font-semibold uppercase tracking-wider">Checked In</p>
                    <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 transition-colors duration-300">{stats.checkedInTickets || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm transition-colors duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted text-xs font-semibold uppercase tracking-wider">Remaining</p>
                    <h3 className="text-3xl font-bold text-primary mt-2 transition-colors duration-300">{stats.remainingTickets || 0}</h3>
                  </div>
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary transition-colors duration-300">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm transition-colors duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-muted text-xs font-semibold uppercase tracking-wider">Attendance Rate</p>
                    <h3 className="text-3xl font-bold text-foreground mt-2 transition-colors duration-300">{attendancePercent}%</h3>
                  </div>
                  <div className="p-2.5 bg-surface border border-border rounded-lg text-muted transition-colors duration-300">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Selector (only for STAFF since organizers only handle VIP import/list) */}
        {user?.role === "STAFF" && (
          <div className="flex gap-4 border-b border-border mb-8 transition-colors duration-300">
            <button
              onClick={() => setActiveTab("standard")}
              className={`pb-4 px-2 font-semibold text-sm transition-colors relative ${activeTab === "standard" ? "text-foreground font-bold" : "text-muted hover:text-foreground"
                }`}
            >
              Standard Tickets Check-in
              {activeTab === "standard" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("vip")}
              className={`pb-4 px-2 font-semibold text-sm transition-colors relative ${activeTab === "vip" ? "text-foreground font-bold" : "text-muted hover:text-foreground"
                }`}
            >
              VIP Guests Check-in
              {activeTab === "vip" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        )}

        {/* Standard Tickets Check-in (STAFF only) */}
        {activeTab === "standard" && user?.role === "STAFF" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border bg-card shadow-sm transition-colors duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground transition-colors duration-300">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Verify Ticket
                  </CardTitle>
                  <CardDescription className="text-muted">
                    Scan the ticket QR code and paste the decoded JSON here, or enter the ID details manually.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerify} className="space-y-6">
                    {/* QR Input */}
                    <div className="space-y-2">
                      <Label htmlFor="qr-json">QR Code Decoded JSON Payload</Label>
                      <Textarea
                        id="qr-json"
                        value={qrJson}
                        onChange={(e) => {
                          setQrJson(e.target.value);
                          if (e.target.value.trim()) {
                            setManualTicketId("");
                            setManualUserId("");
                            setManualTicketTypeId("");
                          }
                        }}
                        placeholder='{"ticketId":"...","userId":"...","concertId":"...","ticketTypeId":"...","signature":"..."}'
                        className="font-mono text-sm h-32 border-border bg-input"
                      />
                    </div>

                    {/* Manual Section Separator */}
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-border"></div>
                      <span className="flex-shrink mx-4 text-muted text-xs font-semibold uppercase">Or Enter Manually</span>
                      <div className="flex-grow border-t border-border"></div>
                    </div>

                    {/* Manual Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ticket-id">Ticket ID</Label>
                        <Input
                          id="ticket-id"
                          value={manualTicketId}
                          onChange={(e) => {
                            setManualTicketId(e.target.value);
                            if (e.target.value.trim()) setQrJson("");
                          }}
                          placeholder="UUID"
                          disabled={!!qrJson.trim()}
                          className="border-border bg-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-id">User ID</Label>
                        <Input
                          id="user-id"
                          value={manualUserId}
                          onChange={(e) => {
                            setManualUserId(e.target.value);
                            if (e.target.value.trim()) setQrJson("");
                          }}
                          placeholder="UUID"
                          disabled={!!qrJson.trim()}
                          className="border-border bg-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ticket-type-id">Ticket Type ID</Label>
                        <Input
                          id="ticket-type-id"
                          value={manualTicketTypeId}
                          onChange={(e) => {
                            setManualTicketTypeId(e.target.value);
                            if (e.target.value.trim()) setQrJson("");
                          }}
                          placeholder="UUID"
                          disabled={!!qrJson.trim()}
                          className="border-border bg-input"
                        />
                      </div>
                    </div>

                    <Button type="submit" variant="default" className="w-full font-semibold" disabled={isVerifying}>
                      {isVerifying ? (
                        <>
                          <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> Verifying…
                        </>
                      ) : (
                        "Verify & Check In"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border-border bg-card h-full shadow-sm transition-colors duration-300">
                <CardHeader>
                  <CardTitle className="text-foreground text-base transition-colors duration-300">Verification Console</CardTitle>
                  <CardDescription className="text-muted">Gate check-in responses display here.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[220px]">
                  {verificationResult ? (
                    <div className="text-center space-y-4 w-full">
                      {verificationResult.success ? (
                        <div className="flex flex-col items-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                          <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mb-2" />
                          <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">Verified Authentic</h4>
                          <p className="text-muted text-sm mt-2 leading-relaxed">
                            {verificationResult.message}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                          <h4 className="font-bold text-red-550 dark:text-red-450 text-lg">Validation Failed</h4>
                          <p className="text-muted text-sm mt-2 leading-relaxed">
                            {verificationResult.message}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-12">
                      <ShieldCheck className="w-12 h-12 text-muted mx-auto mb-2" />
                      <p className="text-sm">Scan a barcode/QR code to verify authenticity and process check-in.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* VIP Guests Management (STAFF and ORGANIZER) */}
        {activeTab === "vip" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border bg-card shadow-sm transition-colors duration-300">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                  <div>
                    <CardTitle className="text-foreground text-lg transition-colors duration-300">VIP Guests List</CardTitle>
                    <CardDescription className="text-muted">Guests invited to the VIP lounge.</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <Input
                      placeholder="Search VIP..."
                      value={vipSearchQuery}
                      onChange={(e) => setVipSearchQuery(e.target.value)}
                      className="pl-9 bg-input border-border text-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-surface border-b border-border transition-colors duration-300">
                        <tr>
                          <th className="px-6 py-3 font-medium text-muted">Name</th>
                          <th className="px-6 py-3 font-medium text-muted">Email</th>
                          <th className="px-6 py-3 font-medium text-muted">Sponsor</th>
                          <th className="px-6 py-3 font-medium text-muted text-right">Status / Check-in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border transition-colors duration-300">
                        {vipGuests.filter(g =>
                          (g.fullName || "").toLowerCase().includes(vipSearchQuery.toLowerCase()) ||
                          (g.email || "").toLowerCase().includes(vipSearchQuery.toLowerCase()) ||
                          (g.sponsor || "").toLowerCase().includes(vipSearchQuery.toLowerCase())
                        ).length > 0 ? (
                          vipGuests.filter(g =>
                            (g.fullName || "").toLowerCase().includes(vipSearchQuery.toLowerCase()) ||
                            (g.email || "").toLowerCase().includes(vipSearchQuery.toLowerCase()) ||
                            (g.sponsor || "").toLowerCase().includes(vipSearchQuery.toLowerCase())
                          ).map((guest) => (
                            <tr key={guest.id} className="hover:bg-surface/50 transition-colors duration-200">
                              <td className="px-6 py-4 font-medium text-foreground transition-colors duration-300">{guest.fullName}</td>
                              <td className="px-6 py-4 text-muted">{guest.email}</td>
                              <td className="px-6 py-4 text-muted">{guest.sponsor}</td>
                              <td className="px-6 py-4 text-right">
                                {guest.checkedInAt ? (
                                  <Badge variant="published" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                    Checked In
                                  </Badge>
                                ) : user?.role === "STAFF" ? (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleVipCheckIn(guest.id)}
                                    className="font-semibold"
                                  >
                                    Check In
                                  </Button>
                                ) : (
                                  <Badge variant="secondary">
                                    Not Checked In
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-muted">
                              No VIP guests found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {vipTotal > vipLimit && (
                    <div className="p-4 border-t border-border flex justify-center gap-2 bg-surface transition-colors duration-300">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={vipPage === 1}
                        onClick={() => { setVipPage(p => p - 1); fetchVipGuests(vipPage - 1); }}
                      >
                        Prev
                      </Button>
                      <span className="flex items-center px-3 text-xs text-muted">
                        Page {vipPage} of {Math.ceil(vipTotal / vipLimit)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={vipPage >= Math.ceil(vipTotal / vipLimit)}
                        onClick={() => { setVipPage(p => p + 1); fetchVipGuests(vipPage + 1); }}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right side: Import CSV (only for ORGANIZER) */}
            <div className="lg:col-span-1">
              {user?.role === "ORGANIZER" ? (
                <Card className="border-border bg-card shadow-sm transition-colors duration-300">
                  <CardHeader>
                    <CardTitle className="text-foreground text-base transition-colors duration-300">Import VIP Roster</CardTitle>
                    <CardDescription className="text-muted">
                      Upload a CSV file containing VIP guest list (columns: full_name, email, sponsor).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCsvImport} className="space-y-6">
                      <div className="p-6 rounded-xl border border-dashed border-border bg-surface flex flex-col items-center justify-center text-center transition-colors duration-300">
                        <Upload className="w-8 h-8 text-muted mb-2" />
                        <Label htmlFor="csv-upload" className="cursor-pointer text-sm font-semibold text-primary hover:underline mb-1">
                          {csvFile ? csvFile.name : "Select CSV File"}
                        </Label>
                        <p className="text-xs text-muted">Must be a valid .csv file</p>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setCsvFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                      {csvFile && (
                        <Button type="submit" variant="default" className="w-full font-semibold" disabled={isImporting}>
                          {isImporting ? (
                            <>
                              <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> Importing…
                            </>
                          ) : (
                            "Upload & Import VIPs"
                          )}
                        </Button>
                      )}
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border bg-card p-6 text-center text-muted shadow-sm transition-colors duration-300">
                  <ShieldCheck className="w-10 h-10 mx-auto text-muted mb-2" />
                  <h4 className="font-semibold text-foreground mb-1 transition-colors duration-300">Staff Access</h4>
                  <p className="text-xs">Only organizers can import or manage the VIP guest roster.</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
