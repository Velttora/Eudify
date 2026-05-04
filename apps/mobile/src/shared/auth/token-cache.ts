import * as SecureStore from 'expo-secure-store';

type TokenCache = {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, value: string) => Promise<void>;
};

const KEY_PREFIX = 'clerk_token_';

export const tokenCache: TokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(`${KEY_PREFIX}${key}`);
    } catch {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(`${KEY_PREFIX}${key}`, value);
    } catch {
      // Ignore cache persistence failures; Clerk can still re-fetch.
    }
  },
};
