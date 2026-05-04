'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';

import {
  listMyAvailabilityBlocks,
} from '@/features/availability/api/availability-api';
import { listProviderAppointments } from '@/features/appointments/api/appointments-api';
import { buildEducatorDashboardSnapshot } from '@/features/educator-hub/application/build-dashboard-snapshot';
import { EducatorDashboardHome } from '@/features/educator-hub/presentation/views/educator-dashboard-home';
import { getProviderConnectStatus } from '@/features/payments/api/payments-api';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { getProviderProfile } from '@/features/provider/api/provider-api';
import { listMyRates } from '@/features/provider-rates/api/provider-rates-api';

export default function ProviderDashboardPage() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const isProvider = bootstrapQuery.data?.user.role === 'PROVIDER';

  const profileQuery = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => getProviderProfile(getToken),
    enabled: isProvider,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'provider', 'me'],
    queryFn: () => listProviderAppointments(getToken),
    enabled: isProvider,
  });

  const blocksQuery = useQuery({
    queryKey: ['availability', 'me', 'blocks'],
    queryFn: () => listMyAvailabilityBlocks(getToken),
    enabled: isProvider,
  });

  const ratesQuery = useQuery({
    queryKey: ['provider-rates', 'me'],
    queryFn: () => listMyRates(getToken),
    enabled: isProvider,
  });

  const connectQuery = useQuery({
    queryKey: ['payments', 'provider', 'connect-status'],
    queryFn: () => getProviderConnectStatus(getToken),
    enabled: isProvider,
  });

  const snapshot = useMemo(() => {
    const p = profileQuery.data;
    if (!p) return null;
    return buildEducatorDashboardSnapshot({
      providerProfile: p,
      contactEmail:
        user?.primaryEmailAddress?.emailAddress?.trim() ?? '',
      appointments: appointmentsQuery.data ?? [],
      availabilityBlocks: blocksQuery.data ?? [],
      rates: ratesQuery.data ?? [],
      connectStatus: connectQuery.data ?? null,
    });
  }, [
    profileQuery.data,
    user?.primaryEmailAddress?.emailAddress,
    appointmentsQuery.data,
    blocksQuery.data,
    ratesQuery.data,
    connectQuery.data,
  ]);

  const displayName = useMemo(() => {
    const p = profileQuery.data;
    return (
      p?.fullName?.trim() ||
      user?.firstName ||
      user?.primaryEmailAddress?.emailAddress ||
      'Educador'
    );
  }, [profileQuery.data, user]);

  const loading =
    bootstrapQuery.isLoading ||
    profileQuery.isLoading ||
    appointmentsQuery.isLoading ||
    blocksQuery.isLoading ||
    ratesQuery.isLoading ||
    connectQuery.isLoading;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-[var(--muted-foreground)]">
        Cargando tu panel…
      </div>
    );
  }

  if (bootstrapQuery.isError || profileQuery.isError || !profileQuery.data || !snapshot) {
    return (
      <div className="p-8 text-base text-red-700">
        No se pudo cargar tu tablero.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <Link href="/dashboard/provider/chat" className="text-sm font-semibold text-primary underline">
          Ir al chat con familias
        </Link>
      </div>
      <EducatorDashboardHome
        snapshot={snapshot}
        displayName={displayName}
        publicProfileId={profileQuery.data.id}
        appointmentRows={appointmentsQuery.data ?? []}
      />
    </div>
  );
}
