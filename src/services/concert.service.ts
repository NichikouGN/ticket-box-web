import { api } from "./api";

// ─── Types ───────────────────────────────────────────────────────────

export type ConcertStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface ConcertListItem {
  id: string;
  title: string;
  artists: string[];
  venue: string;
  eventDate: string;
  status: ConcertStatus;
  thumbnailUrl: string | null;
}

export interface ConcertDetailArtist {
  id: string;
  name: string;
  verifiedBio?: string | null;
}

export interface ConcertDetail {
  id: string;
  title: string;
  description: string | null;
  artists: ConcertDetailArtist[];
  venue: string;
  eventDate: string;
  thumbnailUrl: string | null;
  seatMapSvgUrl: string | null;
}

export interface TicketTypeView {
  id: string;
  name: string;
  price: number;
  maxPerUser: number;
}

export interface StockTicketType {
  id: string;
  stock: number;
}

export interface Pagination {
  currentPage: number;
  totalPage: number;
  totalItems: number;
}

export interface TicketTypeInput {
  name: string;
  price: number;
  maxPerUser: number;
  totalCapacity: number;
  saleStart?: string | null;
  saleEnd?: string | null;
}

export interface CreateConcertInput {
  title: string;
  description?: string | null;
  artists: string[];
  venue: string;
  eventDate: string;
  thumbnailUrl?: string | null;
  seatMapSvgUrl?: string | null;
  ticketTypes: TicketTypeInput[];
}

export type UpdateConcertInput = Partial<CreateConcertInput>;

// ─── Response Types ──────────────────────────────────────────────────

interface ListConcertsResponse {
  success: boolean;
  data: ConcertListItem[];
}

interface ConcertDetailResponse {
  success: boolean;
  data: ConcertDetail;
}

interface ConcertTicketsResponse {
  success: boolean;
  data: {
    seatMapSvgUrl: string | null;
    ticketTypes: TicketTypeView[];
  };
}

interface ConcertStockResponse {
  success: boolean;
  data: {
    ticketTypes: StockTicketType[];
  };
}

interface CreateConcertResponse {
  success: boolean;
  message: string;
  data: { concertId: string };
}

interface MutationResponse {
  success: boolean;
  message: string;
}

export interface Artist {
  id: string;
  name: string;
}

export interface CreateArtistsResponse {
  success: boolean;
  message: string;
  data: {
    existingArtists: Artist[];
    newArtists: Artist[];
  };
}

export interface ArtistBioReviewItem {
  artistId: string;
  artistName: string;
  aiBio: string;
}

export interface AwaitingReviewBiosResponse {
  success: boolean;
  message: string;
  data: ArtistBioReviewItem[];
}

export interface VipGuest {
  id: string;
  fullName: string;
  email: string;
  sponsor: string;
  concertId: string;
  checkedInAt: string | null;
}

