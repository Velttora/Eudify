import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Compatibilidad: antes el cliente hacía sync aquí; ahora todo pasa por /mi-espacio. */
export default function BootstrapPage() {
  redirect('/mi-espacio');
}
