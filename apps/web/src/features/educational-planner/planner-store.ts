import {
  buildDefaultScientificPlan,
  createRoadmapItemId,
  MOCK_COURSES,
  reorderRoadmapItems,
  type LearningCategoryId,
  type PlannerChildProfile,
  type PlanSuggestion,
  type UserLearningPlan,
  type UserLearningPlanItem,
} from '@repo/educational-planner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_PLANNER_CHILD } from './mock-profiles';

type PlannerState = {
  child: PlannerChildProfile;
  categoryId: LearningCategoryId;
  suggestion: PlanSuggestion | null;
  items: UserLearningPlanItem[];
  lastSavedAt: string | null;
  setChild: (child: PlannerChildProfile) => void;
  setCategory: (categoryId: LearningCategoryId) => void;
  generateSuggestion: () => void;
  acceptSuggestionToRoadmap: () => void;
  setItems: (items: UserLearningPlanItem[]) => void;
  reorderItems: (activeId: string, overId: string) => void;
  removeItem: (id: string) => void;
  updateItem: (
    id: string,
    patch: Partial<Pick<UserLearningPlanItem, 'title' | 'notes'>>,
  ) => void;
  addCourseToRoadmap: (courseId: string) => void;
  addCustomBlock: () => void;
  clearRoadmap: () => void;
  hydrateFromPlan: (
    plan: Pick<
      UserLearningPlan,
      'childProfileId' | 'categoryId' | 'items' | 'updatedAt'
    > & {
      child?: PlannerChildProfile;
    },
  ) => void;
  /** Marca un guardado explícito (la persistencia también corre en cada cambio). */
  saveDraft: () => void;
};

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      child: DEFAULT_PLANNER_CHILD,
      categoryId: 'LANGUAGES',
      suggestion: null,
      items: [],
      lastSavedAt: null,

      setChild: (child) => set({ child, suggestion: null }),

      setCategory: (categoryId) => set({ categoryId, suggestion: null }),

      generateSuggestion: () => {
        const { child, categoryId } = get();
        const suggestion = buildDefaultScientificPlan({ child, categoryId });
        set({
          suggestion,
          lastSavedAt: new Date().toISOString(),
        });
      },

      acceptSuggestionToRoadmap: () => {
        const s = get().suggestion;
        if (!s) return;
        set({
          items: s.defaultRoadmapItems.map((it, i) => ({ ...it, order: i })),
          lastSavedAt: new Date().toISOString(),
        });
      },

      setItems: (items) =>
        set({
          items: items.map((it, i) => ({ ...it, order: i })),
          lastSavedAt: new Date().toISOString(),
        }),

      reorderItems: (activeId, overId) => {
        const next = reorderRoadmapItems(get().items, activeId, overId);
        set({ items: next, lastSavedAt: new Date().toISOString() });
      },

      removeItem: (id) => {
        set({
          items: get()
            .items.filter((x) => x.id !== id)
            .map((it, i) => ({ ...it, order: i })),
          lastSavedAt: new Date().toISOString(),
        });
      },

      updateItem: (id, patch) => {
        set({
          items: get().items.map((it) =>
            it.id === id ? { ...it, ...patch } : it,
          ),
          lastSavedAt: new Date().toISOString(),
        });
      },

      addCourseToRoadmap: (courseId) => {
        const course = MOCK_COURSES.find((c) => c.id === courseId);
        if (!course) return;
        const items = get().items;
        const order = items.length;
        const newItem: UserLearningPlanItem = {
          id: createRoadmapItemId(),
          source: 'course',
          courseId: course.id,
          title: course.title,
          notes: course.shortDescription,
          order,
          rationale: `Curso añadido desde el catálogo sugerido (${course.format}).`,
          suggestedWeeklyMinutes: course.suggestedWeeklyMinutes,
        };
        set({
          items: [...items, newItem],
          lastSavedAt: new Date().toISOString(),
        });
      },

      addCustomBlock: () => {
        const items = get().items;
        const newItem: UserLearningPlanItem = {
          id: createRoadmapItemId(),
          source: 'custom',
          title: 'Bloque personalizado',
          notes: '',
          order: items.length,
          rationale:
            'Añadido manualmente. Úsalo para acuerdos con el menor, deberes o acuerdos con un educador.',
        };
        set({
          items: [...items, newItem],
          lastSavedAt: new Date().toISOString(),
        });
      },

      clearRoadmap: () =>
        set({ items: [], lastSavedAt: new Date().toISOString() }),

      hydrateFromPlan: (plan) =>
        set({
          child:
            plan.child ??
            ({
              ...get().child,
              id: plan.childProfileId,
            } satisfies PlannerChildProfile),
          categoryId: plan.categoryId,
          items: plan.items,
          suggestion: null,
          lastSavedAt: plan.updatedAt,
        }),

      saveDraft: () => set({ lastSavedAt: new Date().toISOString() }),
    }),
    {
      name: 'eudify-planner-v1',
      partialize: (s) => ({
        child: s.child,
        categoryId: s.categoryId,
        items: s.items,
        lastSavedAt: s.lastSavedAt,
      }),
    },
  ),
);
