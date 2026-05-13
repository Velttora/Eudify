import type { BootstrapPayload } from '@/shared/types/bootstrap';

/** Hub interno según rol (p. ej. validar si el usuario debe estar en un dashboard). */
export function pathAfterBootstrap(b: BootstrapPayload): string {
  if (b.needsRoleSelection) {
    return '/role';
  }
  const role = b.user?.role ?? null;
  if (!b.needsOnboarding) {
    return role === 'CONSUMER'
      ? '/dashboard/consumer'
      : '/dashboard/provider';
  }
  return role === 'CONSUMER'
    ? '/onboarding/consumer'
    : '/onboarding/provider';
}

/**
 * Primera pantalla tras login o al terminar el onboarding.
 * Familias van al catálogo; educadores al panel (no deben usar /explorar).
 */
export function landingPathAfterBootstrap(b: BootstrapPayload): string {
  if (b.needsRoleSelection) {
    return '/role';
  }
  const role = b.user?.role ?? null;
  if (!b.needsOnboarding) {
    return role === 'PROVIDER' ? '/dashboard/provider' : '/explorar';
  }
  return role === 'CONSUMER'
    ? '/onboarding/consumer'
    : '/onboarding/provider';
}
