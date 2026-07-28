import { apiRequest } from '@/shared/lib/api';

export type SupportCategoryRow = {
  code: string;
  labelEs: string;
  descriptionEs: string | null;
  parentCode: string | null;
  sortOrder: number;
  flowHintJson: unknown;
};

export type SupportTicketMessageRow = {
  id: string;
  ticketId: string;
  authorType: 'SYSTEM' | 'USER' | 'AGENT';
  authorUserId: string | null;
  body: string;
  metadata: unknown;
  createdAt: string;
};

export type SupportTicketEvidenceRow = {
  id: string;
  ticketId: string;
  uploadedByUserId: string;
  fileUrl: string;
  mimeType: string | null;
  label: string | null;
  createdAt: string;
};

export type SupportTicketRow = {
  id: string;
  appointmentId: string;
  createdByUserId: string;
  providerProfileId: string;
  categoryCode: string;
  status: string;
  resolutionKind: string;
  isPriority: boolean;
  formalComplaint: boolean;
  formalTrackingNumber: string | null;
  metadata: Record<string, unknown>;
  proposedResolution: unknown;
  autoConfidence: number | null;
  abuseScoreSnapshot: number | null;
  escalationReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    consumerProfile?: { fullName: string | null };
    providerProfile?: { fullName: string | null };
  };
  messages?: SupportTicketMessageRow[];
  evidence?: SupportTicketEvidenceRow[];
};

export function listSupportCategories(getToken: () => Promise<string | null>) {
  return apiRequest<SupportCategoryRow[]>('/tickets/categories', { getToken });
}

export function listMySupportTickets(getToken: () => Promise<string | null>) {
  return apiRequest<SupportTicketRow[]>('/tickets', { getToken });
}

export function getSupportTicket(
  getToken: () => Promise<string | null>,
  ticketId: string,
) {
  return apiRequest<SupportTicketRow>(`/tickets/${ticketId}`, { getToken });
}

export function createSupportTicket(
  getToken: () => Promise<string | null>,
  body: {
    appointmentId: string;
    categoryCode: string;
    metadata?: Record<string, unknown>;
    formalComplaint?: boolean;
    initialMessage?: string;
  },
) {
  return apiRequest<SupportTicketRow>('/tickets', {
    method: 'POST',
    getToken,
    body,
  });
}

export function postSupportTicketMessage(
  getToken: () => Promise<string | null>,
  ticketId: string,
  body: string,
) {
  return apiRequest<SupportTicketMessageRow>(`/tickets/${ticketId}/messages`, {
    method: 'POST',
    getToken,
    body: { body },
  });
}

export function resolveSupportTicket(
  getToken: () => Promise<string | null>,
  ticketId: string,
  acceptProposed: boolean,
) {
  return apiRequest<SupportTicketRow>(`/tickets/${ticketId}/resolve`, {
    method: 'POST',
    getToken,
    body: { acceptProposed },
  });
}

export function escalateSupportTicket(
  getToken: () => Promise<string | null>,
  ticketId: string,
  reason?: string,
) {
  return apiRequest<SupportTicketRow>(`/tickets/${ticketId}/escalate`, {
    method: 'POST',
    getToken,
    body: reason ? { reason } : {},
  });
}
