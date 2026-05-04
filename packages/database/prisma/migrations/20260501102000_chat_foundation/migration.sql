-- CreateEnum
CREATE TYPE "ChatMessageKind" AS ENUM ('TEXT');

-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "PushDevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "consumer_profile_id" TEXT NOT NULL,
    "provider_profile_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "kind" "ChatMessageKind" NOT NULL DEFAULT 'TEXT',
    "text" TEXT NOT NULL,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'SENT',
    "client_message_id" TEXT,
    "appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participant_states" (
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_message_id" TEXT,
    "last_read_at" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_participant_states_pkey" PRIMARY KEY ("thread_id","user_id")
);

-- CreateTable
CREATE TABLE "push_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "PushDevicePlatform" NOT NULL,
    "token" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_threads_consumer_profile_id_provider_profile_id_key" ON "chat_threads"("consumer_profile_id", "provider_profile_id");

-- CreateIndex
CREATE INDEX "chat_threads_last_message_at_idx" ON "chat_threads"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_messages_thread_id_client_message_id_key" ON "chat_messages"("thread_id", "client_message_id");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_created_at_id_idx" ON "chat_messages"("thread_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_appointment_id_created_at_idx" ON "chat_messages"("thread_id", "appointment_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_sender_user_id_created_at_idx" ON "chat_messages"("sender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_participant_states_user_id_updated_at_idx" ON "chat_participant_states"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_user_id_token_key" ON "push_devices"("user_id", "token");

-- CreateIndex
CREATE INDEX "push_devices_token_idx" ON "push_devices"("token");

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_consumer_profile_id_fkey" FOREIGN KEY ("consumer_profile_id") REFERENCES "consumer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_provider_profile_id_fkey" FOREIGN KEY ("provider_profile_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant_states" ADD CONSTRAINT "chat_participant_states_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant_states" ADD CONSTRAINT "chat_participant_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participant_states" ADD CONSTRAINT "chat_participant_states_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
