import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';

import { registerPushDevice } from '@/features/chat/api/chat-api';
import { useHomeGreeting } from '@/features/home/hooks/useHomeGreeting';
import { Screen } from '@/shared/ui/Screen';
import { useSessionStore } from '@/shared/stores/useSessionStore';

export function HomeScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const role = useSessionStore((s) => s.role);
  const setRole = useSessionStore((s) => s.setRole);
  const greeting = useHomeGreeting();

  useEffect(() => {
    void (async () => {
      if (!Device.isDevice) return;
      const permission = await Notifications.getPermissionsAsync();
      let granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted) {
        const req = await Notifications.requestPermissionsAsync();
        granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }
      if (!granted) return;
      const tokenRes = await Notifications.getExpoPushTokenAsync();
      const platform = Device.osName === 'iOS' ? 'IOS' : Device.osName === 'Android' ? 'ANDROID' : 'WEB';
      await registerPushDevice(() => getToken(), platform, tokenRes.data);
    })().catch(() => {
      // Silent fallback; push registration should not block app usage.
    });
  }, [getToken]);

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>{greeting}</Text>
        <Text style={styles.subtitle}>
          Explora educadores, gestiona tu perfil y mantente al día con Trofo
          School desde el móvil.
        </Text>
      </View>

      <Text style={styles.label}>Tipo de cuenta</Text>
      <View style={styles.row}>
        <RoleChip
          label="Familia"
          active={role === 'consumer'}
          onPress={() => setRole('consumer')}
        />
        <RoleChip
          label="Educador"
          active={role === 'provider'}
          onPress={() => setRole('provider')}
        />
      </View>
      <Pressable
        onPress={() => router.push('/chat')}
        style={styles.chatBtn}
        accessibilityRole="button"
      >
        <Text style={styles.chatBtnText}>Abrir chat</Text>
      </Pressable>
    </Screen>
  );
}

function RoleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 28, marginTop: 8 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#57534e' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: 12 },
  chip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  chipActive: {
    borderColor: '#065f46',
    backgroundColor: '#ecfdf5',
  },
  chipText: { textAlign: 'center', fontSize: 16, color: '#44403c' },
  chipTextActive: { color: '#065f46', fontWeight: '600' },
  chatBtn: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: '#065f46',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  chatBtnText: { color: '#fff', fontWeight: '700' },
});
