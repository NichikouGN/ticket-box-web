import { api } from "./api";

export interface TicketListItem {
  ticketId: string;
  concertId: string;
  ticketTypeId: string;
  status: "UNUSED" | "USED";
  createdAt: string;
  usedAt: string | null;
  ticketName?: string | null;
  concertDetails?: {
    id: string;
    title: string;
    venue: string;
    eventDate: string;
  } | null;
}

export interface TicketDetail {
  ticketId: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
  status: "UNUSED" | "USED";
  createdAt: string;
  usedAt: string | null;
}

export interface TicketDetailResponse {
  success: boolean;
  data: {
    ticket: TicketDetail;
    signature: string;
  };
}

export interface TicketsResponse {
  success: boolean;
  data: TicketListItem[];
}

export interface CheckinStats {
  totalTickets: number;
  checkedInTickets: number;
  remainingTickets: number;
}

export interface CheckinStatsResponse {
  success: boolean;
  data: CheckinStats;
}

export interface VerifyTicketInput {
  ticketId: string;
  userId: string;
  concertId: string;
  ticketTypeId: string;
}

export interface VerifyTicketResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const ticketService = {
  getMyTickets: () => api.get<TicketsResponse>("/tickets"),

  getTicketDetail: (ticketId: string) => api.get<TicketDetailResponse>(`/tickets/${ticketId}`),

  getTicketsByConcert: (concertId: string) => api.get<TicketsResponse>(`/tickets/concerts/${concertId}`),

  verifyTicket: (data: VerifyTicketInput) => api.post<VerifyTicketResponse>("/checkin/verify", data),

  getCheckinStats: (concertId: string) => api.get<CheckinStatsResponse>(`/checkin/stats/${concertId}`),
};
