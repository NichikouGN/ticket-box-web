import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw, BarChart2, ShieldCheck, Ticket } from "lucide-react";
import { ticketService, type CheckinStats } from "@/services/ticket.service";
import { concertService, type ConcertDetail } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const [concert, setConcert] = useState<ConcertDetail | null>(null);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verification Form State
  const [qrJson, setQrJson] = useState("");
  const [manualTicketId, setManualTicketId] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [manualTicketTypeId, setManualTicketTypeId] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchDetailsAndStats = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [detailRes, statsRes] = await Promise.all([
        concertService.getOrganizerConcertDetail(id),
        ticketService.getCheckinStats(id).catch(() => ({ success: false, data: null })), // handle 404/no tickets gracefully
      ]);

      if (detailRes.success) {
        setConcert(detailRes.data);
      }
      
      if (statsRes && statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        setStats({ totalTickets: 0, checkedInTickets: 0, remainingTickets: 0 });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load check-in statistics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailsAndStats();
  }, [id]);

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
          <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
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
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Event Gate Check-in</h1>
            <p className="text-slate-400 mt-1">{concert?.title || "Concert Event"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDetailsAndStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Stats
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Tickets Sold</p>
                  <h3 className="text-3xl font-bold text-white mt-2">{stats?.totalTickets || 0}</h3>
                </div>
                <div className="p-2.5 bg-slate-800 rounded-lg text-slate-400">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Checked In</p>
                  <h3 className="text-3xl font-bold text-emerald-400 mt-2">{stats?.checkedInTickets || 0}</h3>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Remaining</p>
                  <h3 className="text-3xl font-bold text-violet-400 mt-2">{stats?.remainingTickets || 0}</h3>
                </div>
                <div className="p-2.5 bg-violet-500/10 rounded-lg text-violet-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Attendance Rate</p>
                  <h3 className="text-3xl font-bold text-fuchsia-400 mt-2">{attendancePercent}%</h3>
                </div>
                <div className="p-2.5 bg-fuchsia-500/10 rounded-lg text-fuchsia-400">
                  <BarChart2 className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Check-in Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-violet-400" />
                  Verify Ticket
                </CardTitle>
                <CardDescription>
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
                        // clear manual if user types QR
                        if (e.target.value.trim()) {
                          setManualTicketId("");
                          setManualUserId("");
                          setManualTicketTypeId("");
                        }
                      }}
                      placeholder='{"ticketId":"...","userId":"...","concertId":"...","ticketTypeId":"...","signature":"..."}'
                      className="font-mono text-sm h-32"
                    />
                  </div>

                  {/* Manual Section Separator */}
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-xs font-semibold uppercase">Or Enter Manually</span>
                    <div className="flex-grow border-t border-slate-800"></div>
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
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="gradient" className="w-full" disabled={isVerifying}>
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Verifying…
                      </>
                    ) : (
                      "Verify & Check In"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Verification Results Panel */}
          <div>
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl h-full">
              <CardHeader>
                <CardTitle className="text-white text-base">Verification Console</CardTitle>
                <CardDescription>Gate check-in responses display here.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[220px]">
                {verificationResult ? (
                  <div className="text-center space-y-4 w-full">
                    {verificationResult.success ? (
                      <div className="flex flex-col items-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mb-2" />
                        <h4 className="font-bold text-emerald-400 text-lg">Verified Authentic</h4>
                        <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                          {verificationResult.message}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
                        <h4 className="font-bold text-red-400 text-lg">Validation Failed</h4>
                        <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                          {verificationResult.message}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-12">
                    <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                    <p className="text-sm">Scan a barcode/QR code to verify authenticity and process check-in.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
