import { io, type Socket } from 'socket.io-client';

function apiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  return base.replace(/\/$/, '');
}

let socketSingleton: Socket | null = null;

export async function getChatSocket(getToken: () => Promise<string | null>) {
  if (socketSingleton) return socketSingleton;
  const token = await getToken();
  if (!token) {
    throw new Error('No session token');
  }
  socketSingleton = io(`${apiBaseUrl()}/chat`, {
    transports: ['websocket'],
    auth: {
      token: `Bearer ${token}`,
    },
  });
  return socketSingleton;
}