export interface ListVipGuestsResponse {
  success: boolean;
  data: VipGuest[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

function getApiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000/api/v1";
}

// ─── Service ─────────────────────────────────────────────────────────

export const concertService = {
  // ── Public (Audience) ───────────────────────────────────────────

  listConcerts: async (page = 1, limit = 12) => {
    const res = await api.get<any>(`/concerts/?page=${page}&limit=${limit}`, {
      skipAuth: true,
    });
    return {
      ...res,
      data: (res.data || []).map((item: any) => ({
        ...item,
        thumbnailUrl: item.coverImage,
      })),
    } as ListConcertsResponse;
  },

  getConcertDetail: async (id: string) => {
    const res = await api.get<any>(`/concerts/${id}`, { skipAuth: true });
    return {
      ...res,
      data: res.data
        ? {
            ...res.data,
            thumbnailUrl: res.data.coverImage,
            seatMapSvgUrl: res.data.seatMapSvg,
          }
        : null,
    } as ConcertDetailResponse;
  },

  getConcertTickets: async (id: string) => {
    const res = await api.get<any>(`/concerts/${id}/ticket-types`, {
      skipAuth: true,
    });
    return {
      success: res.success,
      data: {
        seatMapSvgUrl: null,
        ticketTypes: res.data || [],
      },
    } as ConcertTicketsResponse;
  },

  getConcertStock: async (id: string) => {
    const res = await api.get<any>(`/concerts/${id}/stocks`, { skipAuth: true });
    return {
      success: res.success,
      data: {
        ticketTypes: res.data || [],
      },
    } as ConcertStockResponse;
  },

  // ── Organizer ───────────────────────────────────────────────────

  listOrganizerConcerts: async (page = 1, limit = 20) => {
    const res = await api.get<any>(`/concerts/?page=${page}&limit=${limit}`);
    return {
      ...res,
      data: (res.data || []).map((item: any) => ({
        ...item,
        thumbnailUrl: item.coverImage,
      })),
    } as ListConcertsResponse;
  },

  getOrganizerConcertDetail: async (id: string) => {
    const res = await api.get<any>(`/concerts/${id}`);
    return {
      ...res,
      data: res.data
        ? {
            ...res.data,
            thumbnailUrl: res.data.coverImage,
            seatMapSvgUrl: res.data.seatMapSvg,
          }
        : null,
    } as ConcertDetailResponse;
  },

  getOrganizerConcertTickets: async (id: string) => {
    const res = await api.get<any>(`/concerts/${id}/ticket-types`);
    return {
      success: res.success,
      data: {
        seatMapSvgUrl: null,
        ticketTypes: res.data || [],
      },
    } as ConcertTicketsResponse;
  },

  createConcert: (data: CreateConcertInput) => {
    const { artists, thumbnailUrl, seatMapSvgUrl, ...rest } = data;
    const body = {
      ...rest,
      coverImage: thumbnailUrl || null,
      seatMapSvg: seatMapSvgUrl || null,
      ticketTypes: (data.ticketTypes || []).map((t) => ({
        ...t,
        saleStart: t.saleStart || new Date().toISOString(),
        saleEnd: t.saleEnd || new Date(data.eventDate).toISOString(),
      })),
    };
    return api.post<CreateConcertResponse>("/organizer/concerts", body);
  },

  updateConcert: (id: string, data: UpdateConcertInput) => {
    const { artists, thumbnailUrl, seatMapSvgUrl, ...rest } = data;
    const body = {
      ...rest,
      coverImage: thumbnailUrl !== undefined ? (thumbnailUrl || null) : undefined,
      seatMapSvg: seatMapSvgUrl !== undefined ? (seatMapSvgUrl || null) : undefined,
      ticketTypes: data.ticketTypes
        ? data.ticketTypes.map((t) => ({
            ...t,
            saleStart: t.saleStart || new Date().toISOString(),
            saleEnd: t.saleEnd || (data.eventDate ? new Date(data.eventDate).toISOString() : new Date().toISOString()),
          }))
        : undefined,
    };
    return api.patch<MutationResponse>(`/organizer/concerts/${id}`, body);
  },

  cancelConcert: (id: string) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}/update-status`, {
      status: "CANCELLED",
    }),

  publishConcert: (id: string) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}/update-status`, {
      status: "PUBLISHED",
    }),

  restoreConcert: (id: string) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}/update-status`, {
      status: "DRAFT",
    }),

  // ── Organizer Artist & Bio Management ────────────────────────────

  createArtists: (names: string[]) =>
    api.post<CreateArtistsResponse>("/organizer/artists", { name: names }),

  linkArtistsToConcert: (concertId: string, artistIds: string[]) =>
    api.post<MutationResponse>(`/organizer/concerts/${concertId}/link-artist`, { artistIds }),

  getAwaitingReviewBios: (concertId: string) =>
    api.get<AwaitingReviewBiosResponse>(`/organizer/concerts/${concertId}/bio-review`),

  updateBioStatus: (concertId: string, artistId: string, status: "APPROVED" | "REJECTED") =>
    api.patch<MutationResponse>(`/organizer/concerts/${concertId}/bio-review/${artistId}`, { status }),

  generateArtistBios: async (concertId: string, artistIds: string[], pdfFile: File) => {
    const formData = new FormData();
    formData.append("pdf", pdfFile);
    formData.append("artistIds", JSON.stringify(artistIds));
    const accessToken = localStorage.getItem("accessToken");
    const response = await fetch(`${getApiBase()}/organizer/concerts/${concertId}/generate-bio`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to generate biographies");
    }
    return data as MutationResponse;
  },

  // ── Organizer VIP Guest Management ──────────────────────────────

  getVipGuests: (concertId: string, page = 1, limit = 20) =>
    api.get<ListVipGuestsResponse>(`/organizer/concerts/${concertId}/vip-guests?page=${page}&limit=${limit}`),

  importVipGuests: async (concertId: string, csvFile: File) => {
    const formData = new FormData();
    formData.append("csv", csvFile);
    const accessToken = localStorage.getItem("accessToken");
    const response = await fetch(`${getApiBase()}/organizer/concerts/${concertId}/vip-guests/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to import VIP guests");
    }
    return data as MutationResponse;
  },

  // ── Staff VIP Check-in ──────────────────────────────────────────

  getStaffVipGuests: (concertId: string, page = 1, limit = 20) =>
    api.get<ListVipGuestsResponse>(`/staff/concerts/${concertId}/vip-guests?page=${page}&limit=${limit}`),

  checkInVipGuest: (concertId: string, vipGuestId: string) =>
    api.patch<MutationResponse>(`/staff/concerts/${concertId}/vip-guests/${vipGuestId}/check-in`, {}),
};
