import { apiRequest } from '@/shared/lib/api';
import type { ProviderKind } from '@/shared/types/bootstrap';

export type AppointmentAttendance = 'IN_PERSON' | 'ONLINE';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CANCELLED_BY_FAMILY'
  | 'CANCELLED_BY_PROVIDER'
  | 'COMPLETED';

export type AppointmentReviewAuthor = 'CONSUMER' | 'PROVIDER';

export type PaymentStatus =
  | 'REQUIRES_PAYMENT_METHOD'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type AppointmentReviewRow = {
  authorRole: AppointmentReviewAuthor;
  stars: number;
  comment: string | null;
};

export type AppointmentPaymentRow = {
  id: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  failureReason: string | null;
  processedAt: string | null;
  updatedAt: string;
};

export type InPersonVenueHost = 'CONSUMER' | 'PROVIDER';

export type DwellingType = 'HOUSE' | 'APARTMENT';

export type ProfileAddressSlice = {
  streetAddress: string | null;
  postalCode: string | null;
  city: string | null;
  unitOrBuilding: string | null;
  dwellingType: DwellingType | null;
};

export type AppointmentRow = {
  id: string;
  providerProfileId: string;
  consumerProfileId: string;
  childId: string | null;
  /** Cita ligada a una oferta publicada del educador (opcional). */
  providerOfferId?: string | null;
  /** Copia del título al reservar. */
  offerTitleSnapshot?: string | null;
  providerOffer?: { id: string; title: string; type: string } | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  /** Presente tras migración; si falta, se trata como false. */
  requestsAlternativeSchedule?: boolean;
  noteFromFamily: string | null;
  meetingUrl: string | null;
  attendanceMode?: AppointmentAttendance | null;
  inPersonVenueHost: InPersonVenueHost;
  reviews?: AppointmentReviewRow[];
  payment?: AppointmentPaymentRow | null;
  consumerReviewPromptDismissals?: number;
  providerReviewPromptDismissals?: number;
  createdAt: string;
  updatedAt: string;
  providerProfile: {
    id: string;
    fullName: string | null;
    city: string | null;
    photoUrl: string | null;
    serviceMode: import('@/shared/types/bootstrap').ServiceMode | null;
    kinds?: ProviderKind[];
  } & ProfileAddressSlice;
  consumerProfile: {
    id: string;
    fullName: string | null;
    phone: string | null;
    city: string | null;
  } & ProfileAddressSlice;
  child: { id: string; firstName: string } | null;
};

export function listMyAppointments(getToken: () => Promise<string | null>) {
  return apiRequest<AppointmentRow[]>('/appointments/me', { getToken });
}

export function listProviderAppointments(getToken: () => Promise<string | null>) {
  return apiRequest<AppointmentRow[]>('/appointments/provider/me', {
    getToken,
  });
}

export function createAppointment(
  getToken: () => Promise<string | null>,
  body: {
    providerProfileId: string;
    startsAt: string;
    endsAt: string;
    childId: string;
    noteFromFamily?: string;
    requestsAlternativeSchedule?: boolean;
    meetingUrl?: string;
    attendanceMode?: AppointmentAttendance;
    /** Opcional: oferta publicada del educador para vincular la cita. */
    providerOfferId?: string;
  },
) {
  return apiRequest<AppointmentRow>('/appointments', {
    method: 'POST',
    body,
    getToken,
  });
}

export function patchAppointment(
  getToken: () => Promise<string | null>,
  appointmentId: string,
  body: {
    status?: AppointmentStatus;
    meetingUrl?: string;
    inPersonVenueHost?: InPersonVenueHost;
    attendanceMode?: AppointmentAttendance;
  },
) {
  return apiRequest<AppointmentRow>(`/appointments/${appointmentId}`, {
    method: 'PATCH',
    body,
    getToken,
  });
}

export function submitAppointmentReview(
  getToken: () => Promise<string | null>,
  appointmentId: string,
  body: { stars: number; comment?: string },
) {
  return apiRequest<AppointmentRow>(`/appointments/${appointmentId}/review`, {
    method: 'POST',
    body,
    getToken,
  });
}

export function dismissAppointmentReviewPrompt(
  getToken: () => Promise<string | null>,
  appointmentId: string,
) {
  return apiRequest<AppointmentRow>(
    `/appointments/${appointmentId}/review-prompt-dismiss`,
    {
      method: 'POST',
      getToken,
    },
  );
}
