-- CreateEnum
CREATE TYPE "UserLearningPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserLearningPlanItemSource" AS ENUM ('scientific_template', 'course', 'custom');

-- CreateTable
CREATE TABLE "planner_plans" (
    "id" TEXT NOT NULL,
    "consumer_profile_id" TEXT NOT NULL,
    "child_profile_id" TEXT NOT NULL,
    "child_snapshot" JSONB NOT NULL DEFAULT '{}',
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "UserLearningPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planner_plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "source" "UserLearningPlanItemSource" NOT NULL,
    "scientific_template_block_id" TEXT,
    "course_id" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL,
    "rationale" TEXT NOT NULL,
    "suggested_weekly_minutes" INTEGER,
    "milestone_labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planner_plans_consumer_profile_id_child_profile_id_category_id_key" ON "planner_plans"("consumer_profile_id", "child_profile_id", "category_id");

-- CreateIndex
CREATE INDEX "planner_plans_consumer_profile_id_updated_at_idx" ON "planner_plans"("consumer_profile_id", "updated_at");

-- CreateIndex
CREATE INDEX "planner_plan_items_plan_id_sort_order_idx" ON "planner_plan_items"("plan_id", "sort_order");

-- AddForeignKey
ALTER TABLE "planner_plans" ADD CONSTRAINT "planner_plans_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planner_plan_items" ADD CONSTRAINT "planner_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planner_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
