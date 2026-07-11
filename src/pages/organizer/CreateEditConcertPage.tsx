import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Loader2, Save, Upload, FileText, Check, X, RefreshCw } from "lucide-react";
import { concertService, type CreateConcertInput, type TicketTypeInput, type Artist, type ArtistBioReviewItem } from "@/services/concert.service";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

export default function CreateEditConcertPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [seatMapSvgUrl, setSeatMapSvgUrl] = useState("");
  const [artists, setArtists] = useState<string[]>([""]);

  const defaultTicket: TicketTypeInput = { name: "", price: 0, maxPerUser: 4, totalCapacity: 100 };
  const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>([{ ...defaultTicket }]);

  // AI Bio & Press Kit State
  const [resolvedArtists, setResolvedArtists] = useState<Artist[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [awaitingBios, setAwaitingBios] = useState<ArtistBioReviewItem[]>([]);
  const [isLoadingBios, setIsLoadingBios] = useState(false);

  const fetchAwaitingBios = async () => {
    if (!id) return;
    try {
      setIsLoadingBios(true);
      const res = await concertService.getAwaitingReviewBios(id);
      if (res.success) {
        setAwaitingBios(res.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load awaiting bios:", err);
    } finally {
      setIsLoadingBios(false);
    }
  };

  useEffect(() => {
    if (isEditMode && id) {
      const fetchConcert = async () => {
        try {
          const [detailRes, ticketRes] = await Promise.all([
            concertService.getOrganizerConcertDetail(id),
            concertService.getOrganizerConcertTickets(id)
          ]);

          if (detailRes.success) {
            const data = detailRes.data;
            setTitle(data.title);
            setDescription(data.description || "");
            setVenue(data.venue);
            // format date for datetime-local input
            const d = new Date(data.eventDate);
            setEventDate(d.toISOString().slice(0, 16));
            setThumbnailUrl(data.thumbnailUrl || "");
            setSeatMapSvgUrl(data.seatMapSvgUrl || "");
            const artistNames = (data.artists || []).map((a: any) => typeof a === "string" ? a : a.name);
            setArtists(artistNames.length ? artistNames : [""]);

            // Resolve artist IDs from names
            if (artistNames.length) {
              const validNames = artistNames.filter((name: string) => name.trim() !== "");
              if (validNames.length > 0) {
                concertService.createArtists(validNames)
                  .then(res => {
                    if (res.success) {
                      setResolvedArtists([
                        ...(res.data.existingArtists || []),
                        ...(res.data.newArtists || []),
                      ]);
                    }
                  })
                  .catch(err => console.error("Error resolving artists on load:", err));
              }
            }
          }

          if (ticketRes.success) {
            const tts = ticketRes.data.ticketTypes.map(t => ({
              name: t.name,
              price: t.price,
              maxPerUser: t.maxPerUser,
              totalCapacity: 100 // placeholder
            }));
            if (tts.length) setTicketTypes(tts);
          }

          // Fetch awaiting bios
          await fetchAwaitingBios();
        } catch (error: any) {
          toast.error("Failed to load concert details");
          navigate("/organizer");
        } finally {
          setIsLoading(false);
        }
      };
      fetchConcert();
    }
  }, [id, isEditMode, navigate]);

  const handleAddArtist = () => setArtists([...artists, ""]);
  const handleRemoveArtist = (index: number) => setArtists(artists.filter((_, i) => i !== index));
  const handleArtistChange = (index: number, value: string) => {
    const newArtists = [...artists];
    newArtists[index] = value;
    setArtists(newArtists);
  };

  const handleAddTicket = () => setTicketTypes([...ticketTypes, { ...defaultTicket }]);
  const handleRemoveTicket = (index: number) => setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  const handleTicketChange = (index: number, field: keyof TicketTypeInput, value: any) => {
    const newTickets = [...ticketTypes];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setTicketTypes(newTickets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter empty arrays
    const validArtists = artists.filter(a => a.trim() !== "");
    if (validArtists.length === 0) return toast.error("At least one artist is required");

    const validTickets = ticketTypes.filter(t => t.name.trim() !== "");
    if (validTickets.length === 0) return toast.error("At least one ticket type is required");

    const payload: CreateConcertInput = {
      title,
      description: description || null,
      artists: validArtists,
      venue,
      eventDate: new Date(eventDate).toISOString(),
      thumbnailUrl: thumbnailUrl || null,
      seatMapSvgUrl: seatMapSvgUrl || null,
      ticketTypes: validTickets,
    };

    setIsSubmitting(true);
    try {
      let concertId = id;
      if (isEditMode && id) {
        await concertService.updateConcert(id, payload);
      } else {
        const res = await concertService.createConcert(payload);
        concertId = res.data.concertId;
      }

      // Create/resolve artists and link them to the concert
      if (concertId) {
        const artistRes = await concertService.createArtists(validArtists);
        if (artistRes.success) {
          const allArtists = [
            ...(artistRes.data.existingArtists || []),
            ...(artistRes.data.newArtists || []),
          ];
          const artistIds = allArtists.map((a) => a.id);
          await concertService.linkArtistsToConcert(concertId, artistIds);
        }
      }

      toast.success(isEditMode ? "Concert updated successfully" : "Concert created successfully");
      navigate("/organizer");
    } catch (err: any) {
      toast.error(err.message || "Failed to save concert");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBioAction = async (artistId: string, status: "APPROVED" | "REJECTED") => {
    if (!id) return;
    try {
      const res = await concertService.updateBioStatus(id, artistId, status);
      if (res.success) {
        toast.success(res.message);
        fetchAwaitingBios();
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${status.toLowerCase()} bio`);
    }
  };

  const handleGenerateBios = async () => {
    if (!id) return;
    if (!pdfFile) {
      toast.error("Please select a PDF press kit file first");
      return;
    }
    if (resolvedArtists.length === 0) {
      toast.error("No artists resolved. Please make sure your lineup is saved.");
      return;
    }

    setIsGeneratingBio(true);
    try {
      const artistIds = resolvedArtists.map(a => a.id);
      await concertService.generateArtistBios(id, artistIds, pdfFile);
      toast.success("AI Bio generation requested! Bios will appear below for review once complete.");
      setPdfFile(null);

      // Poll for awaiting bios every 3 seconds for up to 45 seconds (15 attempts)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await concertService.getAwaitingReviewBios(id);
          if (res.success && res.data && res.data.length > 0) {
            setAwaitingBios(res.data);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling awaiting bios:", err);
        }
        if (attempts >= 15) {
          clearInterval(interval);
        }
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate biographies");
    } finally {
      setIsGeneratingBio(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <Link to="/organizer" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">
          {isEditMode ? "Edit Event" : "Create New Event"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Main details about the event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title <span className="text-red-400">*</span></Label>
                <Input id="title" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Eras Tour" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people about the event..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue <span className="text-red-400">*</span></Label>
                  <Input id="venue" required value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Madison Square Garden" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date & Time <span className="text-red-400">*</span></Label>
                  <Input id="date" required type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Media (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thumb">Poster/Thumbnail Image URL</Label>
                <Input id="thumb" type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seatmap">Seat Map SVG URL</Label>
                <Input id="seatmap" type="url" value={seatMapSvgUrl} onChange={e => setSeatMapSvgUrl(e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          {/* Artists */}
          <Card>
            <CardHeader>
              <CardTitle>Lineup / Artists <span className="text-red-400">*</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {artists.map((artist, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Input
                    value={artist}
                    onChange={e => handleArtistChange(idx, e.target.value)}
                    placeholder="Artist name"
                    required={idx === 0}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveArtist(idx)} disabled={artists.length === 1} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddArtist} className="mt-2">
                <Plus className="w-4 h-4 mr-2" /> Add Artist
              </Button>
            </CardContent>
          </Card>

          {/* AI Press Kit & Biography (Only visible in Edit Mode) */}
          {isEditMode && (
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-400" />
                  AI Roster Biographies
                </CardTitle>
                <CardDescription>
                  Upload an artist press kit (PDF) to generate biographies using Gemini AI. Make sure your artist names are saved first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* PDF Upload */}
                <div className="p-6 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 flex flex-col items-center justify-center text-center">
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  <Label htmlFor="pdf-upload" className="cursor-pointer text-sm font-semibold text-violet-400 hover:text-violet-300 mb-1">
                    {pdfFile ? pdfFile.name : "Select PDF Press Kit"}
                  </Label>
                  <p className="text-xs text-slate-550">Max size 10MB. Must be a PDF file.</p>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setPdfFile(e.target.files[0]);
                      }
                    }}
                  />

                  {pdfFile && (
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      className="mt-4"
                      onClick={handleGenerateBios}
                      disabled={isGeneratingBio}
                    >
                      {isGeneratingBio ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Bios...
                        </>
                      ) : (
                        "Upload & Generate Bios"
                      )}
                    </Button>
                  )}
                </div>

                {/* Review Panel */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-300">Awaiting Review ({awaitingBios.length})</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-slate-400 hover:text-white"
                      onClick={fetchAwaitingBios}
                      disabled={isLoadingBios}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingBios ? "animate-spin" : ""}`} />
                      Refresh List
                    </Button>
                  </div>

                  {awaitingBios.length > 0 ? (
                    <div className="space-y-4">
                      {awaitingBios.map((bio) => (
                        <div key={bio.artistId} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-white text-base">{bio.artistName}</span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() => handleBioAction(bio.artistId, "APPROVED")}
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleBioAction(bio.artistId, "REJECTED")}
                              >
                                <X className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{bio.aiBio}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center border border-slate-800 rounded-xl bg-slate-900/20">
                      No bios awaiting review. Roster biographies will show up here for validation once generated.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Types <span className="text-red-400">*</span></CardTitle>
              <CardDescription>Define the sections and pricing for the event. Note: Editing replaces all ticket types.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ticketTypes.map((ticket, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 space-y-4 relative">
                  <div className="absolute top-4 right-4">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveTicket(idx)} disabled={ticketTypes.length === 1} className="text-red-400 hover:text-red-300 h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-10">
                    <div className="space-y-2">
                      <Label>Ticket Name</Label>
                      <Input required value={ticket.name} onChange={e => handleTicketChange(idx, 'name', e.target.value)} placeholder="e.g. VIP Standing" />
                    </div>
                    <div className="space-y-2">
                      <Label>Price ($)</Label>
                      <Input required type="number" min="0" value={ticket.price} onChange={e => handleTicketChange(idx, 'price', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Capacity</Label>
                      <Input required type="number" min="1" value={ticket.totalCapacity} onChange={e => handleTicketChange(idx, 'totalCapacity', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max per user</Label>
                      <Input required type="number" min="1" value={ticket.maxPerUser} onChange={e => handleTicketChange(idx, 'maxPerUser', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddTicket}>
                <Plus className="w-4 h-4 mr-2" /> Add Ticket Type
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => navigate("/organizer")}>Cancel</Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isEditMode ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
