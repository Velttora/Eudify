import { TOTAL_CURRICULUM_MODULES, type PlannerChildProfile } from '@repo/educational-planner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_PLANNER_CHILD } from './mock-profiles';

type PlannerState = {
  child: PlannerChildProfile;
  currentModuleNumber: number;
  completedModuleNumbers: number[];
  setChild: (child: PlannerChildProfile) => void;
  hydrateProgress: (progress: {
    currentModuleNumber: number;
    completedModuleNumbers: number[];
  }) => void;
  /** Solo para el modo demo/sin sesión: no hay backend que persista el avance. */
  markModuleCompletedLocally: (moduleNumber: number) => void;
};

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      child: DEFAULT_PLANNER_CHILD,
      currentModuleNumber: 1,
      completedModuleNumbers: [],

      setChild: (child) => set({ child }),

      hydrateProgress: (progress) =>
        set({
          currentModuleNumber: progress.currentModuleNumber,
          completedModuleNumbers: progress.completedModuleNumbers,
        }),

      markModuleCompletedLocally: (moduleNumber) => {
        const { completedModuleNumbers, currentModuleNumber } = get();
        if (moduleNumber !== currentModuleNumber) return;
        set({
          completedModuleNumbers: Array.from(
            new Set([...completedModuleNumbers, moduleNumber]),
          ).sort((a, b) => a - b),
          currentModuleNumber: Math.min(moduleNumber + 1, TOTAL_CURRICULUM_MODULES),
        });
      },
    }),
    {
      name: 'eudify-planner-v2',
      partialize: (s) => ({
        child: s.child,
        currentModuleNumber: s.currentModuleNumber,
        completedModuleNumbers: s.completedModuleNumbers,
      }),
    },
  ),
);
