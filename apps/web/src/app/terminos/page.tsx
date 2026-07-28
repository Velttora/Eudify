import Link from 'next/link';

import { PublicSiteHeader } from '@/shared/components/public-site-header';
import { SiteFooter } from '@/shared/components/site-footer';

export const metadata = { title: 'Términos y condiciones · Eudify' };

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicSiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Términos y condiciones
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Última actualización: enero 2026 · Eudify es un producto de Velttora LLC
        </p>
        <div className="space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Al usar Eudify aceptas estos términos en su totalidad. Si no estás de acuerdo, por
            favor no uses la plataforma.
          </p>
          <p>
            Eudify es un producto de Velttora LLC: un marketplace que conecta familias con
            educadores, niñeras y cuidadores verificados en Latinoamérica. Velttora LLC no es
            empleador de los providers y no es responsable por las interacciones que ocurran
            fuera de la plataforma.
          </p>
          <p>
            Los pagos se procesan a través de Stripe Connect. Eudify retiene una comisión de
            servicio sobre cada transacción, cuyo porcentaje se especifica en el momento de la
            reserva. Las liquidaciones a los providers se realizan en D+2 hábiles tras la
            sesión completada.
          </p>
          <p>
            Las cuentas pueden ser suspendidas o eliminadas si se detecta uso fraudulento,
            falsificación de identidad, o violación de las políticas de seguridad infantil de
            Eudify.
          </p>
          <p>
            Para dudas sobre estos términos escríbenos a{' '}
            <a href="mailto:legal@eudify.com" className="text-primary underline underline-offset-2">
              legal@eudify.com
            </a>
            .
          </p>
          <p className="text-sm text-muted-foreground/70">
            Este documento es una versión preliminar. Los términos completos estarán disponibles
            antes del lanzamiento comercial de Eudify.
          </p>
        </div>
        <div className="mt-12">
          <Link href="/" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
