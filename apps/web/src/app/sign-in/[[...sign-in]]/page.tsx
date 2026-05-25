import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';

export const metadata: Metadata = { robots: { index: false, follow: false } };

import { AuthGateShell } from '@/shared/components/friendly-form-shell';
import { clerkFriendlyAppearance } from '@/shared/lib/clerk-appearance';

export default function SignInPage() {
  return (
    <AuthGateShell
      title="Entra con tranquilidad"
      subtitle="Usa el correo con el que te registraste. Si algo no funciona, revisa que sea el mismo que en tu invitación o en el registro."
      bullets={[
        'Aquí verás tu perfil familiar y podrás actualizarlo cuando quieras.',
        'Explora educadores y cuidadores desde la página principal sin iniciar sesión.',
        'Muy pronto podrás elegir un plan educativo para tu familia desde tu cuenta.',
      ]}
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/mi-espacio"
        appearance={clerkFriendlyAppearance}
      />
    </AuthGateShell>
  );
}
