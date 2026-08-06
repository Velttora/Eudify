'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

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
  siteHeaderPageLabelClass,
  siteHeaderUserWrapClass,
} from '@/shared/components/site-header-theme';
import { useHeaderMobileMenu } from '@/shared/components/use-header-mobile-menu';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

export type AppHeaderLink = {
  href: string;
  label: string;
  /** Misma jerarquía visual que «Mi panel» en el menú público. */
  emphasized?: boolean;
  /** Usa history.replace para navegación intra-página, como tabs por query param. */
  replace?: boolean;
};

export function AppHeader({
  pageLabel,
  links,
  logoHref = '/',
}: {
  pageLabel?: string;
  links: AppHeaderLink[];
  /** Inicio de la app (p. ej. catálogo o panel), no la landing de marketing. */
  logoHref?: string;
}) {
  const { headerRef, open, toggle, close, headerHeight, menuId } =
    useHeaderMobileMenu();

  return (
    <header ref={headerRef} className={`${siteHeaderBarClass} relative`}>
      <div className={siteHeaderInnerClass}>
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <div className="min-w-0 shrink">
            <SiteLogo href={logoHref} />
          </div>
          {pageLabel ? (
            <span className={siteHeaderPageLabelClass}>{pageLabel}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <nav className="hidden flex-wrap items-center justify-end gap-1.5 sm:flex sm:gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                replace={l.replace}
                className={
                  l.emphasized
                    ? siteHeaderNavLinkEmphasisClass
                    : siteHeaderNavLinkClass
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className={siteHeaderUserWrapClass}>
            <NotificationBell />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9',
                },
              }}
            />
          </div>
          {links.length > 0 ? (
            <SiteHeaderHamburgerButton
              open={open}
              menuId={menuId}
              onClick={toggle}
            />
          ) : null}
        </div>
      </div>
      {links.length > 0 ? (
        <SiteHeaderMobilePanel
          open={open}
          menuId={menuId}
          headerHeight={headerHeight}
          onClose={close}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              replace={l.replace}
              onClick={close}
              className={
                l.emphasized
                  ? siteHeaderMobileLinkEmphasisClass
                  : siteHeaderMobileLinkClass
              }
            >
              {l.label}
            </Link>
          ))}
        </SiteHeaderMobilePanel>
      ) : null}
    </header>
  );
}
