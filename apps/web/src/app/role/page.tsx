'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useBootstrapQuery, useSetRoleMutation } from '@/features/bootstrap/hooks/use-bootstrap';
import {
  landingPathAfterBootstrap,
  pathAfterBootstrap,
} from '@/shared/lib/routing';
import { FriendlyFormShell } from '@/shared/components/friendly-form-shell';
import { Button } from '@/shared/components/ui/button';

export default function RoleSelectionPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useBootstrapQuery();
  const setRole = useSetRoleMutation();

  useEffect(() => {
    if (data && !data.needsRoleSelection) {
      router.replace(landingPathAfterBootstrap(data));
    }
  }, [data, router]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <p className="text-center text-base text-stone-600">Cargando…</p>
      </div>
    );
  }

  if (!data.needsRoleSelection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <p className="text-center text-base text-stone-600">Un momento…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-stone-50 px-4 py-8">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Error'}
        </p>
        <Button className="mt-4" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <FriendlyFormShell
      title="¿Cómo usarás Eudify?"
      subtitle="Un clic. Luego completarás tu perfil en una sola pantalla. (Paso 1 de 3: elegir tipo de cuenta.)"
      maxWidthClass="max-w-4xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">Familia</h2>
          <p className="mt-2 flex-1 text-sm leading-snug text-stone-600">
            Busco educación o cuidado para niños. Perfil familiar y, más adelante,
            planes opcionales.
          </p>
          <Button
            className="mt-4 w-full py-3.5 text-base"
            disabled={setRole.isPending}
            onClick={() =>
              setRole.mutate('CONSUMER', {
                onSuccess: (b) => router.replace(pathAfterBootstrap(b)),
              })
            }
          >
            Soy familia
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">Educador o cuidador</h2>
          <p className="mt-2 flex-1 text-sm leading-snug text-stone-600">
            Ofrezco clases o cuidado. Tu perfil será visible para las familias.
          </p>
          <Button
            variant="secondary"
            className="mt-4 w-full py-3.5 text-base"
            disabled={setRole.isPending}
            onClick={() =>
              setRole.mutate('PROVIDER', {
                onSuccess: (b) => router.replace(pathAfterBootstrap(b)),
              })
            }
          >
            Soy educador
          </Button>
        </div>
      </div>
    </FriendlyFormShell>
  );
}
