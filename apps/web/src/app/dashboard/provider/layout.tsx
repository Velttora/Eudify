import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { EducatorHubShell } from '@/features/educator-hub/presentation/educator-hub-shell';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProviderDashboardLayout({ children }: { children: ReactNode }) {
  return <EducatorHubShell>{children}</EducatorHubShell>;
}
