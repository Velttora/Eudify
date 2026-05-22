import Link from 'next/link';
import type { ReactNode } from 'react';

import { SiteLogo } from '@/shared/components/site-logo';

/** Grilla de campos: usa ancho horizontal antes que scroll vertical. */
export const formFieldsGridClass =
  'grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/** Ocupa todo el ancho de la grilla estándar. */
export const formFieldsGridSpanFull = 'sm:col-span-2 lg:col-span-3 xl:col-span-4';

/** Una fila de campos (p. ej. un menor en onboarding). */
export const formFieldsRowClass =
  'grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 xl:items-end';

/** Columna lateral + formulario principal. */
export const formWithSideNotesLayoutClass =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-6 xl:gap-8';

/** Nota contextual en columna lateral (estándar de formularios Edify). */
export function FormSideNote({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 text-sm leading-snug text-muted-foreground"
      role="note"
    >
      {title ? <p className="font-semibold text-foreground">{title}</p> : null}
      <div className={title ? 'mt-2' : undefined}>{children}</div>
    </div>
  );
}

function FormSideNotesColumn({ children }: { children: ReactNode }) {
  return (
    <aside
      className="sticky top-24 hidden h-fit space-y-3 lg:block"
      role="complementary"
      aria-label="Información del formulario"
    >
      {children}
    </aside>
  );
}

export function StepIndicator({
  steps,
  current,
}: {
  steps: { label: string }[];
  current: number;
}) {
  return (
    <nav
      aria-label="Pasos del formulario"
      className="mb-4 rounded-xl border border-border bg-card px-3 py-3 shadow-sm"
    >
      <ol className="flex items-start justify-between gap-1 sm:gap-3">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li
              key={s.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${
                  done
                    ? 'bg-primary text-white'
                    : active
                      ? 'bg-accent-soft text-primary ring-2 ring-accent ring-offset-1'
                      : 'bg-muted text-muted-foreground'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {done ? '✓' : n}
              </span>
              <span
                className={`line-clamp-2 text-[11px] font-semibold leading-tight sm:text-xs ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function FriendlyFormShell({
  title,
  subtitle,
  topBar = true,
  steps,
  currentStep,
  children,
  footer,
  sideNotes,
  maxWidthClass = 'max-w-2xl',
}: {
  title: string;
  subtitle: ReactNode;
  topBar?: boolean;
  steps?: { label: string }[];
  currentStep?: number;
  children: ReactNode;
  /** Barra fija en móvil: el botón principal siempre a la vista (menos scroll). */
  footer?: ReactNode;
  /** Ayuda contextual: lateral en desktop; arriba del formulario en móvil (mismo contenido). */
  sideNotes?: ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <div className="min-h-screen bg-linear-to-b from-accent-soft/15 via-background to-muted/40">
      {topBar ? (
        <div className="border-b border-border bg-card/90 backdrop-blur-sm">
          <div
            className={`mx-auto flex ${maxWidthClass} items-center justify-between px-4 py-2.5 sm:px-6`}
          >
            <SiteLogo href="/" />
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Inicio
            </Link>
          </div>
        </div>
      ) : null}
      <main
        className={`mx-auto ${maxWidthClass} px-4 py-5 sm:px-6 sm:py-8 ${footer ? 'pb-28 sm:pb-8' : ''}`}
      >
        {steps && currentStep != null ? (
          <StepIndicator steps={steps} current={currentStep} />
        ) : null}
        <div className={sideNotes ? formWithSideNotesLayoutClass : ''}>
          <div className="min-w-0">
            <header className="mb-4 text-center sm:mb-5 sm:text-left">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              <div className="mt-2 text-sm leading-snug text-muted-foreground sm:text-base">
                {subtitle}
              </div>
            </header>
            {sideNotes ? (
              <div className="mb-4 space-y-3 lg:hidden">{sideNotes}</div>
            ) : null}
            <div className="space-y-3 sm:space-y-4">{children}</div>
            {footer ? (
              <div className="mt-5 hidden sm:block">{footer}</div>
            ) : null}
          </div>
          {sideNotes ? <FormSideNotesColumn>{sideNotes}</FormSideNotesColumn> : null}
        </div>
      </main>
      {footer ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 p-3 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur-md sm:hidden">
          <div className={`mx-auto ${maxWidthClass} px-4`}>{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Pantalla de acceso (Clerk): columna amable + formulario claro en móvil y escritorio. */
export function AuthGateShell({
  title,
  subtitle,
  bullets,
  children,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-accent-soft/20 via-card to-background">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <aside className="relative hidden flex-col justify-center gap-6 border-border/80 px-10 py-12 lg:flex lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-accent-soft/60 via-transparent to-transparent" />
          <div className="relative">
            <SiteLogo href="/" />
            <h1 className="mt-10 text-3xl font-bold leading-tight tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
            <ul className="mt-8 space-y-4 text-base text-foreground/90">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="leading-snug">{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="mt-10 inline-flex text-sm font-semibold text-primary hover:text-primary-hover"
            >
              ← Volver a la página principal
            </Link>
          </div>
        </aside>
        <div className="flex flex-col items-center justify-start px-4 py-8 sm:justify-center sm:py-10">
          <div className="mb-6 w-full max-w-md lg:hidden">
            <SiteLogo href="/" />
          </div>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/10">
            {children}
          </div>
          <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground lg:hidden">
            {subtitle}
          </p>
          <Link
            href="/"
            className="mt-4 text-sm font-medium text-primary lg:hidden"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
