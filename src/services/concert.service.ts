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

export interface ConcertDetail {
  id: string;
  title: string;
  description: string | null;
  artists: string[];
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
  data: { concert_id: string };
}

interface MutationResponse {
  success: boolean;
  message: string;
}

// ─── Service ─────────────────────────────────────────────────────────

export const concertService = {
  // ── Public (Audience) ───────────────────────────────────────────

  listConcerts: (page = 1, limit = 12) =>
    api.get<ListConcertsResponse>(`/concerts/?page=${page}&limit=${limit}`, {
      skipAuth: true,
    }),

  getConcertDetail: (id: string) =>
    api.get<ConcertDetailResponse>(`/concerts/${id}`, { skipAuth: true }),

  getConcertTickets: (id: string) =>
    api.get<ConcertTicketsResponse>(`/concerts/${id}/tickets`, {
      skipAuth: true,
    }),

  getConcertStock: (id: string) =>
    api.get<ConcertStockResponse>(`/concerts/${id}/stock`, { skipAuth: true }),

  // ── Organizer ───────────────────────────────────────────────────

  listOrganizerConcerts: (page = 1, limit = 20) =>
    api.get<ListConcertsResponse>(`/concerts/?page=${page}&limit=${limit}`),

  getOrganizerConcertDetail: (id: string) =>
    api.get<ConcertDetailResponse>(`/concerts/${id}`),

  getOrganizerConcertTickets: (id: string) =>
    api.get<ConcertTicketsResponse>(`/concerts/${id}/tickets`),

  createConcert: (data: CreateConcertInput) =>
    api.post<CreateConcertResponse>("/organizer/concerts/", data),

  updateConcert: (id: string, data: UpdateConcertInput) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}`, data),

  cancelConcert: (id: string, reason?: string) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}/cancel`, {
      reason: reason || null,
    }),

  publishConcert: (id: string) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}/publish`),

  restoreConcert: (id: string) =>
    api.patch<MutationResponse>(`/organizer/concerts/${id}/restore`),
};
