'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { listMyAppointments } from '@/features/appointments/api/appointments-api';
import { filterConsumerAppointmentsNext7Days } from '@/features/consumer/lib/consumer-appointments-filters';
import { consumerHubHref } from '@/features/consumer/lib/consumer-hub';
import { ConsumerUpcomingAppointmentsPanel } from '@/features/consumer/components/consumer-upcoming-appointments-panel';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';

/**
 * En /explorar: si la familia tiene citas relevantes en los próximos 7 días,
 * muestra el mismo panel de “próximas citas” que en el resumen del hub.
 */
export function ConsumerExploreNearAppointments() {
  const { userId, getToken } = useAuth();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
    enabled: Boolean(userId),
  });

  const isConsumer = bootstrapQuery.data?.user?.role === 'CONSUMER';

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'me'],
    queryFn: () => listMyAppointments(getToken),
    enabled: Boolean(userId) && isConsumer,
  });

  const filtered = useMemo(() => {
    const data = appointmentsQuery.data ?? [];
    return filterConsumerAppointmentsNext7Days(data);
  }, [appointmentsQuery.data]);

  if (!userId) return null;
  if (bootstrapQuery.isLoading || appointmentsQuery.isLoading) return null;
  if (!isConsumer) return null;
  if (appointmentsQuery.isError) return null;
  if (filtered.length === 0) return null;

  return (
    <div className="mb-8">
      <ConsumerUpcomingAppointmentsPanel
        appointments={filtered}
        maxItems={5}
        title="Tus citas en los próximos 7 días"
        manageHref={consumerHubHref('citas')}
        manageLabel="Gestionar en Mi espacio"
      />
    </div>
  );
}
