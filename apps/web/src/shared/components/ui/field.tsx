import type {
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Field({
  label,
  hint,
  error,
  children,
}: PropsWithChildren<{ label: string; hint?: ReactNode; error?: ReactNode }>) {
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {hint ? (
        <span className="-mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="-mt-1 text-sm font-medium text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full min-w-0 min-h-11 rounded-xl border border-border bg-card px-4 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25"
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full min-w-0 min-h-16 rounded-xl border border-border bg-card px-4 py-2.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25"
      {...props}
    />
  );
}

export function Select(
  props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode },
) {
  return (
    <select
      className="w-full min-w-0 min-h-11 rounded-xl border border-border bg-card px-4 py-2.5 text-base text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
      {...props}
    />
  );
}
