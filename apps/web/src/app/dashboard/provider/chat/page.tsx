import Link from 'next/link';

import { ChatInboxScreen } from '@/features/chat/components/chat-inbox-screen';

export default function ProviderChatPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <Link href="/dashboard/provider" className="text-sm font-semibold text-primary underline">
        ← Volver al panel docente
      </Link>
      <h1 className="text-2xl font-bold text-primary">Chat con familias</h1>
      <ChatInboxScreen />
    </main>
  );
}
