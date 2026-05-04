import { PLATFORM_DEFAULT_CURRENCY } from '@repo/currency';

import type { AppointmentRow } from '@/features/appointments/api/appointments-api';
import type { ProviderConnectStatus } from '@/features/payments/api/payments-api';
import type { ProviderProfileResponse } from '@/features/provider/api/provider-api';
import type { ProviderRateApiRow } from '@/features/provider-rates/api/provider-rates-api';
import type {
  EducatorDashboardSnapshot,
  EducatorProfile,
  EducatorReview,
  EducatorReviewOfFamily,
  EducatorSession,
  EducatorStudent,
  FamilyRelationship,
  ProfileCompletionItem,
  ProviderLaunchTask,
  ServiceMode,
} from '../domain/types';

export type BuildEducatorDashboardInput = {
  providerProfile: ProviderProfileResponse;
  contactEmail: string;
  appointments: AppointmentRow[];
  availabilityBlocks: { startsAt: string; endsAt: string }[];
  rates: ProviderRateApiRow[];
  /** Estado Stripe Connect; si falta, las tareas de cobro se marcan pendientes. */
  connectStatus: ProviderConnectStatus | null;
};

const TERMINAL = new Set<AppointmentRow['status']>([
  'DECLINED',
  'CANCELLED_BY_FAMILY',
  'CANCELLED_BY_PROVIDER',
]);

