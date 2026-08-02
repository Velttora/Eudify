import Link from 'next/link';

import { PublicSiteHeader } from '@/shared/components/public-site-header';
import { SiteFooter } from '@/shared/components/site-footer';

export const metadata = { title: 'Política de privacidad · Eudify' };

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicSiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20 sm:px-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Última actualización: enero 2026 · Eudify es un producto de Velttora LLC
        </p>
        <div className="space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Eudify es un producto de Velttora LLC. Nos comprometemos a proteger la información
            personal de las familias, educadores y cuidadores que usan nuestra plataforma. Esta
            política describe qué datos recopilamos, cómo los usamos y tus derechos sobre ellos.
          </p>
          <p>
            Recopilamos datos de registro (nombre, correo, teléfono), información del perfil
            familiar (datos de menores, dirección), datos de uso de la plataforma y, cuando aplica,
            información de pago procesada de forma segura por Stripe.
          </p>
          <p>
            Usamos tus datos exclusivamente para operar y mejorar el servicio Eudify, facilitar la
            conexión entre familias y educadores verificados, procesar pagos y enviarte
            comunicaciones relacionadas con tu cuenta.
          </p>
          <p>
            No vendemos ni compartimos tus datos con terceros con fines de marketing. Compartimos
            únicamente la información necesaria con proveedores de infraestructura (Clerk, Stripe,
            Vercel) bajo contratos de procesamiento de datos.
          </p>
          <p>
            Tienes derecho a acceder, rectificar, portar o eliminar tus datos en cualquier momento
            desde tu perfil o escribiéndonos a{' '}
            <a href="mailto:privacidad@eudify.co" className="text-primary underline underline-offset-2">
              privacidad@eudify.co
            </a>
            .
          </p>
          <p className="text-sm text-muted-foreground/70">
            Este documento es una versión preliminar. La política de privacidad completa estará
            disponible antes del lanzamiento comercial de Eudify.
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
