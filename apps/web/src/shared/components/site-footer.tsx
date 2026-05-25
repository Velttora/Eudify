const VELTTORA_URL = 'https://velttora.com';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card/80 py-5">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6">
        <p>
          © {year} Edify. Todos los derechos reservados. Desarrollada por{' '}
          <a
            href={VELTTORA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:text-primary-hover hover:decoration-primary"
          >
            Velttora LLC
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
