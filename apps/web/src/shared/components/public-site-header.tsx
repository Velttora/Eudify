'use client';

import { UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';

import { useBootstrapQuery } from '@/features/bootstrap/hooks/use-bootstrap';
import { consumerHubHref } from '@/features/consumer/lib/consumer-hub';
import { SiteHeaderHamburgerButton } from '@/shared/components/site-header-hamburger-button';
import { SiteHeaderMobilePanel } from '@/shared/components/site-header-mobile-panel';
import { SiteLogo } from '@/shared/components/site-logo';
import {
  siteHeaderBarClass,
  siteHeaderInnerClass,
  siteHeaderMobileLinkClass,
  siteHeaderMobileLinkEmphasisClass,
  siteHeaderNavLinkClass,
  siteHeaderNavLinkEmphasisClass,
  siteHeaderUserWrapClass,
} from '@/shared/components/site-header-theme';
import { useHeaderMobileMenu } from '@/shared/components/use-header-mobile-menu';
import { buttonStyles } from '@/shared/components/ui/button';

export function PublicSiteHeader() {
  const { isSignedIn, isLoaded } = useAuth();
  const bootstrapQuery = useBootstrapQuery({
    enabled: Boolean(isLoaded && isSignedIn),
  });

  const boot = bootstrapQuery.data;
  const navLoading = isSignedIn && (bootstrapQuery.isFetching || bootstrapQuery.isPending);

  const { headerRef, open, toggle, close, headerHeight, menuId } =
    useHeaderMobileMenu();

  const logoHref =
    isLoaded &&
    isSignedIn &&
    boot &&
    !navLoading &&
    !bootstrapQuery.isError
      ? boot.needsRoleSelection
        ? '/role'
        : boot.needsOnboarding && boot.user.role
          ? boot.user.role === 'CONSUMER'
            ? '/onboarding/consumer'
            : '/onboarding/provider'
          : boot.user.role === 'CONSUMER'
            ? '/explorar'
            : boot.user.role === 'PROVIDER'
              ? '/dashboard/provider'
              : '/'
      : '/';

  const primaryMobile = `${buttonStyles('primary', 'mx-4 my-2 block px-4 py-3 text-center text-base')}`;

  return (
    <header ref={headerRef} className={`${siteHeaderBarClass} relative`}>
      <div className={siteHeaderInnerClass}>
        <div className="min-w-0 shrink">
          <SiteLogo href={logoHref} />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <nav className="hidden flex-wrap items-center justify-end gap-1.5 sm:flex sm:gap-2">
            {!isLoaded ? (
              <span className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
            ) : !isSignedIn ? (
              <>
                <Link
                  href="/sign-in"
                  className={`${siteHeaderNavLinkClass} sm:px-4`}
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/sign-up"
                  className={buttonStyles('primary', 'px-3 py-2 sm:px-4')}
                >
                  Crear cuenta
                </Link>
              </>
            ) : (
              <>
                {navLoading ? (
                  <span className="px-2 py-2 text-xs text-muted-foreground">
                    Cargando menú…
                  </span>
                ) : bootstrapQuery.isError ? (
                  <Link
                    href="/mi-espacio"
                    className={buttonStyles('primary', 'px-3 py-2 text-sm')}
                  >
                    Activar mi cuenta
                  </Link>
                ) : boot?.needsRoleSelection ? (
                  <Link
                    href="/role"
                    className={buttonStyles('primary', 'px-3 py-2 text-sm')}
                  >
                    Elegir perfil
                  </Link>
                ) : boot?.needsOnboarding && boot.user.role ? (
                  <Link
                    href={
                      boot.user.role === 'CONSUMER'
                        ? '/onboarding/consumer'
                        : '/onboarding/provider'
                    }
                    className={buttonStyles('primary', 'px-3 py-2 text-sm')}
                  >
                    Completar registro
                  </Link>
                ) : boot?.user.role === 'CONSUMER' ? (
                  <>
                    <Link href="/explorar" className={siteHeaderNavLinkClass}>
                      Educadores
                    </Link>
                    <Link
                      href={consumerHubHref('resumen')}
                      className={siteHeaderNavLinkEmphasisClass}
                    >
                      Mi espacio
                    </Link>
                    <Link
                      href={consumerHubHref('familia')}
                      className={siteHeaderNavLinkClass}
                    >
                      Familia y datos
                    </Link>
                  </>
                ) : boot?.user.role === 'PROVIDER' ? (
                  <>
                    <Link
                      href="/dashboard/provider"
                      className={siteHeaderNavLinkEmphasisClass}
                    >
                      Mi panel
                    </Link>
                    <Link
                      href="/profile/provider"
                      className={siteHeaderNavLinkClass}
                    >
                      Mi perfil
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/mi-espacio"
                    className={buttonStyles('primary', 'px-3 py-2 text-sm')}
                  >
                    Ir a mi espacio
                  </Link>
                )}

                <div className={siteHeaderUserWrapClass}>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'h-9 w-9',
                      },
                    }}
                  />
                </div>
              </>
            )}
          </nav>

          {isLoaded && isSignedIn ? (
            <div className={`${siteHeaderUserWrapClass} sm:hidden`}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'h-9 w-9',
                  },
                }}
              />
            </div>
          ) : null}

          {isLoaded ? (
            <SiteHeaderHamburgerButton
              open={open}
              menuId={menuId}
              onClick={toggle}
            />
          ) : (
            <span className="h-11 w-11 shrink-0 sm:hidden" aria-hidden />
          )}
        </div>
      </div>

      <SiteHeaderMobilePanel
        open={open}
        menuId={menuId}
        headerHeight={headerHeight}
        onClose={close}
      >
        {!isSignedIn ? (
          <>
            <Link
              href="/sign-in"
              onClick={close}
              className={siteHeaderMobileLinkClass}
            >
              Iniciar sesión
            </Link>
            <Link href="/sign-up" onClick={close} className={primaryMobile}>
              Crear cuenta
            </Link>
          </>
        ) : navLoading ? (
          <span className="block px-4 py-3 text-sm text-muted-foreground">
            Cargando menú…
          </span>
        ) : bootstrapQuery.isError ? (
          <Link href="/mi-espacio" onClick={close} className={primaryMobile}>
            Activar mi cuenta
          </Link>
        ) : boot?.needsRoleSelection ? (
          <Link href="/role" onClick={close} className={primaryMobile}>
            Elegir perfil
          </Link>
        ) : boot?.needsOnboarding && boot.user.role ? (
          <Link
            href={
              boot.user.role === 'CONSUMER'
                ? '/onboarding/consumer'
                : '/onboarding/provider'
            }
            onClick={close}
            className={primaryMobile}
          >
            Completar registro
          </Link>
        ) : boot?.user.role === 'CONSUMER' ? (
          <>
            <Link
              href="/explorar"
              onClick={close}
              className={siteHeaderMobileLinkClass}
            >
              Educadores
            </Link>
            <Link
              href={consumerHubHref('resumen')}
              onClick={close}
              className={siteHeaderMobileLinkEmphasisClass}
            >
              Mi espacio
            </Link>
            <Link
              href={consumerHubHref('familia')}
              onClick={close}
              className={siteHeaderMobileLinkClass}
            >
              Familia y datos
            </Link>
          </>
        ) : boot?.user.role === 'PROVIDER' ? (
          <>
            <Link
              href="/dashboard/provider"
              onClick={close}
              className={siteHeaderMobileLinkEmphasisClass}
            >
              Mi panel
            </Link>
            <Link
              href="/profile/provider"
              onClick={close}
              className={siteHeaderMobileLinkClass}
            >
              Mi perfil
            </Link>
          </>
        ) : (
          <Link href="/mi-espacio" onClick={close} className={primaryMobile}>
            Ir a mi espacio
          </Link>
        )}
      </SiteHeaderMobilePanel>
    </header>
  );
}
