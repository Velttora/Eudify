'use client';

import { useCallback, useId, useRef, useState } from 'react';

import { imageFileToStoredDataUrl } from '@/shared/lib/profile-image';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/field';

const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png'];
const FILE_GUIDANCE = 'Máx. 2MB. Formatos permitidos: JPG o PNG.';

export type ProfilePhotoInputProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Texto del campo de enlace manual (https…). */
  urlLabel?: string;
  urlHint?: string;
};

/**
 * Foto de perfil: subir archivo desde el dispositivo, tomar foto con la cámara, o pegar URL.
 * Los vídeos en “Elegir archivo” aún no se persisten; se muestra un aviso (solo imágenes).
 */
export function ProfilePhotoInput({
  value,
  onChange,
  disabled = false,
  urlLabel = 'O pega un enlace público (opcional)',
  urlHint = 'Si la imagen ya está en internet (Drive, Dropbox con enlace directo, etc.).',
}: ProfilePhotoInputProps) {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isHttpUrl = value.trim().startsWith('http');
  const isDataImage = value.startsWith('data:image/');
  const urlInputValue = isHttpUrl ? value : '';

  const handleFile = useCallback(
    async (file: File | null) => {
      setError(null);
      setSuccess(null);
      if (!file) return;
      if (!ACCEPTED_PROFILE_PHOTO_TYPES.includes(file.type)) {
        setError(
          'El archivo debe ser JPG o PNG. Si tienes otro formato, conviértelo o usa un enlace público.',
        );
        return;
      }
      if (file.size > MAX_PROFILE_PHOTO_BYTES) {
        setError(
          'La imagen pesa más de 2MB. Elige una foto más liviana o recórtala antes de subirla.',
        );
        return;
      }
      setBusy(true);
      try {
        const dataUrl = await imageFileToStoredDataUrl(file);
        onChange(dataUrl);
        setSuccess('Foto lista. Recuerda guardar el formulario para conservar el cambio.');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo procesar la imagen.';
        setError(
          message.includes('demasiado grande')
            ? 'La imagen quedó demasiado grande después de comprimirla. Usa JPG/PNG de máximo 2MB o pega un enlace público.'
            : message,
        );
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const onPickFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      e.target.value = '';
      void handleFile(f);
    },
    [handleFile],
  );

  return (
    <div className="grid w-full gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
      {(isDataImage || isHttpUrl) && value.trim() ? (
        <div className="flex flex-wrap items-start gap-3 lg:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Vista previa de la foto de perfil"
            className="h-24 w-24 shrink-0 rounded-xl border border-border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            disabled={disabled || busy}
            onClick={() => {
              setError(null);
              setSuccess(null);
              onChange('');
            }}
          >
            Quitar foto
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Procesando…
            </span>
          ) : (
            'Elegir archivo'
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy}
          onClick={() => cameraInputRef.current?.click()}
        >
          {busy ? 'Procesando…' : 'Tomar foto'}
        </Button>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground lg:col-span-2">
        {FILE_GUIDANCE} “Elegir archivo” abre galería o carpetas. “Tomar foto” usa la cámara
        cuando el dispositivo lo permite.
      </p>
      {busy ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground lg:col-span-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Comprimiendo imagen para guardarla de forma segura…
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png"
        aria-hidden
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={onPickFiles}
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        capture="environment"
        aria-hidden
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={onPickFiles}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900 lg:col-span-2">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 lg:col-span-2">
          {success}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col gap-1.5 lg:col-span-2">
        <span className="text-sm font-semibold text-foreground">{urlLabel}</span>
        {urlHint ? (
          <span className="text-xs leading-relaxed text-muted-foreground">{urlHint}</span>
        ) : null}
        <Input
          id={`${id}-url`}
          value={urlInputValue}
          disabled={disabled || busy}
          onChange={(e) => {
            setError(null);
            setSuccess(e.target.value.trim() ? 'Enlace agregado. Guarda el formulario para conservarlo.' : null);
            onChange(e.target.value);
          }}
          placeholder="https://…"
        />
      </div>
    </div>
  );
}
