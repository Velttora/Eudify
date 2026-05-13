'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { listProviderAppointments } from '@/features/appointments/api/appointments-api';
import {
  bootstrapQueryKey,
  fetchBootstrap,
} from '@/features/bootstrap/api/bootstrap-api';
import { buildActiveStudentsFromAppointments } from '@/features/educator-hub/application/build-dashboard-snapshot';
import { EducatorStudentDetailPage } from '@/features/educator-hub/presentation/views/educator-student-detail-page';

export default function ProviderStudentDetailRoute() {
  const { getToken } = useAuth();
  const params = useParams<{ studentId?: string | string[] }>();
  const studentIdRaw = params.studentId;
  const studentId = Array.isArray(studentIdRaw) ? studentIdRaw[0] : studentIdRaw;

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

  const student = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  );

  const loading =
    bootstrapQuery.isLoading ||
    (isProvider && appointmentsQuery.isLoading);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-muted-foreground">
        Cargando estudiante…
      </div>
    );
  }

  if (bootstrapQuery.isError || appointmentsQuery.isError) {
    return (
      <div className="space-y-4 p-4">
        <nav className="text-sm" aria-label="Breadcrumb">
          <Link href="/dashboard/provider/estudiantes" className="font-medium text-primary underline">
            Estudiantes
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-muted-foreground">Detalle</span>
        </nav>
        <p className="text-base text-red-700">No se pudo cargar el detalle.</p>
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

  if (student) {
    return <EducatorStudentDetailPage student={student} roadmap={null} />;
  }

  return (
    <div className="space-y-4 p-4">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href="/dashboard/provider/estudiantes" className="font-medium text-primary underline">
          Estudiantes
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="text-muted-foreground">No encontrado</span>
      </nav>
      <h1 className="text-lg font-semibold text-foreground">
        No encontramos este estudiante
      </h1>
      <p className="max-w-lg text-sm text-muted-foreground">
        Puede que la cita asociada ya no esté confirmada o que el enlace sea antiguo.
        Vuelve al listado para ver los estudiantes disponibles.
      </p>
      <Link
        href="/dashboard/provider/estudiantes"
        className="text-sm font-medium text-primary underline"
      >
        Volver al listado
      </Link>
    </div>
  );
}
