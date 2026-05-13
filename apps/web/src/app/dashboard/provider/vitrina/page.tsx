'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';

import { listMyAvailabilityBlocks } from '@/features/availability/api/availability-api';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import {
  buildProfileCompletionFromProvider,
  educatorProfileFromProvider,
  educatorReviewsFromAppointments,
} from '@/features/educator-hub/application/build-dashboard-snapshot';
import { listProviderAppointments } from '@/features/appointments/api/appointments-api';
import { EducatorVitrinaPage } from '@/features/educator-hub/presentation/views/educator-vitrina-page';
import { getProviderProfile } from '@/features/provider/api/provider-api';
import { listMyRates } from '@/features/provider-rates/api/provider-rates-api';

export default function ProviderVitrinaRoute() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const isProvider = bootstrapQuery.data?.user?.role === 'PROVIDER';

  const profileQuery = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => getProviderProfile(getToken),
    enabled: isProvider,
  });

  const ratesQuery = useQuery({
    queryKey: ['provider-rates', 'me'],
    queryFn: () => listMyRates(getToken),
    enabled: isProvider,
  });

  const blocksQuery = useQuery({
    queryKey: ['availability', 'me', 'blocks'],
    queryFn: () => listMyAvailabilityBlocks(getToken),
    enabled: isProvider,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'provider', 'me'],
    queryFn: () => listProviderAppointments(getToken),
    enabled: isProvider,
  });

  const vitrinaProfile = useMemo(() => {
    const api = profileQuery.data;
    if (!api) return null;
    return educatorProfileFromProvider(
      api,
      user?.primaryEmailAddress?.emailAddress?.trim() ?? '',
      ratesQuery.data ?? [],
    );
  }, [profileQuery.data, user, ratesQuery.data]);

  const completion = useMemo(() => {
    const api = profileQuery.data;
    if (!api) {
      return { scorePercent: 0, items: [] };
    }
    return buildProfileCompletionFromProvider(api);
  }, [profileQuery.data]);

  const vitrinaReviews = useMemo(
    () => educatorReviewsFromAppointments(appointmentsQuery.data ?? []),
    [appointmentsQuery.data],
  );

  if (
    bootstrapQuery.isLoading ||
    profileQuery.isLoading ||
    ratesQuery.isLoading ||
    blocksQuery.isLoading ||
    appointmentsQuery.isLoading
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Cargando vitrina…
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data || !vitrinaProfile) {
    return (
      <div className="p-8 text-red-700">
        No se pudo cargar la vitrina.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  const p = profileQuery.data;

  return (
    <EducatorVitrinaPage
      profile={vitrinaProfile}
      reviews={vitrinaReviews}
      badges={[]}
      completion={completion}
      publicProfileId={p.id}
      kinds={p.kinds}
      rates={ratesQuery.data ?? []}
      availabilityBlocks={blocksQuery.data ?? []}
      isProfileCompleted={p.isProfileCompleted}
    />
  );
}
