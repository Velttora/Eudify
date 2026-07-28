-- CreateTable
CREATE TABLE "child_curriculum_progress" (
    "id" TEXT NOT NULL,
    "consumer_profile_id" TEXT NOT NULL,
    "child_profile_id" TEXT NOT NULL,
    "current_module_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_curriculum_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_module_completions" (
    "id" TEXT NOT NULL,
    "progress_id" TEXT NOT NULL,
    "module_number" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_module_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "child_curriculum_progress_consumer_profile_id_child_profile_key" ON "child_curriculum_progress"("consumer_profile_id", "child_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_module_completions_progress_id_module_number_key" ON "child_module_completions"("progress_id", "module_number");

-- AddForeignKey
ALTER TABLE "child_curriculum_progress" ADD CONSTRAINT "child_curriculum_progress_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_module_completions" ADD CONSTRAINT "child_module_completions_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "child_curriculum_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
