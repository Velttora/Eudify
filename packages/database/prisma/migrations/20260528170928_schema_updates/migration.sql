-- CreateEnum
CREATE TYPE "ProviderCertificationLevel" AS ENUM ('STARTER', 'CERTIFIED', 'MASTER', 'FELLOW');

-- AlterTable
ALTER TABLE "children" ADD COLUMN     "pillar_scores" JSONB;

-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "certification_level" "ProviderCertificationLevel";

-- RenameIndex
ALTER INDEX "planner_plans_consumer_profile_id_child_profile_id_category_id_" RENAME TO "planner_plans_consumer_profile_id_child_profile_id_category_key";
