import {
  AppointmentReviewAuthor,
  AppointmentStatus,
} from '@repo/database';

import { PrismaService } from '../prisma/prisma.service';

export type ProviderRatingSummary = {
  averageRating: number;
  ratingCount: number;
};

type RatingPrisma = Pick<PrismaService, 'appointmentReview'>;

const EMPTY_RATING: ProviderRatingSummary = {
  averageRating: 0,
  ratingCount: 0,
};

function roundedAverage(sum: number, count: number): number {
  if (count <= 0) return 0;
  const avg = sum / count;
  const clamped = Math.max(0, Math.min(5, avg));
  return Number(clamped.toFixed(2));
}

export async function providerRatingSummary(
  prisma: RatingPrisma,
  providerProfileId: string,
): Promise<ProviderRatingSummary> {
  const rows = await prisma.appointmentReview.findMany({
    where: {
      authorRole: AppointmentReviewAuthor.CONSUMER,
      appointment: {
        providerProfileId,
        status: AppointmentStatus.COMPLETED,
      },
    },
    select: { stars: true },
  });

  if (rows.length === 0) return EMPTY_RATING;
  const sum = rows.reduce((acc, r) => acc + r.stars, 0);
  return {
    averageRating: roundedAverage(sum, rows.length),
    ratingCount: rows.length,
  };
}

export async function providerRatingSummaries(
  prisma: RatingPrisma,
  providerProfileIds: string[],
): Promise<Map<string, ProviderRatingSummary>> {
  const ids = [...new Set(providerProfileIds)].filter(Boolean);
  const out = new Map<string, ProviderRatingSummary>();
  if (ids.length === 0) return out;

  const rows = await prisma.appointmentReview.findMany({
    where: {
      authorRole: AppointmentReviewAuthor.CONSUMER,
      appointment: {
        providerProfileId: { in: ids },
        status: AppointmentStatus.COMPLETED,
      },
    },
    select: {
      stars: true,
      appointment: { select: { providerProfileId: true } },
    },
  });

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const providerId = row.appointment.providerProfileId;
    const bucket = buckets.get(providerId) ?? { sum: 0, count: 0 };
    bucket.sum += row.stars;
    bucket.count += 1;
    buckets.set(providerId, bucket);
  }

  for (const [providerId, bucket] of buckets) {
    out.set(providerId, {
      averageRating: roundedAverage(bucket.sum, bucket.count),
      ratingCount: bucket.count,
    });
  }

  return out;
}
