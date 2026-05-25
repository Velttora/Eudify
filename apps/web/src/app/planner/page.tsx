import type { Metadata } from 'next';

import { PlannerScreen } from '@/features/educational-planner/planner-screen';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PlannerPage() {
  return <PlannerScreen />;
}
