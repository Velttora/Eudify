'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo } from 'react';

import { listProviderAppointments } from '@/features/appointments/api/appointments-api';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { buildActiveStudentsFromAppointments } from '@/features/educator-hub/application/build-dashboard-snapshot';
import { EducatorStudentsPage } from '@/features/educator-hub/presentation/views/educator-students-page';

export default function ProviderStudentsRoute() {
  const { getToken } = useAuth();

  const bootstrapQuery = useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: () => fetchBootstrap(getToken),
  });

  const isProvider = bootstrapQuery.data?.user?.role === 'PROVIDER';

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'provider', 'me'],
    queryFn: () => listProviderAppointments(getToken),
    enabled: isProvider,
  });

  const students = useMemo(
    () => buildActiveStudentsFromAppointments(appointmentsQuery.data ?? []),
    [appointmentsQuery.data],
  );

  const loading =
    bootstrapQuery.isLoading ||
    (isProvider && appointmentsQuery.isLoading);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-muted-foreground">
        Cargando estudiantes…
      </div>
    );
  }

  if (bootstrapQuery.isError || appointmentsQuery.isError) {
    return (
      <div className="p-8 text-base text-red-700">
        No se pudo cargar el listado.{' '}
        <Link href="/mi-espacio" className="font-semibold underline">
          Reintentar
        </Link>
      </div>
    );
  }

  if (!isProvider) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Solo los educadores pueden ver esta sección.
      </div>
    );
  }

  return <EducatorStudentsPage students={students} />;
}
