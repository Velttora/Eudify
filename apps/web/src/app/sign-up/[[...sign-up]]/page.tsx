import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';

export const metadata: Metadata = { robots: { index: false, follow: false } };

import { AuthGateShell } from '@/shared/components/friendly-form-shell';
import { clerkFriendlyAppearance } from '@/shared/lib/clerk-appearance';

export default function SignUpPage() {
  return (
    <AuthGateShell
      title="Crea tu cuenta en pocos pasos"
      subtitle="Te pediremos un correo y una contraseña segura. Después completaremos juntos los datos de tu familia o de tu trabajo como educador."
      bullets={[
        'Sin letras pequeñas complicadas: solo lo necesario para cuidar tu información.',
        'Puedes pausar y volver más tarde; guardamos tu progreso en el perfil.',
        'Los planes de suscripción llegarán pronto; por ahora el registro es gratuito.',
      ]}
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/mi-espacio"
        appearance={clerkFriendlyAppearance}
      />
    </AuthGateShell>
  );
}
