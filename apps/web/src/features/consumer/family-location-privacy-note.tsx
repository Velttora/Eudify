/** Aviso único sobre privacidad de ubicación. */
export function FamilyLocationPrivacyNote() {
  return (
    <aside
      className="rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed"
      role="note"
    >
      <p className="font-semibold text-foreground">Ubicación y privacidad</p>

      <ul className="mt-1.5 list-disc pl-4 marker:text-muted-foreground">
        <li>
          Tu dirección solo será visible para el educador/cuidador que tenga una sesión
          activa o aceptada contigo.
        </li>
      </ul>
    </aside>
  );
}