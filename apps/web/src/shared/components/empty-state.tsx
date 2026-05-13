'use client';

import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export function EmptyState({
  icon = '○',
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const action = actionLabel ? (
    actionHref ? (
      <Link
        href={actionHref}
        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"
      >
        {actionLabel}
      </Link>
    ) : onAction ? (
      <Button type="button" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null
  ) : null;

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-5 py-8 text-center">
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card text-xl shadow-sm"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
