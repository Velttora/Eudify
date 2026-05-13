const MAX_DATA_URL_CHARS = 450_000;

/**
 * Reduce una imagen del dispositivo a JPEG en base64 (data URL) para guardarla en `photoUrl`.
 * Si no se puede redimensionar, intenta el archivo tal cual (p. ej. algunos HEIC).
 */
export async function imageFileToStoredDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.');
  }

  let dataUrl: string;
  try {
    dataUrl = await resizeToJpegDataUrl(file, 1024, 0.82);
  } catch {
    dataUrl = await readFileAsDataUrl(file);
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    dataUrl = await resizeToJpegDataUrl(file, 640, 0.72);
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    dataUrl = await resizeToJpegDataUrl(file, 480, 0.65);
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(
      'La imagen sigue siendo demasiado grande. Usa JPG o PNG de máximo 2MB, prueba con otra foto o pega un enlace público.',
    );
  }
  return dataUrl;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === 'string') resolve(r.result);
      else reject(new Error('No se pudo leer la imagen.'));
    };
    r.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    r.readAsDataURL(file);
  });
}

async function resizeToJpegDataUrl(
  file: File,
  maxSide: number,
  quality: number,
): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas no disponible');
  }
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = canvas.toDataURL('image/jpeg', quality);
  if (!out.startsWith('data:image/jpeg')) {
    throw new Error('No se pudo comprimir la imagen.');
  }
  return out;
}
