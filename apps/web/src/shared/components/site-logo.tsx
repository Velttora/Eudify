import Link from 'next/link';

type SiteLogoProps = {
  href?: string;
  className?: string;
};

export function SiteLogo({ href = '/', className = '' }: SiteLogoProps) {
  const mark = (
    <span
      className={`inline-flex items-baseline gap-0.5 text-xl font-bold tracking-tight ${className}`}
    >
      <span className="text-primary">Eudify</span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        {mark}
      </Link>
    );
  }

  return mark;
}