/** Reseñas de familias (rol CONSUMER) a partir de citas ya cargadas para el panel o la vitrina. */
export function educatorReviewsFromAppointments(
  appointments: AppointmentRow[],
): EducatorReview[] {
  const pairs: { appt: AppointmentRow; stars: number; comment: string | null }[] = [];
  for (const appt of appointments) {
    if (appt.status !== 'COMPLETED') continue;
    const rev = appt.reviews?.find((r) => r.authorRole === 'CONSUMER');
    if (!rev) continue;
    pairs.push({ appt, stars: rev.stars, comment: rev.comment });
  }
  pairs.sort(
    (a, b) =>
      new Date(b.appt.endsAt).getTime() - new Date(a.appt.endsAt).getTime(),
  );
  return pairs.slice(0, 20).map(({ appt, stars, comment }) => {
    const nameRaw = appt.consumerProfile.fullName?.trim();
    const authorName = nameRaw ? nameRaw.split(/\s+/)[0]! : 'Familia';
    const excerpt =
      comment?.trim() ||
      `Valoración de ${stars} estrella${stars === 1 ? '' : 's'}.`;
    let date: string;
    try {
      date = new Date(appt.endsAt).toLocaleDateString('es', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      date = appt.endsAt;
    }
    const childName = appt.child?.firstName?.trim();
    return {
      id: `${appt.id}-consumer`,
      authorName,
      rating: stars,
      excerpt,
      date,
      offerTitle: childName ? `Sesión (${childName})` : undefined,
    };
  });
}

/** Valoraciones del educador hacia familias (rol PROVIDER), para el panel del educador. */
export function educatorReviewsOfFamiliesFromAppointments(
  appointments: AppointmentRow[],
): EducatorReviewOfFamily[] {
  const pairs: { appt: AppointmentRow; stars: number; comment: string | null }[] = [];
  for (const appt of appointments) {
    if (appt.status !== 'COMPLETED') continue;
    const rev = appt.reviews?.find((r) => r.authorRole === 'PROVIDER');
    if (!rev) continue;
    pairs.push({ appt, stars: rev.stars, comment: rev.comment });
  }
  pairs.sort(
    (a, b) =>
      new Date(b.appt.endsAt).getTime() - new Date(a.appt.endsAt).getTime(),
  );
  return pairs.slice(0, 20).map(({ appt, stars, comment }) => {
    const full = appt.consumerProfile.fullName?.trim();
    const familyDisplayName = full || 'Familia';
    const excerpt =
      comment?.trim() ||
      `Valoración de ${stars} estrella${stars === 1 ? '' : 's'}.`;
    let date: string;
    try {
      date = new Date(appt.endsAt).toLocaleDateString('es', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      date = appt.endsAt;
    }
    const childName = appt.child?.firstName?.trim();
    return {
      id: `${appt.id}-provider`,
      familyDisplayName,
      rating: stars,
      excerpt,
      date,
      sessionHint: childName ? `Sesión (${childName})` : undefined,
    };
  });
}

function defaultServiceMode(m: ServiceMode | null): ServiceMode {
  return m ?? 'HYBRID';
}

/** Perfil de vitrina / panel a partir de datos reales del API. */
export function educatorProfileFromProvider(
  p: ProviderProfileResponse,
  contactEmail: string,
  rates: ProviderRateApiRow[],
): EducatorProfile {
  const bio = p.bio?.trim() ?? '';
  const name = p.fullName?.trim() || 'Educador';
  const priceFrom =
    rates.length > 0
      ? Math.min(...rates.map((r) => r.amountMinor))
      : 0;
  const currency = rates[0]?.currency ?? PLATFORM_DEFAULT_CURRENCY;

  return {
    id: p.id,
    clerkUserId: p.userId,
    fullName: name,
    headline: bio ? bio.slice(0, 120) + (bio.length > 120 ? '…' : '') : 'Completa tu presentación en Mi perfil',
    email: contactEmail || '—',
    photoUrl: p.photoUrl,
    bioShort: bio ? bio.slice(0, 280) : 'Añade una bio para que las familias te conozcan mejor.',
    bioLong: bio || 'Aún no has escrito una descripción larga. Puedes hacerlo en Mi perfil.',
    yearsOfExperience: p.yearsOfExperience ?? 0,
    serviceMode: defaultServiceMode(p.serviceMode),
    city: p.city,
    zones: [],
    focusAreas: p.focusAreas.length ? p.focusAreas : [],
    categories: [],
    ageBands: [],
    methodology: '',
    languages: ['Español'],
    certifications: [],
    averageRating: p.averageRating,
    ratingCount: p.ratingCount,
    isAvailable: p.isAvailable,
    availabilitySummary: p.availabilitySummary?.trim() || 'Publica ventanas de disponibilidad en Agenda y horarios.',
    priceFromMinor: priceFrom,
    currency,
    videoPresentationUrl: null,
    galleryUrls: [],
    createdAt: new Date().toISOString(),
  };
}

/** Checklist de perfil a partir de campos reales. */
export function buildProfileCompletionFromProvider(
  p: ProviderProfileResponse,
): { scorePercent: number; items: ProfileCompletionItem[] } {
  const items: ProfileCompletionItem[] = [
    {
      id: 'name',
      label: 'Nombre completo',
      done: Boolean(p.fullName?.trim()),
      impactLabel: 'Confianza',
    },
    {
      id: 'bio',
      label: 'Bio o descripción',
      done: Boolean(p.bio?.trim()),
      impactLabel: 'Conversión',
    },
    {
      id: 'city',
      label: 'Ciudad',
      done: Boolean(p.city?.trim()),
      impactLabel: 'Búsqueda local',
    },
    {
      id: 'address',
      label: 'Dirección y código postal',
      done: Boolean(
        p.streetAddress?.trim() &&
          p.postalCode?.trim() &&
          p.unitOrBuilding?.trim() &&
          p.dwellingType,
      ),
      impactLabel: 'Citas presenciales',
    },
    {
      id: 'photo',
      label: 'Foto de perfil (URL)',
      done: Boolean(p.photoUrl?.trim()),
      impactLabel: 'Primera impresión',
    },
    {
      id: 'experience',
      label: 'Años de experiencia',
      done: p.yearsOfExperience != null && p.yearsOfExperience >= 0,
      impactLabel: 'Credibilidad',
    },
    {
      id: 'mode',
      label: 'Modalidad de servicio',
      done: p.serviceMode != null,
      impactLabel: 'Expectativas',
    },
    {
      id: 'focus',
      label: 'Especialidades / enfoque',
      done: p.focusAreas.length > 0,
      impactLabel: 'Afinidad',
    },
    {
      id: 'kinds',
      label: 'Tipo de servicio (docente o cuidado)',
      done: p.kinds.length > 0,
      impactLabel: 'Descubrimiento',
    },
  ];
  const done = items.filter((i) => i.done).length;
  const scorePercent =
    items.length === 0 ? 0 : Math.round((done / items.length) * 100);
  return { scorePercent, items };
}

function buildTopOffersFromAppointments(
  appointments: AppointmentRow[],
): { offerId: string; title: string; bookings: number }[] {
  const map = new Map<string, { title: string; bookings: number }>();
  for (const a of appointments) {
    const oid = a.providerOfferId;
    if (!oid) continue;
    if (a.status !== 'CONFIRMED' && a.status !== 'COMPLETED') continue;
    const title =
      (a.offerTitleSnapshot && a.offerTitleSnapshot.trim()) ||
      (a.providerOffer?.title && a.providerOffer.title.trim()) ||
      'Oferta';
    const cur = map.get(oid);
    if (cur) cur.bookings += 1;
    else map.set(oid, { title, bookings: 1 });
  }
  return [...map.entries()]
    .map(([offerId, v]) => ({ offerId, title: v.title, bookings: v.bookings }))
    .sort((x, y) => y.bookings - x.bookings)
    .slice(0, 5);
}

function appointmentToSession(a: AppointmentRow): EducatorSession {
  const family = a.consumerProfile.fullName?.trim() || 'Familia';
  const child = a.child?.firstName ?? '—';
  const modality = defaultServiceMode(a.providerProfile.serviceMode as ServiceMode | null);

  return {
    id: a.id,
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    status: a.status,
    studentName: child,
    familyName: family,
    childName: child,
    modality,
    offerTitle: (() => {
      const label =
        (a.offerTitleSnapshot && a.offerTitleSnapshot.trim()) ||
        (a.providerOffer?.title && a.providerOffer.title.trim()) ||
        '';
      if (label) return label;
      return a.requestsAlternativeSchedule ? 'Cita · horario propuesto' : 'Cita';
    })(),
    notes: a.noteFromFamily ?? undefined,
    requestsAlternativeSchedule: Boolean(a.requestsAlternativeSchedule),
  };
}

/** Pendientes primero; luego por hora de inicio (más próximas arriba). */
export function sortUpcomingEducatorSessions(
  sessions: EducatorSession[],
): EducatorSession[] {
  return [...sessions].sort((a, b) => {
    const rank = (s: EducatorSession) => {
      if (s.status === 'PENDING') return 0;
      if (s.status === 'COMPLETED') return 2;
      return 1;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

function startOfIsoWeekMonday(now: Date): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sessionsStartingThisWeek(
  appointments: AppointmentRow[],
  now: Date,
): number {
  const start = startOfIsoWeekMonday(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return appointments.filter((a) => {
    if (TERMINAL.has(a.status) || a.status === 'COMPLETED') return false;
    const s = new Date(a.startsAt);
    return !Number.isNaN(s.getTime()) && s >= start && s < end;
  }).length;
}

/** Suma horas de bloques que intersectan los próximos 7 días (aprox.). */
function studentGroupKey(a: AppointmentRow): string {
  if (a.childId) return `child:${a.childId}`;
  return `consumer:${a.consumerProfileId}:no-child`;
}

function parseMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * Alumnos/as deduplicados a partir de citas confirmadas (mismo hijo o misma familia sin hijo en dato).
 */
export function buildActiveStudentsFromAppointments(
  appointments: AppointmentRow[],
): EducatorStudent[] {
  const now = Date.now();
  const confirmed = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED',
  );
  const byKey = new Map<string, AppointmentRow[]>();
  for (const a of confirmed) {
    const k = studentGroupKey(a);
    const arr = byKey.get(k) ?? [];
    arr.push(a);
    byKey.set(k, arr);
  }

  const relOther: FamilyRelationship = 'OTHER';
  const students: EducatorStudent[] = [];

  for (const appts of byKey.values()) {
    appts.sort(
      (x, y) => parseMs(x.startsAt) - parseMs(y.startsAt),
    );
    const first = appts[0]!;
    const child = first.child;
    const fam = first.consumerProfile.fullName?.trim() || 'Familia';
    const childFirst = child?.firstName?.trim() || 'Alumno/a';
    const id = child?.id ?? `c:${first.consumerProfileId}:sin-hijo`;

    const past = appts.filter((a) => {
      const e = parseMs(a.endsAt);
      return !Number.isNaN(e) && e <= now;
    });
    const future = appts.filter((a) => {
      const s = parseMs(a.startsAt);
      return !Number.isNaN(s) && s >= now;
    });

    const lastPast =
      past.length === 0
        ? null
        : past.reduce((max, a) =>
            parseMs(a.endsAt) > parseMs(max.endsAt) ? a : max,
          past[0]!);
    const lastSessionAt = lastPast?.endsAt ?? null;

    const nextFuture =
      future.length === 0
        ? null
        : future.reduce((min, a) =>
            parseMs(a.startsAt) < parseMs(min.startsAt) ? a : min,
          future[0]!);
    const nextSessionAt = nextFuture?.startsAt ?? null;

    const sessionsCount = appts.length;
    const phone = first.consumerProfile.phone?.trim();
    const contactEmail = phone ? `Tel. ${phone}` : '—';

    const lastEnds = lastSessionAt ? parseMs(lastSessionAt) : NaN;
    const active =
      nextSessionAt != null ||
      (!Number.isNaN(lastEnds) && now - lastEnds < 180 * 86400000);

    students.push({
      id,
      childFirstName: childFirst,
      childAgeYears: 0,
      birthYear: 0,
      developmentStageLabel: 'Seguimiento por citas',
      familyName: fam,
      contactEmail,
      relationship: relOther,
      learningGoals: [],
      interests: [],
      active,
      lastSessionAt,
      nextSessionAt,
      sessionsCount,
      privateNotes: '',
      progressSummary:
        sessionsCount === 1
          ? 'Una cita confirmada con esta familia.'
          : `${sessionsCount} citas confirmadas con esta familia.`,
      roadmapId: null,
    });
  }

  students.sort((a, b) => {
    if (a.nextSessionAt && b.nextSessionAt) {
      return parseMs(a.nextSessionAt) - parseMs(b.nextSessionAt);
    }
    if (a.nextSessionAt) return -1;
    if (b.nextSessionAt) return 1;
    return a.familyName.localeCompare(b.familyName, 'es');
  });

  return students;
}

export function buildProviderLaunchTasks(
  connect: ProviderConnectStatus | null,
  blocks: { startsAt: string; endsAt: string }[],
  rates: ProviderRateApiRow[],
): ProviderLaunchTask[] {
  const stripeDone = Boolean(connect?.onboardingComplete);
  const agendaDone = blocks.length > 0;
  const ratesDone = rates.length > 0;
  return [
    {
      id: 'stripe',
      label: 'Cobros con Stripe (Connect)',
      description:
        'Esto habilita cobro automático. Puedes configurar agenda y ofertas aunque aún no lo completes.',
      done: stripeDone,
      href: '/dashboard/provider/pagos',
      cta: 'Configurar cobros',
    },
    {
      id: 'agenda',
      label: 'Bloques en el calendario',
      description:
        'Añade ventanas en Agenda para que las familias vean cuándo pueden reservar contigo.',
      done: agendaDone,
      href: '/dashboard/provider/agenda',
      cta: 'Ir a agenda',
    },
    {
      id: 'rates',
      label: 'Tarifas',
      description:
        'Define precios desde tu vitrina; así las familias saben cuánto cuesta una sesión.',
      done: ratesDone,
      href: '/profile/provider#tarifas',
      cta: 'Ir a tarifas',
    },
  ];
}

function openHoursNextSevenDays(
  blocks: { startsAt: string; endsAt: string }[],
  now: Date,
): number {
  const horizon = new Date(now.getTime() + 7 * 86400000);
  let ms = 0;
  for (const b of blocks) {
    const bs = new Date(b.startsAt);
    const be = new Date(b.endsAt);
    if (Number.isNaN(bs.getTime()) || Number.isNaN(be.getTime()) || be <= now)
      continue;
    const sliceStart = bs > now ? bs : now;
    const sliceEnd = be < horizon ? be : horizon;
    if (sliceEnd > sliceStart) ms += sliceEnd.getTime() - sliceStart.getTime();
  }
  return Math.round((ms / 3600000) * 10) / 10;
}

/**
 * Panel del educador sin datos demo: citas, perfil, bloques y tarifas reales;
 * el resto de secciones llegan vacías hasta tener API.
 */
export function buildEducatorDashboardSnapshot(
  input: BuildEducatorDashboardInput,
): EducatorDashboardSnapshot {
  const now = new Date();
  const sessions = sortUpcomingEducatorSessions(
    input.appointments.map((a) => appointmentToSession(a)).slice(0, 60),
  );

  const profile = educatorProfileFromProvider(
    input.providerProfile,
    input.contactEmail,
    input.rates,
  );
  const profileCompletion = buildProfileCompletionFromProvider(
    input.providerProfile,
  );
  const providerLaunchTasks = buildProviderLaunchTasks(
    input.connectStatus,
    input.availabilityBlocks,
    input.rates,
  );

  return {
    profile,
    kpis: {
      revenueMonthMinor: 0,
      sessionsThisWeek: sessionsStartingThisWeek(input.appointments, now),
      newLeads: 0,
      profileViewsToBookingRate: 0,
      openHoursWeek: openHoursNextSevenDays(input.availabilityBlocks, now),
      avgRating: input.providerProfile.averageRating,
      retentionRate: 0,
    },
    upcomingSessions: sessions,
    leads: [],
    activeStudents: buildActiveStudentsFromAppointments(input.appointments),
    topOffers: buildTopOffersFromAppointments(input.appointments),
    recentReviews: educatorReviewsFromAppointments(input.appointments),
    reviewsLeftForFamilies: educatorReviewsOfFamiliesFromAppointments(
      input.appointments,
    ),
    insights: [],
    badges: [],
    profileCompletion,
    providerLaunchTasks,
  };
}
