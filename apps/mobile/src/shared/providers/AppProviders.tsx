import { ClerkLoaded, ClerkLoading, ClerkProvider } from '@clerk/clerk-expo';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tokenCache } from '@/shared/auth/token-cache';
import { createQueryClient } from '@/shared/lib/query-client';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createQueryClient());
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoading>
          <CenteredText text="Inicializando sesión…" />
        </ClerkLoading>
        <ClerkLoaded>
          {!publishableKey ? (
            <CenteredText text="Configura EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY para usar chat." />
          ) : (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          )}
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ textAlign: 'center', color: '#57534e' }}>{text}</Text>
    </View>
  );
}
