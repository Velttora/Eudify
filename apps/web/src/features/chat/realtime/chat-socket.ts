import { io, type Socket } from 'socket.io-client';

let singleton: Socket | null = null;

function apiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is not set');
  }
  return base.replace(/\/$/, '');
}

export async function getChatSocket(getToken: () => Promise<string | null>) {
  if (singleton) return singleton;
  const token = await getToken();
  if (!token) {
    throw new Error('No session token');
  }
  singleton = io(`${apiBaseUrl()}/chat`, {
    transports: ['websocket'],
    auth: {
      token: `Bearer ${token}`,
    },
  });
  return singleton;
}

export function disconnectChatSocket() {
  singleton?.disconnect();
  singleton = null;
}
