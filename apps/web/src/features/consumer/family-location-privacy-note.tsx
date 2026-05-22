import { FormSideNote } from '@/shared/components/friendly-form-shell';

/** Aviso único sobre privacidad de ubicación (columna lateral estándar). */
export function FamilyLocationPrivacyNote() {
  return (
    <FormSideNote title="Ubicación y privacidad">
      <p>
        Tu dirección solo la verá el educador o cuidador con una sesión activa o
        aceptada contigo.
      </p>
    </FormSideNote>
  );
}